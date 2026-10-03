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
      markOnlineOnConnect: true,
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
        try { await handleMessage(entry.sock, raw); } catch (e) {
          console.error(`[SAQI-MD] [${sessionId}] message error:`, e);
        }
      }
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
  if (config.AUTO_READ) await sock.readMessages([raw.key]).catch(() => {});

  const cmd = commands.get(m.command);
  if (!cmd) return;
  if (cmd.ownerOnly && !m.isOwner) return m.reply('❌ Ye command sirf *owner* ke liye hy.');
  if (cmd.groupOnly && !m.isGroup) return m.reply('❌ Ye command sirf *group* me chalti hy.');

  console.log(`[CMD] ${m.command} | ${m.pushname} | ${m.isGroup ? 'group' : 'dm'}`);
  try {
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
    const s = new mongoose.Schema({ number: String, status: String, code: String, createdAt: Date }, { collection: 'pair_requests' });
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

    // socket ke WhatsApp tak pohanchne ka intezar, phir code (3 tries)
    let code = null;
    for (let i = 0; i < 3 && !code; i++) {
      await new Promise((r) => setTimeout(r, 3000));
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
      await new Promise((r) => setTimeout(r, 4000));
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
    setInterval(processPairQueue, 5000); // pairing requests (portal queue se)
  } else {
    console.log(`[SAQI-MD] single-session file mode (MONGODB_URI nahi diya gaya)`);
    await startSession(config.SESSION_ID);
  }
})().catch((e) => { console.error('[SAQI-MD] FATAL:', e); process.exit(1); });
