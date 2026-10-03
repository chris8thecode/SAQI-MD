/* SAQI-MD — OWNER: vv/vv2/vv3 (view-once), forward, block, status post, profile, pair, follow */
const config = require('../config');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function downloadBuf(msg, type) {
  const stream = await downloadContentFromMessage(msg, type);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function vv(m, sock) {
  const q = m.quoted;
  if (!q) return m.reply(`❌ View-once photo/video/audio par *reply* karo aur ${config.PREFIX}${m.command} likho.`);
  const msg = q.message;
  const inner = msg?.imageMessage || msg?.videoMessage || msg?.audioMessage;
  if (!inner) return m.reply('❌ Ye media message nahi hy. Photo/video ko reply karo.');
  const type = msg.imageMessage ? 'image' : msg.videoMessage ? 'video' : 'audio';
  const buf = await downloadBuf(inner, type);
  const cap = `🔓 *View-once unlocked — ${config.BOT_NAME}*`;
  if (type === 'image') await sock.sendMessage(m.chat, { image: buf, caption: cap }, { quoted: m });
  else if (type === 'video') await sock.sendMessage(m.chat, { video: buf, caption: cap }, { quoted: m });
  else await sock.sendMessage(m.chat, { audio: buf, mimetype: inner.mimetype || 'audio/mpeg' }, { quoted: m });
}

async function handler(m, sock) {
  switch (m.command) {
    case 'delete': {
      if (!m.quoted) return m.reply('❌ Kisi message ko reply karo.');
      return sock.sendMessage(m.chat, { delete: m.quoted.key });
    }
    case 'forward': {
      if (!m.quoted) return m.reply('❌ Kisi message ko reply karo.');
      if (!m.arg) return m.reply(`❌ JID/number do. Example: ${config.PREFIX}forward 923xxxxxxxxxx`);
      const jid = m.arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.copyNForward(jid, m.quoted.message, true).catch(() => sock.forwardMessage(jid, m.quoted, { readViewOnce: true }));
      return m.reply(`✅ Forward ho gaya -> +${jid.split('@')[0]}`);
    }
    case 'leave': {
      await m.reply('👋 Bot ja raha hy... Allah Hafiz!');
      return setTimeout(() => (m.isGroup ? sock.groupLeave(m.chat) : sock.logout()).catch(() => {}), 1500);
    }
    case 'hidetag': {
      if (!m.isGroup) return m.reply('❌ Ye group me chalti hy.');
      const meta = await sock.groupMetadata(m.chat);
      const mentions = meta.participants.map(p => p.id);
      return sock.sendMessage(m.chat, { text: m.arg || '📢', mentions }, { quoted: m });
    }
    case 'ik': {
      const sessions = Object.keys(require('./../lib/mongoSession')).length ? 'mongo' : 'file';
      return m.reply(`ℹ️ *${config.BOT_NAME} info*\n▫️ Mode: ${sessions}\n▫️ Owner: ${config.OWNER_NAME}\n▫️ Prefix: ${config.PREFIX}`);
    }
    case 'block': case 'unblock': {
      const num = (m.quoted ? m.quoted.key.participant : m.arg).replace(/[^0-9]/g, '');
      if (!num) return m.reply('❌ Number do ya reply karo.');
      await sock.updateBlockStatus(num + '@s.whatsapp.net', m.command === 'block' ? 'block' : 'unblock');
      return m.reply(`${m.command === 'block' ? '🚫' : '✅'} +${num} ${m.command}ed.`);
    }
    case 'pair': {
      const num = m.arg.replace(/[^0-9]/g, '');
      if (!num) return m.reply(`❌ Number do. Example: ${config.PREFIX}pair 923xxxxxxxxxx`);
      const code = await sock.requestPairingCode(num);
      return m.reply(`🔗 *Pairing Code for +${num}:*\n\n\`\`\`${code}\`\`\``);
    }
    case 'follow': case 'follow2': {
      if (!m.arg) return m.reply('❌ Channel JID/link do.');
      const jid = m.arg.includes('@newsletter') ? m.arg : m.arg.split('/')[1] ? m.arg.split('/')[1] + '@newsletter' : m.arg + '@newsletter';
      await sock.newsletterFollow(jid);
      return m.reply(`✅ Channel follow ho gaya: ${jid}`);
    }
    case 'unfollow': case 'unfollow2': {
      if (!m.arg) return m.reply('❌ Channel JID do.');
      const jid = m.arg.includes('@newsletter') ? m.arg : m.arg + '@newsletter';
      await sock.newsletterUnfollow(jid);
      return m.reply(`✅ Channel unfollow ho gaya: ${jid}`);
    }
    case 'status': case 'status2': {
      const qm = m.quoted?.message;
      if (qm?.imageMessage || qm?.videoMessage) {
        const isImg = !!qm.imageMessage;
        const buf = await downloadBuf(isImg ? qm.imageMessage : qm.videoMessage, isImg ? 'image' : 'video');
        await sock.sendMessage('status@broadcast', isImg ? { image: buf, caption: m.arg || '' } : { video: buf, caption: m.arg || '' });
        return m.reply('✅ Status laga diya.');
      }
      if (m.arg) {
        await sock.sendMessage('status@broadcast', { text: m.arg });
        return m.reply('✅ Text status laga diya.');
      }
      return m.reply('❌ Text likho ya media par reply karo.');
    }
    case 'fullpp': {
      if (!m.quoted?.message?.imageMessage) return m.reply('❌ Kisi photo par reply karo.');
      const buf = await downloadBuf(m.quoted.message.imageMessage, 'image');
      await sock.updateProfilePicture(sock.user.id, buf);
      return m.reply('✅ Profile picture update ho gayi.');
    }
    default: return m.reply('❓ Unknown owner command');
  }
}

module.exports.commands = [
  { name: 'vv3', desc: 'View-once unlock', category: 'OWNER', handler: vv },
  { name: 'vv', desc: 'View-once unlock', category: 'OWNER', handler: vv },
  { name: 'vv2', desc: 'View-once unlock', category: 'OWNER', handler: vv },
  { name: 'viewonce', desc: 'View-once unlock', category: 'OWNER', handler: vv },
  // sticker/s TOOLS me hyn (public) — duplicate avoid
  { name: 'delete', desc: 'Message delete (reply)', category: 'OWNER', handler },
  { name: 'forward', desc: 'Message forward', category: 'OWNER', handler },
  { name: 'leave', desc: 'Group/chat chhodo', category: 'OWNER', handler },
  { name: 'hidetag', desc: 'Sabko tag (chupke se)', category: 'OWNER', handler },
  { name: 'ik', desc: 'Bot info', category: 'OWNER', handler },
  { name: 'block', desc: 'Number block', category: 'OWNER', handler },
  { name: 'unblock', desc: 'Number unblock', category: 'OWNER', handler },
  { name: 'pair', desc: 'Pairing code banao', category: 'OWNER', handler },
  { name: 'follow', desc: 'Channel follow', category: 'OWNER', handler },
  { name: 'follow2', desc: 'Channel follow', category: 'OWNER', handler },
  { name: 'unfollow', desc: 'Channel unfollow', category: 'OWNER', handler },
  { name: 'unfollow2', desc: 'Channel unfollow', category: 'OWNER', handler },
  { name: 'status', desc: 'Status lagao', category: 'OWNER', handler },
  { name: 'status2', desc: 'Status lagao', category: 'OWNER', handler },
  { name: 'fullpp', desc: 'Bot ki DP lagao', category: 'OWNER', handler },
];
