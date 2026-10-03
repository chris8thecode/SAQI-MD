/* SAQI-MD — GENERAL: .menu .help .ping .speed .alive */
const config = require('../config');
const { fmtUptime } = require('../lib/functions');

const startAt = Date.now();

// poora registry dobara parhta hy (menu ke liye) — path hamesha is file ke sath
function collectCommands() {
  const fs = require('fs');
  const path = require('path');
  const cats = {};
  for (const f of fs.readdirSync(__dirname).filter(x => x.endsWith('.js'))) {
    try {
      const mod = require(path.join(__dirname, f));
      for (const c of mod.commands) {
        if (c.hidden) continue;
        const cat = (c.category || 'GENERAL').toUpperCase();
        (cats[cat] = cats[cat] || []).push({ name: c.name, desc: c.desc || '' });
      }
    } catch {}
  }
  return cats;
}

async function handler(m, sock) {
  switch (m.command) {
    case 'menu':
    case 'help': {
      const cats = collectCommands();
      let txt = `╭─❖ *${config.BOT_NAME}* ❖─╮\n` +
        `│ 🤖 ${config.BOT_NAME} v${config.BOT_VERSION}\n` +
        `│ 👑 Owner: ${config.OWNER_NAME}\n` +
        `│ 🕒 ${new Date().toLocaleString('en-PK', { timeZone: config.TIMEZONE })}\n` +
        `│ ⚡ Prefix: "${config.PREFIX}"\n` +
        `╰────────────────────╯\n`;
      for (const [cat, cmds] of Object.entries(cats).sort()) {
        txt += `\n┌─「 *${cat}* 」\n`;
        txt += cmds.map(c => `│ ▹ ${config.PREFIX}${c.name}${c.desc ? ` — ${c.desc}` : ''}`).join('\n');
        txt += '\n└────────────────\n';
      }
      txt += `\n_*${config.BOT_NAME} — Powered by ${config.OWNER_NAME}*_`;
      return m.reply(txt);
    }

    case 'ping':
    case 'speed': {
      const t0 = Date.now();
      const sent = await sock.sendMessage(m.chat, { text: '🏓 ...' }, { quoted: m });
      const latency = Date.now() - t0;
      await sock.sendMessage(m.chat, {
        text: `🏓 *PONG!*\n\n⚡ Response: *${latency} ms*\n⏱️ Uptime: ${fmtUptime((Date.now() - startAt) / 1000)}\n📡 Status: Connected`,
        edit: sent.key,
      });
      return;
    }

    case 'alive': {
      return m.reply(
        `✅ *${config.BOT_NAME}* ZINDA HY! 🔥\n\n` +
        `⏱️ Uptime: ${fmtUptime((Date.now() - startAt) / 1000)}\n` +
        `⚙️ Commands: loaded\n` +
        `👑 Owner: ${config.OWNER_NAME}\n` +
        `🗄️ Session: ${config.MONGODB_URI ? 'MongoDB (persistent)' : 'Local file'}\n\n` +
        `Type ${config.PREFIX}menu for all commands.`
      );
    }
  }
}

module.exports.commands = [
  { name: 'menu', desc: 'Sari commands ki list', category: 'General', handler },
  { name: 'help', desc: 'Same as .menu', category: 'General', handler },
  { name: 'ping', desc: 'Bot speed check', category: 'General', handler },
  { name: 'speed', desc: 'Same as .ping', category: 'General', handler },
  { name: 'alive', desc: 'Bot status + uptime', category: 'General', handler },
];
