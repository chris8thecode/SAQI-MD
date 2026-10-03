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

// ---------- go ----------
(async () => {
  try {
    baileysVersion = (await fetchLatestBaileysVersion()).version;
  } catch { baileysVersion = undefined; }

  if (config.MONGODB_URI) {
    console.log(`[SAQI-MD] multi-user mode (MongoDB) — sessions scan ho rahe hain`);
    await syncSessions();
    setInterval(syncSessions, 30 * 1000); // naye linked users har 30s me pick hote hain
  } else {
    console.log(`[SAQI-MD] single-session file mode (MONGODB_URI nahi diya gaya)`);
    await startSession(config.SESSION_ID);
  }
})().catch((e) => { console.error('[SAQI-MD] FATAL:', e); process.exit(1); });
