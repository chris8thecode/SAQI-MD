/* SAQI-MD — ANIME: waifu.pics / dog.ceo random images */
const config = require('../config');
const { animeImage } = require('../lib/anime-pack');

const SOURCES = { garl: 1, waifu: 1, neko: 1, megumin: 1, maid: 1, awoo: 1 };

async function handler(m, sock) {
  if (!SOURCES[m.command]) return;
  const img = animeImage();
  if (!img) return m.reply('❌ Image pack mojood nahi.');
  await sock.sendMessage(m.chat, { image: { url: img }, caption: `🌸 *${m.command.toUpperCase()}* — ${config.BOT_NAME}` }, { quoted: m });
}

module.exports.commands = Object.keys(SOURCES).map(name => ({
  name, desc: `Random ${name} image`, category: 'ANIME', handler,
}));
