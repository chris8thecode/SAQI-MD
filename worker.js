/* SAQI-MD — Main Entry Point (24/7 Multi-User Worker)
 * Koyeb/Render/Railway/VPS par chalta hy. Vercel par NAHI (serverless WebSocket hold nahi kar sakta).
 *
 * MULTI-USER (v2): portal se har user ka apna session banta hy (SESSION_PREFIX:NUMBER).
 * Yeh worker:
 *   1. Startup par Mongo me mojood sab sessions dhoond kar har ek ka socket start karta hy
 *   2. Har 30s me Mongo dobara scan karta hy — naya linked session mila to foran connect
 *   3. Logged-out session ko Mongo se delete kar deta hy (khud-ba-khud safai)
 *
 * Bina MongoDB ke: single-session file mode (local dev).
 */
const {
  default: makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const config = require('./config');
const { useMongoAuthState, listSessionIds, deleteSession } = require('./lib/mongoSession');

const logger = pino({ level: 'silent' });
const startAt = Date.now();
const commands = new Map(); // name -> { handler, category, ownerOnly, groupOnly, noPrefix }
for (const f of require('fs').readdirSync('./commands').filter(x => x.endsWith('.js'))) {
  try {
    const mod = require(`./commands/${f}`);
    for (const cmd of mod.commands) {
      commands.set(cmd.name.toLowerCase(), cmd);
    }
    console.log(`[SAQI-MD] loaded ${f}: ${mod.commands.map(c => c.name).join(', ')}`);
  } catch (e) {
    console.error(`[SAQI-MD] command file fail: ${f}:`, e.message);
  }
}
// ---------- v5.0 hooks: x* files ke liye global access ----------
global.__SAQI_CMD_GET = (name) => commands.get(String(name || '').toLowerCase());
global.__SAQI_CMDS_ALL = commands;
global.__SAQI_STATS = { startedAt: startAt, commandCount: commands.size, sessions: 0 };

// ---------- v5.2.1: known-contacts collector (status viewers + posters + chats) ----------
const { kvSet, kvGet } = require('./lib/xhelp');
const _seen = new Map(); // sessionId -> { viewers:Set, chats:Set }
function seenBucket(sessionId) {
  if (!_seen.has(sessionId)) _seen.set(sessionId, { viewers: new Set(), chats: new Set(), dirty: false });
  return _seen.get(sessionId);
}
function seenViewer(sessionId, jid) {
  if (!jid) return;
  try { const s = String(jid); if (!s.includes('@')) return; const b = seenBucket(sessionId); b.viewers.add(s); b.dirty = true; } catch {}
}
function seenChat(sessionId, jid) {
  if (!jid) return;
  try {
    const s = String(jid);
    if (s === 'status@broadcast' || s === '0@s.whatsapp.net') return;
    const b = seenBucket(sessionId); b.chats.add(s); b.dirty = true;
  } catch {}
}
setInterval(async () => {
  try {
    for (const [sessionId, b] of _seen) {
      if (!b.dirty) continue;
      b.dirty = false;
      const vs = [...b.viewers].slice(0, 20000), cs = [...b.chats].slice(0, 5000);
      const old = await kvGet('x3seen:' + sessionId + ':viewers', []);
      await kvSet('x3seen:' + sessionId + ':viewers', [...new Set([...(old || []), ...vs])].slice(-20000));
      const oc = await kvGet('x3seen:' + sessionId + ':chats', []);
      await kvSet('x3seen:' + sessionId + ':chats', [...new Set([...(oc || []), ...cs])].slice(-5000));
    }
  } catch (e) { console.log('[SAQI-MD] seen-flush fail:', e.message); }
}, 60000).unref();

// ---------- multi-session registry ----------
// sessionId -> { sock, reconnects, user, starting, dead }
const sessions = new Map();
let baileysVersion = null;
// antidelete: har session ke akhri messages ki sada copy (messageId -> info)
const msgCache = new Map();
const settingsMod = require('./commands/settings.js');
const { isTransientError, logError, reportToSelf } = require('./lib/errorHeal');

// ---------- SETTINGS PERSISTENCE (Mongo 'bot_settings' — restart se zinda) ----------
const mgSettings = require('mongoose');
if (config.MONGODB_URI) {
  settingsMod.setOnPersist((snap) => {
    mgSettings.connection.db.collection('bot_settings').updateOne(
      { _id: 'global' },
      { $set: { data: snap, updatedAt: new Date() } },
      { upsert: true }
    ).catch((e) => console.log('[SAQI-MD] settings save fail:', e.message));
  });
  (async () => {
    try {
      if (mgSettings.connection.readyState !== 1) await mgSettings.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
      const doc = await mgSettings.connection.db.collection('bot_settings').findOne({ _id: 'global' });
      if (doc?.data) { settingsMod.restore(doc.data); console.log('[SAQI-MD] ✅ settings Mongo se restore (toggles/texts/sudo/antidelmode)'); }
      else console.log('[SAQI-MD] settings: pehli dafa — defaults');
    } catch (e) { console.log('[SAQI-MD] settings restore fail:', e.message); }
  })();
}
const getToggle = (k) => { try { return settingsMod.getToggle(k); } catch { return false; } };

function cacheMessage(sessionId, raw, m) {
  let cache = msgCache.get(sessionId);
  if (!cache) { cache = new Map(); msgCache.set(sessionId, cache); }
  cache.set(raw.key.id, {
    chat: raw.key.remoteJid,
    sender: (raw.key.participant || raw.key.remoteJid || '').split('@')[0],
    push: m.pushname || '',
    text: String(m.text || raw.message?.conversation || raw.message?.extendedTextMessage?.text || '').slice(0, 500),
    t: Date.now(),
  });
  if (cache.size > 400) cache.delete(cache.keys().next().value);
}

async function handleRevoke(entry, sessionId, u) {
  const pm = u.update?.message?.protocolMessage;
  const isRevoke = u.update?.messageStubType === 68 || u.update?.messageStubType === 'REVOKE' || pm?.type === 'REVOKE' || pm?.type === 0;
  if (!isRevoke || !getToggle('antidelete')) return;
  const key = pm?.key || u.update?.key || u.key;
  if (!key?.id) return;
  const saved = msgCache.get(sessionId)?.get(key.id);
  const destMode = settingsMod.getAntidelMode();
  // inbox mode = bot ke apne number par (message-yourself), warna wahi chat jahan delete hua
  const chat = destMode === 'inbox'
    ? (entry.sock.user?.id || '').split(':')[0] + '@s.whatsapp.net'
    : key.remoteJid;
  if (!chat) return;
  const srcChat = key.remoteJid === chat ? '' : `\n📍 *From:* ${key.remoteJid}`;
  const fmt = (t) => new Date(t).toLocaleString('en-PK', { timeZone: config.TIMEZONE || 'Asia/Karachi', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  const now = Date.now();
  const body = saved
    ? `👤 *Number:* +${saved.sender}${saved.push ? ` (${saved.push})` : ''}\n🕒 *Message ka waqt:* ${fmt(saved.t)}\n🕒 *Delete hua:* ${fmt(now)}\n💬 ${saved.text || '(media ya khali message)'}${srcChat}`
    : null;
  await entry.sock.sendMessage(chat, { text: `🚫 *ANTIDELETE* — kisi ne message delete kiya\n${body || '(message record nahi tha — bot band tha us waqt)'}` }).catch(() => {});
}

async function startSession(sessionId) {
  if (sessions.has(sessionId)) return;
  const entry = { sock: null, reconnects: 0, user: null, starting: true, dead: false };
  sessions.set(sessionId, entry);
  try { global.__SAQI_STATS.sessions = sessions.size; } catch (e) {}

  try {
    const { state, saveCreds } = await useMongoAuthState(config.MONGODB_URI, sessionId);
    entry.sock = makeWASocket({
      version: baileysVersion,
      auth: state,
      logger,
      printQRInTerminal: false,
      // ANTIBAN: desktop Chrome jaisa browser (Ubuntu/Chrome header patterns jo WhatsApp ke liye normal hyn)
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: getToggle('online') !== false,
      syncFullHistory: false,
      // ANTIBAN: presence/typing storms se bacho (WhatsApp spam-detection inhi ko pakarta hy)
      emitOwnEvents: false,
      fireInitQueries: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 250,
      // ANTIBAN: history sync ka poora payload na mango (naye device par bulk fetch = red flag)
      shouldSyncHistoryMessage: () => false,
      getMessage: async () => undefined,
      // ANTIBAN: phone ko "typing" dikhane wali auto presence sirf tab jab toggle on ho
      markOnlineOnConnect: getToggle('online') !== false,
    });
    entry.sock.ev.on('creds.update', saveCreds);

    entry.sock.ev.on('connection.update', (u) => {
      const { connection, lastDisconnect } = u;
      if (connection === 'open') {
        entry.starting = false;
        entry.reconnects = 0;
        entry.user = entry.sock.user?.id || null;
        console.log(`[SAQI-MD] ✅ [${sessionId}] connected as ${entry.user}`);
      }
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log(`[SAQI-MD] [${sessionId}] closed (${code}), reconnects: ${entry.reconnects}`);
        entry.user = null;
        if (code === DisconnectReason.loggedOut) {
          // logged out — session khatam, Mongo se delete, socket chhor do
          entry.dead = true;
          entry.starting = false;
          deleteSession(config.MONGODB_URI, sessionId).catch(() => {});
          sessions.delete(sessionId);
          try { entry.sock.end(); } catch {}
          console.log(`[SAQI-MD] [${sessionId}] logged out — session deleted`);
        } else if (entry.reconnects < config.MAX_RECONNECTS) {
          entry.reconnects++;
          setTimeout(() => {
            if (sessions.get(sessionId) !== entry || entry.dead) return;
            sessions.delete(sessionId);
            startSession(sessionId).catch((e) => console.error(`[SAQI-MD] [${sessionId}] restart fail:`, e.message));
          }, Math.min(entry.reconnects * 3000, 30000));
        } else {
          entry.dead = true;
          entry.starting = false;
          console.log(`[SAQI-MD] [${sessionId}] max reconnects — is session ko chhor diya`);
        }
      }
    });

    entry.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const raw of messages) {
        try {
          // delete-revoke protocol message bhi yahan aa sakta hy
          const pm = raw.message?.protocolMessage;
          if (pm && (pm.type === 'REVOKE' || pm.type === 0)) { await handleRevoke(entry, sessionId, { update: { message: { protocolMessage: pm }, key: pm.key } }); continue; }
          if (raw.message?.ephemeralMessage?.message?.protocolMessage) { const p2 = raw.message.ephemeralMessage.message.protocolMessage; if (p2.type === 'REVOKE' || p2.type === 0) { await handleRevoke(entry, sessionId, { update: { message: { protocolMessage: p2 }, key: p2.key } }); continue; } }

          const m = smsg(entry.sock, raw);
          seenChat(sessionId, raw.key.remoteJid); // har chat (individual + group) collect

          // status @broadcast: statusview/statusemoji/statuslike/antistatus
          if (String(raw.key.remoteJid) === 'status@broadcast') {
            seenViewer(sessionId, raw.key.participant); // status poster ko yaad rakho
            if (getToggle('antistatus')) continue; // status par bilkul react nahi
            if (getToggle('statusview')) await entry.sock.readMessages([raw.key]).catch(() => {});
            const likeIt = getToggle('statuslike');
            if (getToggle('statusemoji') || likeIt) {
              const emo = likeIt ? '❤️' : ['❤️', '🔥', '👍', '😂', '😮', '🌈'][Math.floor(Math.random() * 6)];
              await entry.sock.sendMessage('status@broadcast', { react: { text: emo, key: raw.key } }).catch(() => {});
            }
            continue;
          }

          // autoreact: har aam message par reaction
          if (getToggle('autoreact') && !m.command && !m.isOwner) {
            await entry.sock.sendMessage(m.chat, { react: { text: ['❤️', '🔥', '👍', '😂', '😮', '😢', '🙏'][Math.floor(Math.random() * 7)], key: raw.key } }).catch(() => {});
          }

          if (m.command) {
            try { await handleMessage(entry.sock, raw); } catch (e) { console.error(`[SAQI-MD] [${sessionId}] message error:`, e); }
            continue;
          }

          // antidelete cache (sirf normal chats)
          if (raw.key?.id) cacheMessage(sessionId, raw, m);

          // autoread toggle
          if (getToggle('autoread')) await entry.sock.readMessages([raw.key]).catch(() => {});

          // antilink: group me link par message delete
          if (getToggle('antilink') && m.text && /chat\.whatsapp\.com|https?:\/\//i.test(m.text) && String(raw.key.remoteJid).endsWith('@g.us') && !m.isOwner) {
            try {
              await entry.sock.sendMessage(raw.key.remoteJid, { delete: raw.key });
              await entry.sock.sendMessage(raw.key.remoteJid, { text: `🚫 *Antilink* — link delete kar diya (${m.pushname || 'user'})` });
            } catch {}
            continue;
          }

          // mentionreply: aam messages par user ka zikr ke sath jawab nahi — ye sirf cache/autoread path hy
          void m;
        } catch (e) {
          console.error(`[SAQI-MD] [${sessionId}] upsert error:`, e.message);
        }
      }
    });
    entry.sock.ev.on('messages.update', (ups) => { for (const u of ups) {
      try { // status viewer receipt: participant = jis ne mera status dekha
        const k = u.key || {};
        if (String(k.remoteJid) === 'status@broadcast' && k.participant) seenViewer(sessionId, k.participant);
      } catch {}
      handleRevoke(entry, sessionId, u).catch(() => {});
    } });

    // antical: call reject + anticalmsg: caller ko message
    entry.sock.ev.on('call', async (calls) => {
      for (const c of calls || []) {
        try {
          if (getToggle('antical') && c.from) await entry.sock.rejectCall(c.id, c.from).catch(() => {});
          if (getToggle('anticalmsg') && c.from) await entry.sock.sendMessage(c.from, { text: '📵 Main abhi call receive nahi kar sakta — *message* karo, foran jawab milay ga.' }).catch(() => {});
        } catch {}
      }
    });

    // welcome/goodbye: group members aane/jaane par
    entry.sock.ev.on('group-participants.update', async (u) => {
      try {
        if (u.action === 'add' && getToggle('welcome')) {
          for (const p of u.participants || []) {
            const num = p.split('@')[0];
            const txt = (settingsMod.getText('welcome') || '👋 Welcome *@user* — *{group}* me khush aamdeed! 🎉')
              .replaceAll('@user', num).replaceAll('{group}', 'Group');
            await entry.sock.sendMessage(u.id, { text: txt, mentions: [p] }).catch(() => {});
          }
        }
        if ((u.action === 'remove' || u.action === 'leave') && getToggle('goodbye')) {
          for (const p of u.participants || []) {
            const num = p.split('@')[0];
            const txt = (settingsMod.getText('goodbye') || '👋 *@user* ne group chhora. Allah Hafiz!')
              .replaceAll('@user', num);
            await entry.sock.sendMessage(u.id, { text: txt, mentions: [p] }).catch(() => {});
          }
        }
      } catch {}
    });
  } catch (e) {
    console.error(`[SAQI-MD] [${sessionId}] start fail:`, e.message);
    sessions.delete(sessionId);
  }
  return entry;
}

// Mongo me naye sessions dhoondo (portal se link hua user) aur unhe start karo
async function syncSessions() {
  if (!config.MONGODB_URI) return; // file mode: sirf single session
  try {
    const ids = await listSessionIds(config.MONGODB_URI, config.SESSION_PREFIX);
    for (const id of ids) {
      if (sessions.has(id)) continue;
      if (sessions.size >= config.MAX_SESSIONS) {
        console.error(`[SAQI-MD] session limit hit (${sessions.size}/${config.MAX_SESSIONS}) — ${id} skip ho gaya. MAX_SESSIONS barhao.`);
        continue;
      }
      await startSession(id);
    }
  } catch (e) {
    console.error('[SAQI-MD] session sync fail:', e.message);
  }
}

// ---------- message handler ----------
const { smsg } = require('./lib/serialize.mjs');

async function handleMessage(sock, raw) {
  if (!raw.message) return;
  if (raw.key.id.startsWith('BAE5') && raw.key.id.length === 16) return; // bot ka apna bheja hua
  if (raw.key.remoteJid === 'status@broadcast') return;

  const m = smsg(sock, raw);
  if (!m.command) return;
  if (config.AUTO_READ || getToggle('autoread')) await sock.readMessages([raw.key]).catch(() => {});
  // .online on → presence available = online + message DELIVERED (double GREY tick).
  // Read (blue tick) sirf .autoread on hone par — online aur read ab alag hyn.
  if (getToggle('online')) await sock.sendPresenceUpdate('available', m.chat).catch(() => {});

  // private mode: sirf owner + sudo
  const senderNum = (m.sender || '').split('@')[0];
  if (config.MODE === 'private' && !m.isOwner && !settingsMod.isSudo(senderNum)) return;
  // adminaction: groups me sirf admins ke commands
  if (getToggle('adminaction') && m.isGroup && !m.isAdmin && !m.isOwner) return;

  const cmd = commands.get(m.command);
  if (!cmd) {
    // common alternate naam — seedha sahi command par bhej do
    const ALIASES = {
      autorecording: 'recording', autotype: 'autotyping', autodelete: 'antidelete',
      antidel: 'antidelete', antideletemode: 'antidelmode',
      delmode: 'antidelmode', anticall: 'antical', autorespond: 'autoreply',
      welkom: 'welcome', goodbye2: 'goodbye', stiker: 'sticker', stc: 'sticker',
      ytd: 'video', ytl: 'song', yt: 'video', weather: 'wthr', ai2: 'ai', bot: 'menu',
      cmd: 'menu', commands: 'menu', help: 'menu', halp: 'menu',
    };
    const alias = ALIASES[m.command.toLowerCase()];
    const ac = alias && commands.get(alias);
    if (ac) return ac.handler({ ...m, command: alias });
    // fuzzy suggest: user ki ghalat command ke sab se qareeb sahi command
    const q = m.command.toLowerCase();
    const lev = (a, b) => {
      const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
      for (let j = 0; j <= b.length; j++) d[0][j] = j;
      for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      return d[a.length][b.length];
    };
    const scored = [...commands.keys()].map((name) => {
      let s = lev(q, name);
      if (name.includes(q) || q.includes(name)) s = Math.min(s, Math.abs(name.length - q.length)); // substring = strong
      return [name, s];
    }).sort((a, b) => a[1] - b[1]);
    const top = scored.slice(0, 3).filter(([n, s]) => s <= Math.max(3, Math.floor(q.length / 2)));
    const hint = top.length ? `\n\n💡 Kya murad tha:\n${top.map(([n]) => `▫️ *${config.PREFIX}${n}*`).join('\n')}` : `\n\n💡 Sahi naam ke liye *${config.PREFIX}menu* dekho.`;
    return m.reply(`❌ *${config.PREFIX}${m.command}* mojood nahi hy.${hint}`);
  }
  if (cmd.ownerOnly && !m.isOwner) return m.reply('❌ Ye command sirf *owner* ke liye hy.');
  if (cmd.groupOnly && !m.isGroup) return m.reply('❌ Ye command sirf *group* me chalti hy.');

  // mentionreply: har reply ke shuru me user ka naam
  if (getToggle('mentionreply') && m.pushname) {
    const orig = m.reply.bind(m);
    m.reply = (t, ...a) => orig(typeof t === 'string' ? `*@${m.pushname}*\n\n${t}` : t, ...a);
  }

  // ---------- PREMIUM SPEED ----------
  // self-learning: jo command 1.2s se zyada le, agle par foran "⚡ Processing..." ack
  const slowCmds = global.__slowCmds || (global.__slowCmds = new Set(
    // starter set (network/media commands pehli dafa se hi instant ack)
    ['song','play','music','video','ytmp3','ytmp4','tiktok','tiktoksearch','facebook','fb','instagram','igdl','ig','capcut','gdrive','mediafire','megadl','apk','ai','gpt','gemini','chatgpt','sticker','s','attp','tomp3','tts','quote']
  ));
  if (slowCmds.has(m.command)) {
    await sock.sendMessage(m.chat, { text: `⚡ *Processing...*` }, { quoted: m }).catch(() => {});
  }

  console.log(`[CMD] ${m.command} | ${m.pushname} | ${m.isGroup ? 'group' : 'dm'}`);
  try {
    // recording / autotyping presence
    if (getToggle('recording')) await sock.sendPresenceUpdate('recording', m.chat).catch(() => {});
    else if (getToggle('autotyping')) await sock.sendPresenceUpdate('composing', m.chat).catch(() => {});
    const t0 = Date.now();
    await cmd.handler(m, sock);
    const dt = Date.now() - t0;
    if (dt > 1200 && !slowCmds.has(m.command)) {
      slowCmds.add(m.command);
      console.log(`[SPEED] ${m.command} slow (${dt}ms) — ab instant ack milega`);
    }
  } catch (e) {
    console.error(`[CMD-ERR] ${m.command}:`, e);
    const emsg = String(e.message || e).slice(0, 200);

    // 1) TRANSIENT error (network/timeout/429/503) → khud ek dafa retry, user ko pata bhi na chale
    if (!m.__retried && isTransientError(emsg)) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        await cmd.handler({ ...m, __retried: true }, sock);
        return; // retry chal gaya — error report ki zaroorat nahi
      } catch (e2) {
        console.error(`[CMD-RETRY-FAIL] ${m.command}:`, String(e2.message).slice(0, 120));
      }
    }

    // 2) error Mongo me likho + user ke apne number (yourself) par report bhejo
    logError({ command: m.command, chat: m.chat, isGroup: !!m.isGroup, sender: m.sender, error: emsg });
    await reportToSelf(sock,
      `⚠️ *BOT ERROR*\n\n🔹 Command: ${config.PREFIX}${m.command}\n🔹 Chat: ${m.isGroup ? 'Group' : 'DM'}\n🔹 Error: \`${emsg.slice(0, 150)}\`\n🕒 ${new Date().toLocaleString('en-PK', { timeZone: config.TIMEZONE })}\n\n🤖 Bot khud retry kar chuka hy — phir bhi ye aya, to main ise theek kar dunga.`);

    // 3) user ko saaf jawab
    await m.reply(`❌ *Error* aya — bot ne khud report kar di hy, jaldi theek ho jayega.\n\`\`\`${emsg.slice(0, 120)}\`\`\``).catch(() => {});
  }
}

// ---------- pairing queue (Vercel 60s cap ka hal) ----------
// Portal (Vercel) sirf pair_requests me 'pending' doc dalta hy; ASLI pairing socket
// yahan 24/7 worker par chalta hy — koi 60s limit nahi, is liye "could not link"
// wala masla khatam. Doc statuses: pending -> ready (code mil gaya) -> linked / error.
const mongoose = require('mongoose');
let _prModel = null;
function pairModel() {
  if (!_prModel) {
    const s = new mongoose.Schema({ _id: String, number: String, status: String, code: String, createdAt: Date }, { collection: 'pair_requests' });
    _prModel = mongoose.models.PairRequest || mongoose.model('PairRequest', s);
  }
  return _prModel;
}
const fmtCode = (c) => String(c).match(/.{1,4}/g).join('-');
let pairingBusy = false;

async function processPairQueue() {
  if (!config.MONGODB_URI || pairingBusy) return;
  pairingBusy = true;
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    }
    const PR = pairModel();

    // purane adhoore requests ki safai (15 min se purana)
    await PR.deleteMany({ createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) } });

    const pend = await PR.find({ status: 'pending', createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } })
      .sort({ createdAt: 1 }).limit(1).lean();
    if (!pend.length) return;
    const doc = pend[0];
    const number = doc.number;
    const sessionId = `${config.SESSION_PREFIX}:${number}`;

    // already linked? (dobara pair karne ki koshish)
    const existing = sessions.get(sessionId);
    if (existing && existing.user) {
      await PR.updateOne({ _id: number }, { status: 'linked' });
      return;
    }
    // dead/atki hui entry ho to hata do — warna pairing socket block reh jati hy
    if (existing && !existing.user) {
      try { existing.sock?.end(); } catch {}
      sessions.delete(sessionId);
      await new Promise((r) => setTimeout(r, 400));
    }

    console.log(`[PAIR-Q] ${number} ke liye pairing socket start`);
    const entry = await startSession(sessionId);
    if (!entry || !entry.sock) throw new Error('session start fail');

    // socket ke WhatsApp tak pohanchne ka intezar — adaptive (fixed 3s ki jagah)
    let code = null;
    for (let i = 0; i < 3 && !code; i++) {
      // ws khulne ka intezar (max 8s, 400ms check) — khulne ke baad chhota settle
      const t0 = Date.now();
      while (Date.now() - t0 < 8000) {
        const wsOpen = entry.sock.ws && entry.sock.ws.readyState === 1;
        if (wsOpen) { await new Promise((r) => setTimeout(r, 600)); break; }
        await new Promise((r) => setTimeout(r, 400));
      }
      if (!sessions.has(sessionId)) break; // logged out / removed
      try { code = await entry.sock.requestPairingCode(number); }
      catch (e) { console.log(`[PAIR-Q] code try ${i + 1} fail: ${e.message}`); }
    }
    if (!code) {
      await PR.updateOne({ _id: number }, { status: 'error' });
      console.log(`[PAIR-Q] ${number} — code nahi ban saka`);
      return; // session rehta hy; sync/loggedOut khud safai karega
    }
    await PR.updateOne({ _id: number }, { code: fmtCode(code), status: 'ready' });
    console.log(`[PAIR-Q] ${number} -> ${fmtCode(code)}`);

    // linked hone ka intezar (5 min) — open hone par startSession ka handler user set karta hy
    const t0 = Date.now();
    while (Date.now() - t0 < 5 * 60 * 1000) {
      await new Promise((r) => setTimeout(r, 2500));
      const cur = sessions.get(sessionId);
      if (cur && cur.user) {
        await PR.updateOne({ _id: number }, { status: 'linked' });
        console.log(`[PAIR-Q] ${number} LINKED ✅`);
        return;
      }
      if (!cur) break; // session khatam (loggedOut)
    }

    // timeout — adhoori pairing ki safai (creds + socket)
    const cur = sessions.get(sessionId);
    if (cur && !cur.user) {
      sessions.delete(sessionId);
      await deleteSession(config.MONGODB_URI, sessionId).catch(() => {});
      try { cur.sock.end(); } catch {}
      await PR.updateOne({ _id: number }, { status: 'error' }).catch(() => {});
      console.log(`[PAIR-Q] ${number} — pairing timeout, safai ho gayi`);
    }
  } catch (e) {
    console.error('[PAIR-Q] error:', e.message);
  } finally {
    pairingBusy = false;
  }
}

// ---------- anti-crash ----------
process.on('uncaughtException', (e) => console.error('[uncaught]', e));
process.on('unhandledRejection', (e) => console.error('[unhandled]', e));

// ---------- health endpoint (Koyeb/Render ko chahiye) ----------
const app = express();
app.get('/', (req, res) => res.json({
  bot: config.BOT_NAME,
  status: 'running',
  sessions: sessions.size,
  connected: [...sessions.values()].filter(s => s.user).length,
  uptime: Math.floor((Date.now() - startAt) / 1000),
  commands: commands.size,
}));
// EADDRINUSE-safe listen (Oct 3 fix): pehle port conflict par poora worker
// crash hota tha -> 3 users ke sessions bhi gir jate the. Ab sirf health
// endpoint skip hota hy, bot zinda rehta hy.
const httpServer = app.listen(config.PORT, () => console.log(`[SAQI-MD] health endpoint on :${config.PORT}`));
httpServer.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[SAQI-MD] port ${config.PORT} already in use — health endpoint skip, bot chalta rahega`);
  } else {
    console.error('[SAQI-MD] http server error:', e.message);
  }
});

// Pairing portal isi server par mount — EK service = pairing website + bot 24/7
app.use(require('./server'));

// ---------- go ----------
(async () => {
  try {
    baileysVersion = (await fetchLatestBaileysVersion()).version;
  } catch { baileysVersion = undefined; }

  if (config.MONGODB_URI) {
    console.log(`[SAQI-MD] multi-user mode (MongoDB) — sessions scan ho rahe hain`);
    await syncSessions();
    setInterval(syncSessions, 30 * 1000); // naye linked users har 30s me pick hote hain
    setInterval(processPairQueue, 2000); // pairing requests (portal queue se) — fast pickup
  } else {
    console.log(`[SAQI-MD] single-session file mode (MONGODB_URI nahi diya gaya)`);
    await startSession(config.SESSION_ID);
  }
})().catch((e) => { console.error('[SAQI-MD] FATAL:', e); process.exit(1); });
