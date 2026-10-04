/* SAQI-MD — MAIN: menu, ping, owner card, githubstalk, fetch, anime
 * (alive/uptime UTILITY me hain — JAWAD sequence ke mutabiq)
 */
const config = require('../config');
const { animeImage } = require('../lib/anime-pack');
const { fmtUptime } = require('../lib/functions');

const startAt = Date.now();

// category cache — registry boot ke baad static, dobara scan nahi karna
let __cats = null;
function collectCommands() {
  if (__cats) return __cats;
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
  __cats = cats;
  return cats;
}

const MENU_PER_PAGE = 220;
function catBody(cat, page) {
  const list = collectCommands()[cat] || [];
  const pages = Math.ceil(list.length / MENU_PER_PAGE);
  page = Math.max(1, Math.min(page || 1, pages));
  const slice = list.slice((page - 1) * MENU_PER_PAGE, page * MENU_PER_PAGE);
  let b = `\`\`\`\n${slice.map(c => '. ' + c.name).join('\n')}\`\`\``;
  if (pages > 1) b += `\n▸ Page ${page}/${pages} — .menu ${cat.toLowerCase()} ${page + 1}`;
  return b;
}

async function handler(m, sock) {
  switch (m.command) {
    case 'menu':
    case 'help': {
      const cats = collectCommands();
      const total = Object.values(cats).reduce((a, c) => a + c.length, 0);
      if (!m.arg) {
        // NAYA FONT: saaf monospace index — poora list ek message me nahi (13k commands)
        const idx = Object.keys(cats).sort()
          .map(cat => `◆ ${cat} — ${cats[cat].length}`)
          .join('\n');
        const txt = `╭─〔 *${config.BOT_NAME}* 〕─────⊷\n` +
          `┊ ✦ Owner: ${config.OWNER_NAME}\n` +
          `┊ ✦ Commands: ${total}\n` +
          `┊ ✦ Uptime: ${fmtUptime(Math.floor((Date.now() - startAt) / 1000))}\n` +
          `┊ ✦ Prefix: "${config.PREFIX}"\n` +
          `╰──────────────────⊷\n\n` +
          `📚 *CATEGORIES*\n${idx}\n\n` +
          `▸ Category ki commands: ${config.PREFIX}menu <naam>\n` +
          `▸ Har command ki detail: ${config.PREFIX}details <naam>\n\n` +
          `> *© Powered by ${config.OWNER_NAME}*`;
        return m.reply(txt);
      }
      // .menu <category> [page]
      const parts = m.arg.trim().split(/\s+/);
      const want = parts[0].toUpperCase();
      const cat = Object.keys(cats).find(c => c === want || c.replace(/\s+/g, '') === want);
      if (!cat) {
        const matches = Object.keys(cats).filter(c => c.includes(want));
        return m.reply(`❌ Category "${parts[0]}" nahi mili.${matches.length ? `\nKya matlab tha: ${matches.join(', ')}` : ''}\nSab dekhne ke liye: ${config.PREFIX}menu`);
      }
      const body = catBody(cat, parseInt(parts[1]) || 1);
      const count = cats[cat].length;
      return m.reply(`╭─〔 *${cat}* 〕─ ${count} commands ─⊷\n${body}\n> ${config.BOT_NAME}`);
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
      const img = animeImage();
      if (!img) return m.reply('❌ Image pack mojood nahi.');
      return sock.sendMessage(m.chat, { image: { url: img }, caption: `🌸 ${config.BOT_NAME}` }, { quoted: m });
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
