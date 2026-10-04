/* SAQI-MD   UTILITY: alive, uptime, convert, cpp, structure, raw2, id, getlid, praytime, caption, url, getimage */
const config = require('../../config');
const { fmtUptime } = require('../lib/functions');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const startAt = Date.now();

async function handler(m, sock) {
  switch (m.command) {
    case 'alive':
      return m.reply(
        `✅ *${config.BOT_NAME}* ZINDA hy! 🔥\n⏱️ Uptime: ${fmtUptime(Math.floor((Date.now() - startAt) / 1000))}\n👑 Owner: ${config.OWNER_NAME}\n\nType ${config.PREFIX}menu for commands.`,
      );
    case 'uptime':
      return m.reply(
        `⏱️ Bot *${fmtUptime(Math.floor((Date.now() - startAt) / 1000))}* se chal raha hy.`,
      );
    case 'convert': {
      // currency + unit convert: .convert 100 usd pkr | .convert 5 km m
      const parts = m.arg.split(/\s+/);
      if (parts.length < 3)
        return m.reply(
          `❌ Format: ${config.PREFIX}convert 100 usd pkr  |  ${config.PREFIX}convert 5 km m`,
        );
      const [amt, from, to] = [
        parseFloat(parts[0]),
        parts[1].toLowerCase(),
        parts[2].toLowerCase(),
      ];
      if (isNaN(amt)) return m.reply('❌ Amount number hona chahiye.');
      const LEN = { mm: 1, cm: 10, m: 1000, km: 1000000, inch: 25.4, ft: 304.8, mile: 1609344 };
      const MASS = { mg: 1, g: 1000, kg: 1000000, ton: 1000000000, lb: 453592 };
      if (LEN[from] && LEN[to])
        return m.reply(`📐 *${amt} ${from} = ${(amt * LEN[from]) / LEN[to]} ${to}*`);
      if (MASS[from] && MASS[to])
        return m.reply(`⚖️ *${amt} ${from} = ${(amt * MASS[from]) / MASS[to]} ${to}*`);
      try {
        const r = await fetch(
          `https://api.frankfurter.app/latest?amount=${amt}&from=${from.toUpperCase()}&to=${to.toUpperCase()}`,
        ).then((r) => r.json());
        if (r.rates && r.rates[to.toUpperCase()] !== undefined) {
          return m.reply(
            `💱 *${amt} ${from.toUpperCase()} = ${r.rates[to.toUpperCase()]} ${to.toUpperCase()}*`,
          );
        }
      } catch {}
      return m.reply(
        '❌ Ye conversion support nahi (currency: usd/eur/pkr/gbp... units: km/m/kg/lb...).',
      );
    }
    case 'cpp': {
      const fs = require('fs');
      const cmds = fs.readdirSync(path.join(__dirname)).filter((x) => x.endsWith('.js'));
      return m.reply(
        `📊 *Bot Stats*\n\n▫️ Command files: ${cmds.length}\n▫️ Uptime: ${fmtUptime(Math.floor((Date.now() - startAt) / 1000))}\n▫️ RAM: ${(process.memoryUsage().heapUsed / 1048576).toFixed(1)} MB\n▫️ Node: ${process.version}`,
      );
    }
    case 'structure': {
      return m.reply(
        `📂 *${config.BOT_NAME} structure*\n\n\`\`\`\nsaqi-md/\n├─ worker.js      (24/7 bot)\n├─ server.js      (portal API)\n├─ config.js\n├─ src/\n│  ├─ commands/\n│  ├─ lib/\n│  ├─ assets/\n│  └─ public/\n├─ api/           (Vercel functions)\n└─ deploy/\n\`\`\``,
      );
    }
    case 'raw2': {
      if (!m.quoted) return m.reply('❌ Kisi message ko reply karo.');
      return m.reply(
        `🔍 *Raw message:*\n\n\`\`\`${JSON.stringify(m.quoted, null, 2).slice(0, 900)}\`\`\``,
      );
    }
    case 'id': {
      const who = m.quoted ? m.quoted.key.participant || m.quoted.key.remoteJid : m.sender;
      return m.reply(`🆔 *ID:* ${who}\n▫️ Chat: ${m.chat}`);
    }
    case 'getlid': {
      const who = m.quoted ? m.quoted.key.participant || m.sender : m.sender;
      return m.reply(`🔖 *LID/JID:* ${who}\n▫️ User: ${who.split('@')[0]}@s.whatsapp.net`);
    }
    case 'praytime': {
      const city = m.arg || 'Layyah';
      try {
        const r = await fetch(
          `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Pakistan&method=1`,
        ).then((r) => r.json());
        if (r.code !== 200) return m.reply('❌ City nahi mili.');
        const t = r.data.timings;
        return m.reply(
          `🕌 *Prayer Times   ${city}*\n\n🌅 Fajr: ${t.Fajr}\n☀️ Dhuhr: ${t.Dhuhr}\n🌤️ Asr: ${t.Asr}\n🌇 Maghrib: ${t.Maghrib}\n🌃 Isha: ${t.Isha}`,
        );
      } catch {
        return m.reply('❌ Prayer API down hy.');
      }
    }
    case 'caption': {
      if (!m.quoted?.message?.imageMessage)
        return m.reply('❌ Kisi photo par reply karo aur caption likho.');
      const stream = await downloadContentFromMessage(m.quoted.message.imageMessage, 'image');
      const chunks = [];
      for await (const c of stream) chunks.push(c);
      return sock.sendMessage(
        m.chat,
        { image: Buffer.concat(chunks), caption: m.arg || '🖼️' },
        { quoted: m },
      );
    }
    case 'url': {
      // media -> catbox (keyless upload)
      const qm =
        m.quoted?.message?.imageMessage ||
        m.quoted?.message?.videoMessage ||
        m.quoted?.message?.audioMessage ||
        m.quoted?.message?.documentMessage;
      if (!qm) return m.reply('❌ Kisi media par reply karo.');
      const type = qm.imageMessage ? 'image' : qm.videoMessage ? 'video' : 'audio';
      const stream = await downloadContentFromMessage(
        qm.imageMessage || qm.videoMessage || qm.audioMessage || qm.documentMessage,
        type,
      );
      const chunks = [];
      for await (const c of stream) chunks.push(c);
      const buf = Buffer.concat(chunks);
      const fd = new FormData();
      fd.append('fileToUpload', new Blob([buf]), 'media.jpg');
      fd.append('reqtype', 'fileupload');
      const r = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: fd });
      const link = await r.text();
      if (!link.startsWith('http')) throw new Error('upload fail');
      return m.reply(`🔗 *Direct link:*\n\n${link}`);
    }
    case 'getimage': {
      if (!/^https?:\/\//.test(m.arg))
        return m.reply(`❌ Image URL do. Example: ${config.PREFIX}getimage https://...`);
      return sock.sendMessage(
        m.chat,
        { image: { url: m.arg }, caption: '🖼️ ' + config.BOT_NAME },
        { quoted: m },
      );
    }
  }
}

const path = require('path');

module.exports.commands = [
  { name: 'alive', desc: 'Bot zinda hy?', category: 'UTILITY', handler },
  { name: 'uptime', desc: 'Uptime dekho', category: 'UTILITY', handler },
  { name: 'convert', desc: 'Currency/unit convert', category: 'UTILITY', handler },
  { name: 'cpp', desc: 'Bot stats', category: 'UTILITY', handler },
  { name: 'structure', desc: 'Bot structure', category: 'UTILITY', handler },
  { name: 'raw2', desc: 'Raw message JSON', category: 'UTILITY', handler },
  { name: 'id', desc: 'User/chat ID', category: 'UTILITY', handler },
  { name: 'getlid', desc: 'LID/JID dekho', category: 'UTILITY', handler },
  { name: 'praytime', desc: 'Namaz ke waqt', category: 'UTILITY', handler },
  { name: 'caption', desc: 'Photo par caption', category: 'UTILITY', handler },
  { name: 'url', desc: 'Media → direct link', category: 'UTILITY', handler },
  { name: 'getimage', desc: 'URL se image bhejo', category: 'UTILITY', handler },
];
