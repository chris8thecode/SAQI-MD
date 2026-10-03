/* SAQI-MD — Pairing Server (Vercel-ready + standalone)
 *
 * GET  /            -> web UI (public/index.html)
 * POST /api/pair    -> {number} -> {ok, id, code}
 * GET  /pair?phone= -> JSON API (same kaam, URL-only access)
 * GET  /api/status/:id -> {ok, status, code, linked}
 *
 * v4: Vercel-safe lazy init — har require getApp() ke andar hota hy, aur koi bhi
 * boot error 500 me plainly report hota hy (FUNCTION_INVOCATION_FAILED ka pata nahi,
 * asli error dikhta hy). Standalone (node server.js) par wahi purana server chalta hy.
 * Worker (index.js) bhi is module ko require kar sakta hy (app use milta hy).
 */

let _app = null;

async function getApp() {
  if (_app) return _app;

  const express = require('express');
  const path = require('path');
  const crypto = require('crypto');
  const pino = require('pino');
  const config = require('./config');
  const { useMongoAuthState } = require('./lib/mongoSession');
  // Baileys ESM hy — pehle se bundle kiya hua CJS use karo (Vercel-proof)
  const { makeWASocket, fetchLatestBaileysVersion, DisconnectReason } = require('./lib/baileys-bundle.cjs');

  const app = express();
  app.use(express.json());
  const logger = pino({ level: 'silent' });

  const pairings = new Map(); // id -> entry
  const TTL = 5 * 60 * 1000;
  let active = null; // singleton lock

  const fmt = (code) => String(code).match(/.{1,4}/g).join('-');

  function closeActive() {
    if (!active) return;
    try { active.sock.end(); } catch {}
    pairings.delete(active.id);
    active = null;
  }

  // Vercel serverless: response ke baad process mar jata hy — pairing handshake
  // complete karne ke liye event-loop ko zinda rakho.
  function holdServerlessAlive(ms) {
    const end = Date.now() + ms;
    const t = setInterval(() => { if (Date.now() > end) clearInterval(t); }, 5000);
    if (t.unref) t.unref(); // standalone server par process band nahi karna
  }

  async function createPairing(number) {
    closeActive();
    const id = crypto.randomBytes(8).toString('hex');
    // multi-user: har number ka apna session — isi se worker use uthata hy
    const sessionId = `${config.SESSION_PREFIX}:${number}`;

    const { state, saveCreds } = await useMongoAuthState(config.MONGODB_URI, sessionId);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ['Ubuntu', 'Chrome', '22.04.4'],
      markOnlineOnConnect: true,
      syncFullHistory: false,
    });

    const entry = { id, sock, code: null, number, status: 'connecting', createdAt: Date.now(), __attempts: 0 };
    pairings.set(id, entry);
    active = entry;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
      const { connection, lastDisconnect } = u;
      if (connection === 'open') {
        entry.status = 'linked';
        console.log(`[PAIR] ${number} LINKED — session saved (${config.MONGODB_URI ? 'MongoDB' : 'file'})`);
        active = null;
        holdServerlessAlive(10 * 1000); // ek dafa save ho gaya, ab free
      }
      if (connection === 'close' && entry.status !== 'linked') {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          entry.status = 'logged_out';
          return;
        }
        entry.status = 'reconnecting';
        setTimeout(() => {
          if (pairings.get(id) === entry) requestCode(entry).catch(() => {});
        }, 2000);
      }
    });

    setTimeout(() => {
      const cur = pairings.get(id);
      if (cur && cur.status !== 'linked') {
        try { cur.sock.end(); } catch {}
        pairings.delete(id);
        if (active === cur) active = null;
      }
    }, TTL);

    holdServerlessAlive(config.PAIR_SOCKET_TTL_MS);
    await requestCode(entry);
    return entry;
  }

  async function requestCode(entry) {
    const attempt = ++entry.__attempts;
    if (attempt > 3) { entry.status = 'error'; return; }

    // socket ka WhatsApp tak pohanchne ka intezar (race fix)
    await new Promise(r => setTimeout(r, 3000));
    if (entry.status === 'linked' || !pairings.has(entry.id)) return;

    try {
      const code = await entry.sock.requestPairingCode(entry.number);
      entry.code = code;
      entry.status = 'code_ready';
      console.log(`[PAIR] ${entry.number} -> ${fmt(code)}`);
    } catch (e) {
      console.log(`[PAIR] code fail (attempt ${attempt}): ${e.message}`);
      if (attempt < 3) setTimeout(() => requestCode(entry).catch(() => {}), 3000);
      else entry.status = 'error';
    }
  }

  // ---------- Mongo pair-queue (Vercel 60s cap ka hal) ----------
  // Vercel serverless par baileys socket 60s me mar jata hy — is liye pairing ka
  // asli kaam 24/7 worker karta hy. Portal sirf request queue karta hy aur code
  // Mongo se uthata hy. File-mode (bina Mongo) par purana direct flow chalta hy.
  const mongoose = require('mongoose');
  let _prModel = null;
  async function queueDB() {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    }
    if (!_prModel) {
      const s = new mongoose.Schema({ number: String, status: String, code: String, createdAt: Date }, { collection: 'pair_requests' });
      _prModel = mongoose.models.PairRequest || mongoose.model('PairRequest', s);
    }
    return _prModel;
  }

  // ---------- routes ----------
  app.post('/api/pair', async (req, res) => {
    const number = String(req.body?.number || '').replace(/[^0-9]/g, '');
    if (!number || number.length < 10 || number.length > 15) {
      return res.json({ ok: false, error: 'Number ghalat hy — country code ke sath likho (e.g. 92300XXXXXXX)' });
    }
    try {
      if (config.MONGODB_URI) {
        const PR = await queueDB();
        await PR.findOneAndUpdate(
          { _id: number },
          { number, status: 'pending', code: null, createdAt: new Date() },
          { upsert: true }
        );
        return res.json({ ok: true, id: number, code: null, status: 'pending' });
      }
      const entry = await createPairing(number);
      if (entry.code) return res.json({ ok: true, id: entry.id, code: fmt(entry.code) });
      res.json({ ok: true, id: entry.id, code: null, status: entry.status });
    } catch (e) {
      console.error('[PAIR] create fail:', e.message);
      res.json({ ok: false, error: 'Server busy hy — thori dair baad try karo.' });
    }
  });

  app.get('/pair', async (req, res) => {
    const number = String(req.query.phone || '').replace(/[^0-9]/g, '');
    if (!number || number.length < 10) {
      return res.json({ ok: false, error: 'Use /pair?phone=92300XXXXXXX' });
    }
    try {
      const entry = await createPairing(number);
      res.json({ ok: true, id: entry.id, code: entry.code ? fmt(entry.code) : null, status: entry.status });
    } catch (e) {
      res.json({ ok: false, error: 'Server busy hy — thori dair baad try karo.' });
    }
  });

  app.get('/api/status/:id', async (req, res) => {
    try {
      if (config.MONGODB_URI) {
        const PR = await queueDB();
        const doc = await PR.findById(req.params.id).lean().catch(() => null);
        if (!doc) return res.json({ ok: false, status: 'expired' });
        return res.json({ ok: true, status: doc.status, code: doc.code || null, linked: doc.status === 'linked' });
      }
    } catch (e) {
      return res.json({ ok: false, status: 'expired' });
    }
    const e = pairings.get(req.params.id);
    if (!e) return res.json({ ok: false, status: 'expired' });
    if (!e.code && e.status !== 'linked' && Date.now() - e.createdAt < 90 * 1000) {
      return res.json({ ok: true, status: 'starting', code: null });
    }
    res.json({ ok: true, status: e.status, code: e.code ? fmt(e.code) : null, linked: e.status === 'linked' });
  });

  app.get('/health', (req, res) => res.json({ ok: true, service: 'saqi-md-pair', build: 'v17-fresh', active: !!active }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

  _app = app;
  return app;
}

// Vercel serverless entry — koi bhi boot error asli shape me report hota hy
module.exports = async (req, res) => {
  try {
    const app = await getApp();
    app(req, res);
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e.message,
      stack: String(e.stack || '').split('\n').slice(0, 5).join('\n'),
    });
  }
};

const PORT = process.env.PORT || 3000;
if (require.main === module && process.env.VERCEL !== '1') { // standalone + worker mount ke ilawa
  getApp().then((app) => {
    app.listen(PORT, () => console.log(`[SAQI-MD] Pairing portal: http://localhost:${PORT}`));
  }).catch((e) => { console.error('[SAQI-MD] portal fail:', e); process.exit(1); });
}
