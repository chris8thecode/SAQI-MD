/* SAQI-MD — MAIN: menu, ping, owner card, githubstalk, fetch, anime
 * (alive/uptime UTILITY me hain — JAWAD sequence ke mutabiq)
 */
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
      let txt = `╭┈───〔 *${config.BOT_NAME}* 〕┈───⊷\n` +
        `├✦ *Owner:* ${config.OWNER_NAME}\n` +
        `├✦ *Commands:* ${Object.values(cats).reduce((a, c) => a + c.length, 0)}\n` +
        `├✦ *Uptime:* ${fmtUptime(Math.floor((Date.now() - startAt) / 1000))}\n` +
        `├✦ *Prefix:* "${config.PREFIX}"\n` +
        `├✦ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: config.TIMEZONE })}\n` +
        `╰───────────────────⊷\n`;
      for (const cat of ['AI','ANIME','AUDIO','DOWNLOAD','FUN','GROUP','LOGO','MAIN','OTHER','OWNER','SEARCH','SETTING','SETTINGS','SOUND','TOOLS','UTILITY']) {
        if (!cats[cat]) continue;
        txt += `\n\`『 ${cat} 』\`\n╭───────────────────⊷\n`;
        txt += cats[cat].map(c => `*┋ ⬡ ${c.name}*`).join('\n');
        txt += `\n╰───────────────────⊷`;
      }
      txt += `\n\n> *© Powered by ${config.OWNER_NAME}*`;
      return m.reply(txt);
    }

    case 'ping':
    case 'speed': {
      const t0 = Date.now();
      const sent = await sock.sendMessage(m.chat, { text: '🏓 ...' }, { quoted: m });
      const latency = Date.now() - t0;
      await sock.sendMessage(m.chat, { text: `🏓 *Pong!*\n⚡ Speed: *${latency}ms*\n⏱️ Uptime: ${fmtUptime(Math.floor((Date.now() - startAt) / 1000))}`, edit: sent.key });
      return;
    }
    case 'ping2': {
      const t0 = Date.now();
      await m.reply(`🏓 *Pong v2!*\n⚡ ${Date.now() - t0}ms (approx)`);
      return;
    }
    case 'owner': {
      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${config.OWNER_NAME}\nTEL;type=CELL;type=VOICE;waid=${config.OWNER_NUMBERS[0] || ''}:+${config.OWNER_NUMBERS[0] || ''}\nEND:VCARD`;
      return sock.sendMessage(m.chat, { contacts: { displayName: config.OWNER_NAME, contacts: [{ vcard }] } }, { quoted: m });
    }
    case 'githubstalk': {
      if (!m.arg) return m.reply(`❌ Username do. Example: ${config.PREFIX}githubstalk saqibiqbaltesting-ai`);
      const r = await fetch(`https://api.github.com/users/${encodeURIComponent(m.arg)}`).then(r => r.json());
      if (r.message) return m.reply('❌ User nahi mila.');
      return m.reply(`👤 *${r.name || r.login}*\n🔹 Username: ${r.login}\n📝 Bio: ${r.bio || '-'}\n📦 Public repos: ${r.public_repos}\n👥 Followers: ${r.followers}\n➡️ Following: ${r.following}\n📍 Location: ${r.location || '-'}\n🔗 ${r.html_url}`);
    }
    case 'fetch': {
      if (!/^https?:\/\//.test(m.arg)) return m.reply(`❌ URL do. Example: ${config.PREFIX}fetch https://example.com`);
      const res = await fetch(m.arg, { redirect: 'follow' });
      const body = (await res.text()).slice(0, 800);
      return m.reply(`🌐 *FETCH*\n\n▫️ Status: ${res.status} ${res.statusText}\n▫️ Content-Type: ${res.headers.get('content-type') || '-'}\n\n\`\`\`${body.replace(/```/g, '')}\`\`\``);
    }
    case 'anime': {
      try {
        const r = await fetch('https://api.waifu.pics/sfw/waifu').then(r => r.json());
        return sock.sendMessage(m.chat, { image: { url: r.url }, caption: `🌸 ${config.BOT_NAME}` }, { quoted: m });
      } catch { return m.reply('❌ API down hy.'); }
    }
  }
}

module.exports.commands = [
  { name: 'menu', desc: 'Poora menu', category: 'MAIN', handler },
  { name: 'help', desc: 'Poora menu', category: 'MAIN', handler },
  { name: 'ping', desc: 'Bot speed', category: 'MAIN', handler },
  { name: 'ping2', desc: 'Speed test v2', category: 'MAIN', handler },
  { name: 'speed', desc: 'Speed test', category: 'MAIN', handler, hidden: true },
  { name: 'owner', desc: 'Owner ka card', category: 'MAIN', handler },
  { name: 'githubstalk', desc: 'GitHub user info', category: 'MAIN', handler },
  { name: 'fetch', desc: 'URL fetch', category: 'MAIN', handler },
  { name: 'anime', desc: 'Random anime image', category: 'MAIN', handler },
];
