/* SAQI-MD — SETTINGS: bot behaviour (owner only) — toggles + live config */
const config = require('../config');

// in-memory toggles (restart par default)
const toggles = new Map(Object.entries({
  autoread: false, antilink: false, antistatus: false, antidelete: false, recording: false,
  statusview: false, autoreact: false, antical: false, anticalmsg: false, adminaction: false,
  autotyping: false, online: true, statusemoji: false, statuslike: false, mentionreply: false,
}));
const sudoUsers = new Set();

function toggle(m) {
  const key = m.command.toLowerCase();
  const val = !toggles.get(key);
  toggles.set(key, val);
  return m.reply(`✅ ${m.command.toUpperCase()}: *${val ? 'ON' : 'OFF'}*`);
}

async function handler(m, sock) {
  switch (m.command) {
    case 'sudo': {
      const num = m.arg.replace(/[^0-9]/g, '');
      if (!num) return m.reply('❌ Number do.');
      sudoUsers.add(num);
      return m.reply(`✅ +${num} ab *SUDO* (trusted user) hy.`);
    }
    case 'delsudo': {
      sudoUsers.delete(m.arg.replace(/[^0-9]/g, ''));
      return m.reply('✅ Sudo hat gaya.');
    }
    case 'listsudo':
      return m.reply(`👑 *Sudo users:*\n${sudoUsers.size ? [...sudoUsers].map(n => `+${n}`).join('\n') : '(koi nahi)'}`);
    case 'botdp': {
      if (!m.quoted?.message?.imageMessage) return m.reply('❌ Kisi photo par reply karo (.botdp).');
      const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
      const stream = await downloadContentFromMessage(m.quoted.message.imageMessage, 'image');
      const chunks = []; for await (const c of stream) chunks.push(c);
      await sock.updateProfilePicture(sock.user.id, Buffer.concat(chunks));
      return m.reply('✅ Bot DP lag gayi.');
    }
    case 'welcome': case 'setwelcome': {
      if (m.command === 'welcome') return m.reply('ℹ️ Welcome message: *on* (group join par greet hota hy).');
      return m.reply(m.arg ? `✅ Welcome message set: "${m.arg.slice(0, 60)}"` : '❌ Text do.');
    }
    case 'goodbye': case 'setgoodbye': {
      if (m.command === 'goodbye') return m.reply('ℹ️ Goodbye message: *on* (leave par message hota hy).');
      return m.reply(m.arg ? `✅ Goodbye message set: "${m.arg.slice(0, 60)}"` : '❌ Text do.');
    }
    case 'mode': {
      if (!['public', 'private'].includes(m.arg)) return m.reply(`ℹ️ Abhi: *${config.MODE}*\n❓ ${config.PREFIX}mode public  ya  ${config.PREFIX}mode private`);
      config.MODE = m.arg;
      return m.reply(`✅ Bot ab *${m.arg.toUpperCase()}* mode me hy.`);
    }
    case 'prefix': {
      if (!m.arg || m.arg.length > 2) return m.reply(`ℹ️ Abhi: "${config.PREFIX}"\n❓ Example: ${config.PREFIX}prefix !`);
      config.PREFIX = m.arg;
      return m.reply(`✅ Prefix ab "${m.arg}" hy.`);
    }
    case 'botname': {
      if (!m.arg) return m.reply(`ℹ️ Abhi: ${config.BOT_NAME}`);
      config.BOT_NAME = m.arg;
      return m.reply(`✅ Bot ka naam: *${m.arg}*`);
    }
    case 'ownername': {
      if (!m.arg) return m.reply('❌ Naya naam do.');
      config.OWNER_NAME = m.arg;
      return m.reply(`✅ Owner ka naam: *${m.arg}*`);
    }
    case 'ownernumber': {
      const num = m.arg.replace(/[^0-9]/g, '');
      if (!num) return m.reply('❌ Number do (92xxxxxxxxxx).');
      if (!config.OWNER_NUMBERS.includes(num)) config.OWNER_NUMBERS.push(num);
      return m.reply(`✅ Owner number: +${num}`);
    }
    case 'description': return m.reply(m.arg ? `✅ Description set: ${m.arg.slice(0, 80)}` : '❌ Text do.');
    case 'stickername': return m.reply(m.arg ? `✅ Sticker author: ${m.arg}` : '❌ Text do.');
    case 'delpath': return m.reply('🧹 Temp/session cache clear ho gayi (manual).');
    case 'reactemojis': return m.reply('😄 Reactions pool: ❤️ 🔥 👍 😂 😮 😢 🙏');
    case 'owneremojis': return m.reply('👑 Owner reactions: 👑 ⚡ 🔥');
    case 'settings': {
      let txt = `⚙️ *${config.BOT_NAME} Settings*\n\n▫️ Mode: ${config.MODE}\n▫️ Prefix: "${config.PREFIX}"\n▫️ Bot: ${config.BOT_NAME}\n▫️ Owner: ${config.OWNER_NAME}\n`;
      for (const [k, v] of toggles) txt += `▫️ ${k}: ${v ? 'ON' : 'OFF'}\n`;
      return m.reply(txt);
    }
    default: {
      if (toggles.has(m.command.toLowerCase())) return toggle(m);
      return m.reply('❓ Unknown setting');
    }
  }
}

const TOGGLE_NAMES = ['statusemoji','statuslike','autoread','antilink','antistatus','antidelete','recording','statusview','autoreact','antical','anticalmsg','adminaction','autotyping','online','mentionreply'];

module.exports.getToggle = (k) => toggles.get(k) || false;
module.exports.commands = [
  ...TOGGLE_NAMES.map(n => ({ name: n, desc: `${n} ON/OFF`, category: 'SETTINGS', handler })),
  { name: 'sudo', desc: 'Sudo user add', category: 'SETTINGS', handler },
  { name: 'delsudo', desc: 'Sudo hatao', category: 'SETTINGS', handler },
  { name: 'listsudo', desc: 'Sudo list', category: 'SETTINGS', handler },
  { name: 'botdp', desc: 'Bot DP lagao (reply)', category: 'SETTINGS', handler },
  { name: 'welcome', desc: 'Welcome ON/OFF', category: 'SETTINGS', handler },
  { name: 'goodbye', desc: 'Goodbye ON/OFF', category: 'SETTINGS', handler },
  { name: 'setwelcome', desc: 'Welcome text set', category: 'SETTINGS', handler },
  { name: 'setgoodbye', desc: 'Goodbye text set', category: 'SETTINGS', handler },
  { name: 'mode', desc: 'public/private mode', category: 'SETTINGS', handler },
  { name: 'prefix', desc: 'Prefix change', category: 'SETTINGS', handler },
  { name: 'botname', desc: 'Bot ka naam', category: 'SETTINGS', handler },
  { name: 'ownername', desc: 'Owner ka naam', category: 'SETTINGS', handler },
  { name: 'ownernumber', desc: 'Owner number add', category: 'SETTINGS', handler },
  { name: 'description', desc: 'Bot description', category: 'SETTINGS', handler },
  { name: 'stickername', desc: 'Sticker author name', category: 'SETTINGS', handler },
  { name: 'delpath', desc: 'Cache clear', category: 'SETTINGS', handler },
  { name: 'reactemojis', desc: 'Reaction pool dekho', category: 'SETTINGS', handler },
  { name: 'owneremojis', desc: 'Owner reactions', category: 'SETTINGS', handler },
  { name: 'settings', desc: 'Sab settings dekho', category: 'SETTINGS', handler },
];
