/* SAQI-MD — SETTING: WhatsApp profile/privacy settings (bot ke apne account par) */
const config = require('../config');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function downloadBuf(msg, type) {
  const stream = await downloadContentFromMessage(msg, type);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function handler(m, sock) {
  switch (m.command) {
    case 'privacy': case 'getprivacy': {
      const p = await sock.fetchPrivacySettings?.() || {};
      return m.reply(`🔒 *Privacy Settings*\n\n▫️ Last seen: ${p.last_seen || p.lastseen || '-'}\n▫️ Profile photo: ${p.profile_pic || '-'}\n▫️ About: ${p.about || '-'}\n▫️ Status: ${p.status || '-'}\n▫️ Groups add: ${p.group_add || p.groupadd || '-'}`);
    }
    case 'blocklist': {
      const res = await sock.fetchBlocklist?.();
      const list = res || [];
      return m.reply(`🚫 *Blocked (${list.length}):*\n${list.slice(0, 30).map((b, i) => `${i + 1}. ${b.split('@')[0]}`).join('\n') || '(koi nahi)'}`);
    }
    case 'getbio': {
      const num = (m.quoted ? m.quoted.key.participant : (m.arg ? m.arg.replace(/[^0-9]/g, '') : sock.user.id)).replace(/[^0-9]/g, '');
      try {
        const s = await sock.fetchStatus(num + '@s.whatsapp.net');
        return m.reply(`📝 *Bio (+${num}):*\n${s[0]?.status || s?.status || '-'}`);
      } catch { return m.reply('❌ Bio nahi mili.'); }
    }
    case 'updatebio': {
      if (!m.arg) return m.reply('❌ Nayi bio likho.');
      await sock.updateProfileStatus(m.arg);
      return m.reply('✅ Bio update ho gayi.');
    }
    case 'setname': {
      if (!m.arg) return m.reply('❌ Naya naam do.');
      await sock.updateProfileName(m.arg);
      return m.reply('✅ Naam update ho gaya.');
    }
    case 'setppall': {
      if (!m.quoted?.message?.imageMessage) return m.reply('❌ Kisi photo par reply karo.');
      const buf = await downloadBuf(m.quoted.message.imageMessage, 'image');
      await sock.updateProfilePicture(sock.user.id, buf);
      return m.reply('✅ Profile picture update ho gayi.');
    }
    case 'setonline': {
      return m.reply('ℹ️ Bot connected hone par automatically online show hota hy.');
    }
    case 'groupsprivacy': {
      const val = (m.arg || '').toLowerCase();
      if (!['all', 'contacts', 'contact_blacklist', 'known', 'none'].includes(val)) {
        return m.reply(`ℹ️ Groups add permission. Example: ${config.PREFIX}groupsprivacy contacts\n(all / contacts / contact_blacklist / known / none)`);
      }
      await sock.updateApiOfPrivacy?.('groupadd', val) || await sock.updateGroupsPrivacy?.(val);
      return m.reply(`✅ Groups add privacy: *${val}*`);
    }
  }
}

module.exports.commands = [
  { name: 'privacy', desc: 'Privacy settings dekho', category: 'SETTING', handler },
  { name: 'blocklist', desc: 'Blocked numbers', category: 'SETTING', handler },
  { name: 'getbio', desc: 'Kisi ki bio (reply/number)', category: 'SETTING', handler },
  { name: 'updatebio', desc: 'Bot ki bio badlo', category: 'SETTING', handler },
  { name: 'setname', desc: 'Bot ka naam badlo', category: 'SETTING', handler },
  { name: 'setppall', desc: 'Bot ki DP lagao (reply)', category: 'SETTING', handler },
  { name: 'setonline', desc: 'Online status info', category: 'SETTING', handler },
  { name: 'groupsprivacy', desc: 'Group add privacy', category: 'SETTING', handler },
  { name: 'getprivacy', desc: 'Privacy settings dekho', category: 'SETTING', handler },
];
