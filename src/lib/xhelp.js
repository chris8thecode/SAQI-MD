/* SAQI-MD   extra command engine helpers (v5.0): shared infra for x* command files */
const config = require('../../config');
const { pick } = require('./helpers');
const mongoose = require('mongoose');

/* ---- Mongo-backed KV store with in-memory fallback ---- */
const MEM = new Map();
let _db = null;

function db() {
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      _db = mongoose.connection.db;
      return _db;
    }
  } catch (e) {}
  return null;
}

async function kvGet(key, dflt) {
  const d = db();
  if (d) {
    try {
      const doc = await d.collection('bot_extra').findOne({ _id: key });
      return doc ? doc.v : dflt;
    } catch (e) {}
  }
  return MEM.has(key) ? MEM.get(key) : dflt;
}

async function kvSet(key, val) {
  MEM.set(key, val);
  const d = db();
  if (d) {
    try {
      await d
        .collection('bot_extra')
        .updateOne({ _id: key }, { $set: { v: val } }, { upsert: true });
    } catch (e) {}
  }
  return val;
}

/* ---- safe math evaluator: digits, ops, parens, ^, %, common funcs ---- */
function safeMath(expr) {
  let e = String(expr || '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\^/g, '**')
    .replace(/\bpi\b/gi, 'Math.PI');
  e = e.replace(
    /\b(sqrt|abs|round|floor|ceil|sin|cos|tan|log)\s*\(/gi,
    (w) => 'Math.' + w.trim().toLowerCase(),
  );
  const stripped = e.replace(/Math\.(PI|E|sqrt|abs|round|floor|ceil|sin|cos|tan|log)\b/g, '0');
  if (!/^[\d\s+\-*/().,%]+$/.test(stripped)) return null;
  try {
    const val = Function('"use strict"; return (' + e + ')')();
    return typeof val === 'number' && isFinite(val) ? Math.round(val * 1e6) / 1e6 : null;
  } catch (err) {
    return null;
  }
}

/* ---- fetch with timeout ---- */
async function xfetch(url, opts, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 12000);
  try {
    return await fetch(url, { ...opts, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ---- ffmpeg media transform: download src, apply filter, send ---- */
const FFMPEG = 'ffmpeg';
const FILTERS = {
  grayscale: ['vf', 'hue=s=0'],
  bw: ['vf', 'hue=s=0'],
  gray: ['vf', 'hue=s=0'],
  sepia: ['vf', 'colorbalance=rs=.3:gs=.1:bs=-.2'],
  invert: ['vf', 'negate'],
  blur: ['vf', 'boxblur=8:2'],
  sharpen: ['vf', 'unsharp=5:5:1.5'],
  brightness: ['vf', 'eq=brightness=0.15'],
  contrast: ['vf', 'eq=contrast=1.6'],
  saturation: ['vf', 'eq=saturation=2'],
  hue: ['vf', 'hue=H=3.14*30/180'],
  vintage: ['vf', 'curves=vintage'],
  cinematic: ['vf', 'eq=contrast=1.2:saturation=1.3'],
  mirror: ['vf', 'hflip'],
  flip: ['vf', 'vflip'],
  rotate: ['vf', 'transpose=1'],
  pixel: ['vf', 'scale=iw/16:-1,scale=iw:ih:flags=neighbor'],
  sketch: ['vf', 'edge Detect'.replace(' ', '')] /* fallback below */,
  neon: ['vf', 'eq=saturation=2.5:contrast=1.4'],
  compress: ['crf', '32'],
  hd: ['crf', '20'],
};

async function mediaTransform(m, sock, filter, isVideo) {
  const src =
    m.quotedUrl ||
    (m.quoted && (m.quoted.mtype === 'imageMessage' || m.quoted.mtype === 'videoMessage')
      ? 'quoted'
      : /^https?:\/\//.test(m.arg || '')
        ? m.arg
        : null);
  if (!src)
    return m.reply(
      `❌ Image/video quote karo ya URL do. Example: .${m.command} (image quote karke)`,
    );
  try {
    const fs = require('fs'),
      path = require('path'),
      { execSync } = require('child_process');
    const dir = '/tmp/saqimd_x_' + Date.now();
    fs.mkdirSync(dir, { recursive: true });
    const inF = path.join(dir, 'in' + (isVideo ? '.mp4' : '.jpg'));
    const outF = path.join(dir, 'out' + (isVideo ? '.mp4' : '.jpg'));
    if (src === 'quoted') {
      const buf = await m.quoted.download();
      fs.writeFileSync(inF, buf);
    } else {
      const res = await xfetch(src, {}, 30000);
      fs.writeFileSync(inF, Buffer.from(await res.arrayBuffer()));
    }
    const conf = FILTERS[filter] || ['crf', '23'];
    let cmd;
    if (conf[0] === 'vf')
      cmd = `${FFMPEG} -y -i ${inF} -vf "${conf[1]}" -frames:v ${isVideo ? '99999' : '1'} ${outF}`;
    else cmd = `${FFMPEG} -y -i ${inF} -crf ${conf[1]} ${outF}`;
    execSync(cmd, { timeout: 55000, stdio: 'ignore' });
    const payload = isVideo
      ? { video: fs.readFileSync(outF), caption: '✅ ' + filter + ' done   ' + config.BOT_NAME }
      : { image: fs.readFileSync(outF), caption: '✅ ' + filter + ' done   ' + config.BOT_NAME };
    const r = await sock.sendMessage(m.chat, payload, { quoted: m });
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {}
    return r;
  } catch (e) {
    return m.reply('❌ Media process nahi ho saka. Image/video quote karke try karo.');
  }
}

/* ---- AI fallback: unknown-but-AI-suitable commands ---- */
async function aiFallback(m, sock, hint) {
  const target = global.__SAQI_CMD_GET ? global.__SAQI_CMD_GET('ai') : null;
  if (target) return target.handler(m, sock);
  return m.reply('🤖 ' + hint);
}

module.exports = { pick, kvGet, kvSet, safeMath, xfetch, mediaTransform, aiFallback, FILTERS };
