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

// ---------- multi-session registry ----------
// sessionId -> { sock, reconnects, user, starting, dead }
const sessions = new Map();
let baileysVersion = null;
// antidelete: har session ke akhri messages ki sada copy (messageId -> info)
const msgCache = new Map();
const settingsMod = require('./commands/settings.js');
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
  const chat = key.remoteJid;
  if (!chat) return;
  const body = saved
    ? `👤 +${saved.sender}${saved.push ? ` (${saved.push})` : ''}\n💬 ${saved.text || '(media ya khali message)'}`
    : null;
  await entry.sock.sendMessage(chat, { text: `🚫 *ANTIDELETE* — kisi ne message delete kiya\n${body || '(message record nahi tha — bot band tha us waqt)'}` }).catch(() => {});
}

async function startSession(sessionId) {
  if (sessions.has(sessionId)) return;
  const entry = { sock: null, reconnects: 0, user: null, starting: true, dead: false };
  sessions.set(sessionId, entry);

  try {
    const { state, saveCreds } = await useMongoAuthState(config.MONGODB_URI, sessionId);
    entry.sock = makeWASocket({
      version: baileysVersion,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '22.04.4'],
      markOnlineOnConnect: getToggle('online') !== false,
      syncFullHistory: false,
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

          const m = smsg(sock, raw);

          // status @broadcast: statusview/statusemoji/statuslike/antistatus
          if (String(raw.key.remoteJid) === 'status@broadcast') {
            if (getToggle('antistatus')) continue; // status par bilkul react nahi
            if (getToggle('statusview')) await sock.readMessages([raw.key]).catch(() => {});
            const likeIt = getToggle('statuslike');
            if (getToggle('statusemoji') || likeIt) {
              const emo = likeIt ? '❤️' : ['❤️', '🔥', '👍', '😂', '😮', '🌈'][Math.floor(Math.random() * 6)];
              await sock.sendMessage('status@broadcast', { react: { text: emo, key: raw.key } }).catch(() => {});
            }
            continue;
          }

          // autoreact: har aam message par reaction
          if (getToggle('autoreact') && !m.command && !m.isOwner) {
            await sock.sendMessage(m.chat, { react: { text: ['❤️', '🔥', '👍', '😂', '😮', '😢', '🙏'][Math.floor(Math.random() * 7)], key: raw.key } }).catch(() => {});
          }

          if (m.command) {
            try { await handleMessage(entry.sock, raw); } catch (e) { console.error(`[SAQI-MD] [${sessionId}] message error:`, e); }
            continue;
          }

          // antidelete cache (sirf normal chats)
          if (raw.key?.id) cacheMessage(sessionId, raw, m);

          // autoread toggle
          if (getToggle('autoread')) await sock.readMessages([raw.key]).catch(() => {});

          // antilink: group me link par message delete
          if (getToggle('antilink') && m.text && /chat\.whatsapp\.com|https?:\/\//i.test(m.text) && String(raw.key.remoteJid).endsWith('@g.us') && !m.isOwner) {
            try {
              await sock.sendMessage(raw.key.remoteJid, { delete: raw.key });
              await sock.sendMessage(raw.key.remoteJid, { text: `🚫 *Antilink* — link delete kar diya (${m.pushname || 'user'})` });
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
    entry.sock.ev.on('messages.update', (ups) => { for (const u of ups) { handleRevoke(entry, sessionId, u).catch(() => {}); } });

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
      if (!sessions.has(id) && sessions.size < config.MAX_SESSIONS) {
        await startSession(id);
      }
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

  // private mode: sirf owner + sudo
  const senderNum = (m.sender || '').split('@')[0];
  if (config.MODE === 'private' && !m.isOwner && !settingsMod.isSudo(senderNum)) return;
  // adminaction: groups me sirf admins ke commands
  if (getToggle('adminaction') && m.isGroup && !m.isAdmin && !m.isOwner) return;

  const cmd = commands.get(m.command);
  if (!cmd) return m.reply(`❌ *${config.PREFIX}${m.command}* mojood nahi hy. Sahi naam ke liye *${config.PREFIX}menu* dekho.`);
  if (cmd.ownerOnly && !m.isOwner) return m.reply('❌ Ye command sirf *owner* ke liye hy.');
  if (cmd.groupOnly && !m.isGroup) return m.reply('❌ Ye command sirf *group* me chalti hy.');

  // mentionreply: har reply ke shuru me user ka naam
  if (getToggle('mentionreply') && m.pushname) {
    const orig = m.reply.bind(m);
    m.reply = (t, ...a) => orig(typeof t === 'string' ? `*@${m.pushname}*\n\n${t}` : t, ...a);
  }

  console.log(`[CMD] ${m.command} | ${m.pushname} | ${m.isGroup ? 'group' : 'dm'}`);
  try {
    // recording / autotyping presence
    if (getToggle('recording')) await sock.sendPresenceUpdate('recording', m.chat).catch(() => {});
    else if (getToggle('autotyping')) await sock.sendPresenceUpdate('composing', m.chat).catch(() => {});
    await cmd.handler(m, sock);
  } catch (e) {
    console.error(`[CMD-ERR] ${m.command}:`, e);
    await m.reply(`❌ *Error* aya tha command me — owner ko bata diya jayega.\n\`\`\`${String(e.message).slice(0, 120)}\`\`\``).catch(() => {});
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
app.listen(config.PORT, () => console.log(`[SAQI-MD] health endpoint on :${config.PORT}`));

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
