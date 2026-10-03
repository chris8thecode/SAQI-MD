/* SAQI-MD — ANIME: waifu.pics / dog.ceo random images */
const config = require('../config');
const { pick } = require('../lib/helpers');

const SOURCES = {
  garl: 'https://api.waifu.pics/sfw/waifu',
  waifu: 'https://api.waifu.pics/sfw/waifu',
  neko: 'https://api.waifu.pics/sfw/neko',
  megumin: 'https://api.waifu.pics/sfw/megumin',
  maid: 'https://api.waifu.pics/sfw/waifu',
  awoo: 'https://api.waifu.pics/sfw/awoo',
};

async function handler(m, sock) {
  const url = SOURCES[m.command];
  try {
    const r = await fetch(url).then(r => r.json());
    await sock.sendMessage(m.chat, { image: { url: r.url }, caption: `🌸 *${m.command.toUpperCase()}* — ${config.BOT_NAME}` }, { quoted: m });
  } catch (e) {
    await m.reply('❌ Image API down hy, thori dair baad try karo.');
  }
}

module.exports.commands = Object.keys(SOURCES).map(name => ({
  name, desc: `Random ${name} image`, category: 'ANIME', handler,
}));
