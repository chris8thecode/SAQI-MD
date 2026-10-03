/* SAQI-MD — TOOLS: .vv2/.vv/.viewonce (view-once bypass), .sticker/.s */
const { toSticker, toMP3 } = require('../lib/functions');

// ---------- view-once extractor ----------
async function viewOnce(m, sock) {
  const q = m.quoted;
  if (!q) {
    return m.reply(`❌ View-once photo/video/audio par *reply* karo aur ${config.PREFIX}vv2 likho.`);
  }
  const msg = q.message;
  const inner = msg?.imageMessage || msg?.videoMessage || msg?.audioMessage;
  if (!inner) return m.reply('❌ Ye media message nahi hy. Photo/video ko reply karo.');

  // quoted ke through download (viewOnce flag par koi farq nahi — raw data mil jata hy)
  const streamPkg = require('@whiskeysockets/baileys');
  const type = msg.imageMessage ? 'image' : msg.videoMessage ? 'video' : 'audio';
  const stream = streamPkg.downloadContentFromMessage(inner, type);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  const buf = Buffer.concat(chunks);

  const cap = `🔓 *View-once unlocked — SAQI-MD*`;
  if (type === 'image') await sock.sendMessage(m.chat, { image: buf, caption: cap }, { quoted: m });
  else if (type === 'video') await sock.sendMessage(m.chat, { video: buf, caption: cap }, { quoted: m });
  else await sock.sendMessage(m.chat, { audio: buf, mimetype: inner.mimetype || 'audio/mpeg' }, { quoted: m });
}

// ---------- sticker ----------
async function sticker(m, sock) {
  // current message ya quoted — dono chalega
  const cur = m.message?.imageMessage || m.message?.videoMessage;
  const q = m.quoted?.message?.imageMessage || m.quoted?.message?.videoMessage;
  if (!cur && !q) {
    return m.reply(`❌ Image/video bhejo caption me ${config.PREFIX}sticker — ya kisi media par reply karo.`);
  }
  const isVideo = !!(m.message?.videoMessage || m.quoted?.message?.videoMessage);

  let buffer;
  if (cur) {
    const d = await m.download('current');
    buffer = d.buffer;
  } else {
    // quoted download via downloadContentFromMessage
    const msgObj = m.quoted.message;
    const inner = msgObj.imageMessage || msgObj.videoMessage;
    const streamPkg = require('@whiskeysockets/baileys');
    const stream = streamPkg.downloadContentFromMessage(inner, isVideo ? 'video' : 'image');
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    buffer = Buffer.concat(chunks);
  }

  const webp = await toSticker(buffer, isVideo);
  await sock.sendMessage(m.chat, { sticker: webp }, { quoted: m });
}

module.exports.commands = [
  { name: 'vv2', desc: 'View-once media bahar nikalo', category: 'Tools', handler: viewOnce },
  { name: 'vv', desc: 'Same as .vv2', category: 'Tools', handler: viewOnce },
  { name: 'viewonce', desc: 'Same as .vv2', category: 'Tools', handler: viewOnce },
  { name: 'sticker', desc: 'Image/video → sticker', category: 'Tools', handler: sticker },
  { name: 's', desc: 'Same as .sticker', category: 'Tools', handler: sticker },
];
