/* SAQI-MD — Helper functions (media conversion, formatting, misc) */
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ---- formatting ----
function fmtUptime(seconds) {
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600),
        m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60);
  return `${d ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
}

function mono(txt) { return `\`\`\`${txt}\`\`\``; }

// ---- temp files ----
const tmpFiles = [];
function tmpFile(ext) {
  const f = path.join(os.tmpdir(), `saqimd_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
  tmpFiles.push(f);
  return f;
}
function cleanup(...files) {
  for (const f of files) { try { fs.existsSync(f) && fs.unlinkSync(f); } catch {} }
}

// ---- ffmpeg runner (execFile-only: no shell injection) ----
function runFFmpeg(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', args, { timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.slice(0, 300) || err.message));
      resolve();
    });
  });
}

// image/video -> sticker webp (512x512, 10s max for video)
async function toSticker(inputBuffer, isVideo = false) {
  const inp = tmpFile(isVideo ? 'mp4' : 'jpg');
  const out = tmpFile('webp');
  fs.writeFileSync(inp, inputBuffer);
  await runFFmpeg(isVideo
    ? ['-i', inp, '-t', '10', '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2,fps=12', '-an', '-c:v', 'libwebp', '-quality', '80', out]
    : ['-i', inp, '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2', '-c:v', 'libwebp', '-quality', '85', out]);
  const buf = fs.readFileSync(out);
  cleanup(inp, out);
  return buf;
}

// video -> mp3
async function toMP3(inputBuffer) {
  const inp = tmpFile('bin');
  const out = tmpFile('mp3');
  fs.writeFileSync(inp, inputBuffer);
  await runFFmpeg(['-i', inp, '-vn', '-c:a', 'libmp3lame', '-q:a', '4', out]);
  const buf = fs.readFileSync(out);
  cleanup(inp, out);
  return buf;
}

// YouTube search (no API key) -> first videoId + title
async function ytSearch(query) {
  const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  });
  const html = await res.text();
  const re = /"videoRenderer":\{"videoId":"(.{11})".*?"text":"(.*?)"/;
  const m = html.match(re);
  if (!m) return null;
  return { id: m[1], title: m[2].replace(/\\u0026/g, '&').replace(/\\"/g, '"'), url: `https://youtu.be/${m[1]}` };
}

// YouTube download: public converters ko order me try karo, jo chale wohi jeete
async function ytDownload(videoId, type = 'mp3') {
  const endpoints = [
    (id, t) => `https://p.oceansaver.in/ajax/download.php?format=${t}&url=https://www.youtube.com/watch?v=${id}`,
    (id, t) => `https://api.vevioz.com/api/button/${t === 'mp3' ? 'mp3' : 'mp4'}/${id}`,
  ];
  for (const make of endpoints) {
    try {
      const r = await fetch(make(videoId, type), { redirect: 'follow' });
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      const dl = j?.progress_url || j?.url || j?.download_url;
      if (dl) return dl;
    } catch {}
  }
  return null;
}

module.exports = { fmtUptime, mono, tmpFile, cleanup, runFFmpeg, toSticker, toMP3, ytSearch, ytDownload };
