/* SAQI-MD   AUDIO: 16 ffmpeg voice effects + tomp3/toptt
 * Audio/voice note par reply karo aur effect ka command likho.
 */
const config = require('../../config');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

function tmpFile(ext) {
  return path.join(
    os.tmpdir(),
    `saqimd_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`,
  );
}

function run(args) {
  return new Promise((res, rej) =>
    execFile('ffmpeg', args, { timeout: 90000 }, (e, so, se) =>
      e ? rej(new Error((se || e.message).slice(-200))) : res(),
    ),
  );
}

const FX = {
  bass: 'equalizer=f=60:gain_type=q:gain=8',
  deep: 'equalizer=f=100:gain_type=o:gain=-6',
  smooth: 'equalizer=f=800:gain_type=o:gain=-4',
  fat: 'bass=g=6',
  tupai: 'asetrate=44100*1.3,aresample=44100,atempo=0.85',
  blown: 'volume=8,acrusher=bits=4',
  radio: 'highpass=f=500,lowpass=f=3000',
  robot: 'vibrato=f=8:d=0.8,flanger',
  chipmunk: 'asetrate=44100*1.6,aresample=44100,atempo=0.9',
  nightcore: 'asetrate=44100*1.25,aresample=44100,atempo=1.0',
  earrape: 'volume=25,acrusher=bits=2',
  reverse: 'areverse',
  slow: 'asetrate=44100*0.8,aresample=44100,atempo=1.0',
  fast: 'asetrate=44100*1.35,aresample=44100,atempo=1.0',
  baby: 'asetrate=44100*1.7,aresample=44100,atempo=0.95,lowpass=f=6000',
  demon: 'asetrate=44100*0.7,aresample=44100,atempo=1.05,bass=g=10',
};

async function handler(m, sock) {
  const cmd = m.command;
  const inner =
    m.message?.audioMessage ||
    m.message?.videoMessage ||
    m.quoted?.message?.audioMessage ||
    m.quoted?.message?.videoMessage;
  if (!inner)
    return m.reply(`❌ Audio/voice note par *reply* karo aur ${config.PREFIX}${cmd} likho.`);

  const type = m.message?.videoMessage || m.quoted?.message?.videoMessage ? 'video' : 'audio';
  const stream = await downloadContentFromMessage(inner, type);
  const chunks = [];

  for await (const c of stream) chunks.push(c);
  const inp = tmpFile('bin');
  fs.writeFileSync(inp, Buffer.concat(chunks));

  await m.reply(`🎧 *${cmd}* effect lag raha hy...`);

  if (cmd === 'tomp3' || cmd === 'toptt') {
    const out = tmpFile(cmd === 'toptt' ? 'ogg' : 'mp3');
    await run(
      cmd === 'toptt'
        ? ['-y', '-i', inp, '-c:a', 'libopus', '-b:a', '64k', out]
        : ['-y', '-i', inp, '-vn', '-c:a', 'libmp3lame', '-q:a', '4', out],
    );
    const buf = fs.readFileSync(out);
    try {
      fs.unlinkSync(out);
    } catch {}
    if (cmd === 'toptt')
      await sock.sendMessage(
        m.chat,
        { audio: buf, mimetype: 'audio/ogg; codecs=opus', ptt: true },
        { quoted: m },
      );
    else
      await sock.sendMessage(
        m.chat,
        { document: buf, mimetype: 'audio/mpeg', fileName: 'audio.mp3' },
        { quoted: m },
      );
  } else {
    const out = tmpFile('mp3');
    await run(['-y', '-i', inp, '-af', FX[cmd], '-vn', '-c:a', 'libmp3lame', '-q:a', '4', out]);
    await sock.sendMessage(
      m.chat,
      { audio: fs.readFileSync(out), mimetype: 'audio/mpeg' },
      { quoted: m },
    );
    try {
      fs.unlinkSync(out);
    } catch {}
  }
}

module.exports.commands = [
  ...Object.keys(FX).map((name) => ({
    name,
    desc: `Voice FX: ${name}`,
    category: 'AUDIO',
    handler,
  })),
  { name: 'tomp3', desc: 'Video/audio → MP3', category: 'AUDIO', handler },
  { name: 'toptt', desc: 'Audio → voice note', category: 'AUDIO', handler },
];
