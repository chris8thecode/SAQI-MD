/* SAQI-MD — OTHER: getpp, mee, srepo, gpass, anime1-5, unban0-99 (ban system nahi — sab safe reply) */
const config = require('../config');
const { animeImage } = require('../lib/anime-pack');
const { pick, pct } = require('../lib/helpers');

async function getpp(m, sock) {
  const who = m.arg ? m.arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : (m.quoted?.key?.participant || m.sender);
  try {
    const pp = await sock.profilePictureUrl(who, 'image');
    return sock.sendMessage(m.chat, { image: { url: pp }, caption: '🖼️ Profile Picture' }, { quoted: m });
  } catch { return m.reply('❌ DP nahi mili ya private hy.'); }
}

async function mee(m, sock) {
  return m.reply(`🪞 *${m.pushname} fact:* ${pick(['Tum ek hi jaisa nahi ho 🔥', 'Tumhari vibe unique hy ✨', 'Tum main-character material ho 🎬', 'Tumse bara dimag nahi dekha 🧠'])} (${pct(60, 100)}/100)`);
}

async function gpass(m, sock) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  const len = 16;
  const pass = Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return m.reply(`🔐 *Strong Password:*\n\n\`\`\`${pass}\`\`\`\n\n_(kisi ko na batana 😄)_`);
}

async function animeN(m, sock) {
  const img = animeImage();
  if (!img) return m.reply('❌ Image pack mojood nahi.');
  return sock.sendMessage(m.chat, { image: { url: img }, caption: `🌸 ${config.BOT_NAME}` }, { quoted: m });
}

async function unban(m, sock) {
  return m.reply('✅ Koi user banned nahi hy — sab free hain.');
}

module.exports.commands = [
  { name: 'getpp', desc: 'Kisi ki DP dekho (reply/number)', category: 'OTHER', handler: getpp },
  { name: 'mee', desc: 'Tumhari random fact', category: 'OTHER', handler: mee },
  { name: 'srepo', desc: 'Bot ka source repo', category: 'OTHER', handler: (m) => m.reply(`🗂️ *SAQI-MD Source:*\nhttps://github.com/badb54880-spec/SAQI-MD`) },
  { name: 'gpass', desc: 'Strong password banao', category: 'OTHER', handler: gpass },
  ...['anime1', 'anime2', 'anime3', 'anime4', 'anime5'].map(n => ({ name: n, desc: 'Random anime image', category: 'OTHER', handler: animeN })),
  ...Array.from({ length: 100 }, (_, i) => ({ name: `unban${i}`, desc: 'Unban check', category: 'OTHER', handler: unban })),
];
