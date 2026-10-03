/* SAQI-MD — Main Entry Point (24/7 Worker)
 * Koyeb/Render/Railway/VPS par chalta hy. Vercel par NAHI (serverless WebSocket hold nahi kar sakta).
 *
 * - MongoDB auth state (agar MONGODB_URI diya ho) warna local file session
 * - Auto-reconnect (max MAX_RECONNECTS)
 * - messages.upsert -> serialize -> prefix -> command route
 * - Anti-crash: har command try-catch me + process-level handlers
 * - Health check: GET /port par (Koyeb free plan ke liye zaroori)
 */
const {
  default: makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const config = require('./config');
const { useMongoAuthState } = require('./lib/mongoSession');

const logger = pino({ level: 'silent' });
let startAt = Date.now();
let reconnects = 0;
let sock = null;

// ---------- command registry ----------
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

// ---------- connection ----------
async function startBot() {
  const { state, saveCreds } = await useMongoAuthState(config.MONGODB_URI, config.SESSION_ID);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '22.04.4'],
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') {
      reconnects = 0;
      console.log(`[SAQI-MD] ✅ connected as ${sock.user?.id} | ${config.BOT_NAME} v${config.BOT_VERSION} | ${commands.size} commands`);
      const owner = config.OWNER_NUMBERS[0];
      if (owner) {
        sock.sendMessage(owner + '@s.whatsapp.net', {
          text: `🤖 *${config.BOT_NAME}* ONLINE!\n⏱️ ${new Date().toLocaleString('en-PK', { timeZone: config.TIMEZONE })}\n⚙️ ${commands.size} commands loaded\n\nType ${config.PREFIX}menu`
        }).catch(() => {});
      }
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`[SAQI-MD] connection closed (${code}), reconnects: ${reconnects}`);
      if (code === DisconnectReason.loggedOut) {
        console.log('[SAQI-MD] ❌ logged out — session reset chahiye. Mongo me session docs delete karo ya naya SESSION_ID do.');
      } else if (reconnects < config.MAX_RECONNECTS) {
        reconnects++;
        setTimeout(startBot, Math.min(reconnects * 3000, 30000));
      } else {
        console.log('[SAQI-MD] max reconnects reached — process exit (platform restart policy wapis chalayegi).');
        process.exit(1);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const raw of messages) {
      try { await handleMessage(raw); } catch (e) {
        console.error('[SAQI-MD] message error:', e);
      }
    }
  });

  return sock;
}

// ---------- message handler ----------
const { smsg } = require('./lib/serialize.mjs');

async function handleMessage(raw) {
  if (!raw.message) return;
  if (raw.key.id.startsWith('BAE5') && raw.key.id.length === 16) return; // bot ka apna bheja hua
  if (raw.key.remoteJid === 'status@broadcast') return;

  const m = smsg(sock, raw);
  if (!m.command) return;
  if (config.AUTO_READ) await sock.readMessages([raw.key]).catch(() => {});

  const cmd = commands.get(m.command);
  if (!cmd) return;
  if (config.MODE === 'private' && !m.isOwner) return; // private mode: chup-chaap ignore
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
  status: sock?.user ? 'connected' : 'connecting',
  uptime: Math.floor((Date.now() - startAt) / 1000),
  commands: commands.size,
}));
app.listen(config.PORT, () => console.log(`[SAQI-MD] health endpoint on :${config.PORT}`));

// ---------- go ----------
startBot().catch((e) => { console.error('[SAQI-MD] FATAL:', e); process.exit(1); });
