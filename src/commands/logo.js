/* SAQI-MD   LOGO: text logos   LOCAL ffmpeg rendering (koi API nahi = kabhi down nahi hota)
 * Har style apna gradient + font + text effect use karta hy.
 */
const config = require('../../config');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FONT = '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf';
const FONT_ITALIC = '/usr/share/fonts/truetype/freefont/FreeSansOblique.ttf';

// style -> { c0, c1 (gradient), tcolor, font, shadow, outline, size }
const STYLES = {
  advglow: { c0: '#0f0c29', c1: '#302b63', tcolor: '#ffef9f', glow: '#ffef9f' },
  amongus: { c0: '#141e30', c1: '#243b55', tcolor: '#7ef9ff', glow: '#2ec5ff' },
  bplogo: { c0: '#050505', c1: '#1a1a2e', tcolor: '#f7a5c4', glow: '#ff69b4' },
  bpstyle: { c0: '#000000', c1: '#0f0f0f', tcolor: '#ff2d95', glow: '#ff2d95' },
  cartoontxt: { c0: '#ffd89b', c1: '#19547b', tcolor: '#ffffff', outline: 'black' },
  deletetxt: { c0: '#3a3a3a', c1: '#0d0d0d', tcolor: '#e8e8e8', glow: '#b0b0b0' },
  clouds: { c0: '#83a4d4', c1: '#b6fbff', tcolor: '#1c3f60', font: FONT_ITALIC },
  flag3d: { c0: '#870000', c1: '#190a05', tcolor: '#ffd700', outline: 'black' },
  freecreate: { c0: '#ff9966', c1: '#ff5e62', tcolor: '#ffffff', outline: '#7a2c00' },
  galaxy: { c0: '#1a2a6c', c1: '#b21f1f', tcolor: '#ffe259', glow: '#ffa751' },
  galaxywp: { c0: '#0f2027', c1: '#2c5364', tcolor: '#9be7ff', glow: '#48c6ef' },
  glitch: { c0: '#000000', c1: '#1c1c1c', tcolor: '#00ffcc', glow: '#ff0066' },
  glow: { c0: '#0b0b0b', c1: '#232526', tcolor: '#aefbff', glow: '#00d2ff' },
  gradient: { c0: '#ff512f', c1: '#dd2476', tcolor: '#ffffff' },
  lightfx: { c0: '#000428', c1: '#004e92', tcolor: '#ffffff', glow: '#7ad7ff' },
  logomaker: { c0: '#11998e', c1: '#38ef7d', tcolor: '#ffffff', outline: '#0b4f43' },
  luxurygold: { c0: '#1a1a1a', c1: '#3a2f0b', tcolor: '#ffd700', glow: '#ffb300' },
  neon: { c0: '#0f0c29', c1: '#24243e', tcolor: '#39ff14', glow: '#39ff14' },
  papercut: { c0: '#fdfbfb', c1: '#ebedee', tcolor: '#e74c3c', outline: '#2c3e50' },
  pixelglitch: { c0: '#120e0a', c1: '#2b1c0f', tcolor: '#ffb000', glow: '#ff6600' },
  royal: { c0: '#141e30', c1: '#42275a', tcolor: '#ffd700', outline: '#732700' },
  sand: { c0: '#e6d3b3', c1: '#c98d5e', tcolor: '#4b2e0d', font: FONT_ITALIC },
  typography: { c0: '#f5f7fa', c1: '#c3cfe2', tcolor: '#22223b' },
  beach: { c0: '#f6d365', c1: '#63a4ff', tcolor: '#ffffff', outline: '#0d3b66' },
  underwater: { c0: '#005aa7', c1: '#0aa3c2', tcolor: '#dff9fb', glow: '#7ef9ff' },
  watercolor: { c0: '#f093fb', c1: '#f5576c', tcolor: '#ffffff', font: FONT_ITALIC },
  write: { c0: '#232526', c1: '#414345', tcolor: '#f5f5f5', font: FONT_ITALIC },
};

function tmpFile(ext) {
  return path.join(
    os.tmpdir(),
    `saqimd_logo_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`,
  );
}

function run(args) {
  return new Promise((res, rej) =>
    execFile('ffmpeg', args, { timeout: 60000 }, (e, so, se) =>
      e ? rej(new Error((se || e.message).slice(-200))) : res(),
    ),
  );
}

async function handler(m, sock) {
  if (!m.arg) return m.reply(`❌ Text do. Example: ${config.PREFIX}${m.command} SAQI-MD`);
  const st = STYLES[m.command] || STYLES.glow;
  const text = m.arg.slice(0, 20).replace(/[':%\\]/g, '');
  const out = tmpFile('png');

  // gradient background + optional glow/shadow/outline text
  const drawLayers = [];
  if (st.glow) {
    drawLayers.push(
      `drawtext=fontfile=${FONT}:text='${text}':fontcolor=${st.glow}:fontsize=88:x=(w-text_w)/2+4:y=(h-text_h)/2+4:alpha=0.45`,
    );
  }
  drawLayers.push(
    `drawtext=fontfile=${st.font || FONT}:text='${text}':fontcolor=${st.tcolor}:fontsize=88:x=(w-text_w)/2:y=(h-text_h)/2${st.outline ? `:borderw=4:bordercolor=${st.outline}` : ''}${st.glow ? ':shadowx=3:shadowy=3:shadowcolor=0x00000080' : ''}`,
  );

  try {
    await run([
      '-y',
      '-f',
      'lavfi',
      '-i',
      `gradients=s=800x420:c0=${st.c0}:c1=${st.c1}:x0=100:y0=100:x1=700:y1=320:d=1`,
      '-vf',
      drawLayers.join(','),
      '-frames:v',
      '1',
      out,
    ]);
    await sock.sendMessage(
      m.chat,
      { image: fs.readFileSync(out), caption: `🎨 *${m.arg}*   ${config.BOT_NAME}` },
      { quoted: m },
    );
    try {
      fs.unlinkSync(out);
    } catch {}
  } catch (e) {
    await m.reply('❌ Logo render fail: ' + e.message.slice(0, 80));
  }
}

module.exports.commands = Object.keys(STYLES).map((name) => ({
  name,
  desc: `Logo: ${name}`,
  category: 'LOGO',
  handler,
}));
