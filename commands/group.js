/* SAQI-MD — GROUP: group management (admins ke liye) */
const config = require('../config');
const { pick } = require('../lib/helpers');

const isAdmin = async (sock, jid, sender) => {
  const meta = await sock.groupMetadata(jid);
  const me = meta.participants.find(p => p.id === sender);
  return me && (me.admin === 'admin' || me.admin === 'superadmin');
};
const botIsAdmin = async (sock, jid) => {
  const meta = await sock.groupMetadata(jid);
  const meId = sock.user.id.split(':')[0];
  const me = meta.participants.find(p => p.id.startsWith(meId));
  return me && (me.admin === 'admin' || me.admin === 'superadmin');
};
const needAdmin = ['kick','promote','demote','mute','unmute','tagall','everyone','add','revoke','updategname','updategdesc','link','del','hidetag','tag','poll','end'];

async function handler(m, sock) {
  const { command, arg, quoted } = m;
  if (needAdmin.includes(command) && !await isAdmin(sock, m.chat, m.sender)) {
    return m.reply('❌ Ye command sirf *group admins* ke liye hy.');
  }

  const targetFrom = () => quoted ? (quoted.key.participant || quoted.key.remoteJid) : arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

  switch (command) {
    case 'tagall': case 'everyone': {
      const meta = await sock.groupMetadata(m.chat);
      const txt = arg ? `📢 *${arg}*\n\n` : '📢 *Attention Everyone*\n\n';
      const mentions = meta.participants.map(p => p.id);
      return sock.sendMessage(m.chat, { text: txt + mentions.map((p, i) => `${i + 1}. @${p.split('@')[0]}`).join('\n'), mentions }, { quoted: m });
    }
    case 'tag': case 'hidetag': {
      const meta = await sock.groupMetadata(m.chat);
      const mentions = meta.participants.map(p => p.id);
      return sock.sendMessage(m.chat, { text: arg || '📢', mentions }, { quoted: m });
    }
    case 'kick': {
      if (!quoted && !arg) return m.reply('❌ Kisi member ko reply karo ya number do.');
      const target = targetFrom();
      await sock.groupParticipantsUpdate(m.chat, [target], 'remove');
      return m.reply(`👢 @${target.split('@')[0]} ko nikal diya gaya.`);
    }
    case 'promote': {
      const target = targetFrom();
      await sock.groupParticipantsUpdate(m.chat, [target], 'promote');
      return m.reply(`👑 @${target.split('@')[0]} ab *ADMIN* hy!`);
    }
    case 'demote': {
      const target = targetFrom();
      await sock.groupParticipantsUpdate(m.chat, [target], 'demote');
      return m.reply(`⬇️ @${target.split('@')[0]} ab normal member hy.`);
    }
    case 'mute': case 'end': {
      if (!await botIsAdmin(sock, m.chat)) return m.reply('❌ Pehle bot ko group admin banao!');
      await sock.groupSettingUpdate(m.chat, 'announcement');
      return m.reply('🔇 Group ab *sirf admins* ke messages ke liye.');
    }
    case 'unmute': {
      if (!await botIsAdmin(sock, m.chat)) return m.reply('❌ Pehle bot ko group admin banao!');
      await sock.groupSettingUpdate(m.chat, 'not_announcement');
      return m.reply('🔊 Sab members ab message kar sakte hain.');
    }
    case 'link': case 'invite': {
      const code = await sock.groupInviteCode(m.chat);
      return m.reply(`🔗 *Group Link:*\nhttps://chat.whatsapp.com/${code}`);
    }
    case 'revoke': {
      await sock.groupRevokeInvite(m.chat);
      return m.reply('♻️ Purana link khatam, naya link ban gaya.');
    }
    case 'ginfo': case 'gcpp': {
      const meta = await sock.groupMetadata(m.chat);
      return m.reply(`👥 *${meta.subject}*\n\n🔹 Members: ${meta.participants.length}\n🔹 Created: ${new Date(meta.creation * 1000).toLocaleDateString()}\n🔹 Owner: @${(meta.owner || '').split('@')[0]}\n🔹 Description: ${meta.desc || '-'}`);
    }
    case 'gcstatus': case 'gcstatus2': {
      const meta = await sock.groupMetadata(m.chat);
      return m.reply(`⚙️ *Group Status*\n\n▫️ Naam: ${meta.subject}\n▫️ Members: ${meta.participants.length}\n▫️ Mode: ${meta.announce ? 'Sirf admins' : 'Sab'}\n▫️ Admins: ${meta.participants.filter(p => p.admin).length}`);
    }
    case 'updategname': {
      if (!arg) return m.reply('❌ Naya naam do.');
      await sock.groupUpdateSubject(m.chat, arg);
      return m.reply('✅ Group name update ho gaya.');
    }
    case 'updategdesc': {
      if (!arg) return m.reply('❌ Nayi description do.');
      await sock.groupUpdateDescription(m.chat, arg);
      return m.reply('✅ Description update ho gayi.');
    }
    case 'newgc': {
      if (!arg.includes(',')) return m.reply(`❌ Format: ${config.PREFIX}newgc Group Naam, 923xxxxxxxxxx,923xxxxxxxxxx`);
      const [name, ...members] = arg.split(',').map(s => s.trim());
      const jids = members.map(x => x.replace(/[^0-9]/g, '') + '@s.whatsapp.net').filter(j => j.length > 10);
      const g = await sock.groupCreate(name, jids);
      return m.reply(`✅ Group bana: ${g.id}\nNaam: *${name}*`);
    }
    case 'poll': {
      if (!arg.includes(',')) return m.reply(`❌ Format: ${config.PREFIX}poll sawal?, option1, option2`);
      const [q, ...opts] = arg.split(',').map(s => s.trim());
      return sock.sendMessage(m.chat, { poll: { name: q, values: opts } }, { quoted: m });
    }
    case 'del': {
      if (!quoted) return m.reply('❌ Kisi message ko reply karo.');
      return sock.sendMessage(m.chat, { delete: quoted.key });
    }
    case 'add': {
      const num = arg.replace(/[^0-9]/g, '');
      if (!num) return m.reply('❌ Number do. Example: .add 923xxxxxxxxxx');
      await sock.groupParticipantsUpdate(m.chat, [num + '@s.whatsapp.net'], 'add');
      return m.reply(`✅ +${num} ko group me add kar diya.`);
    }
    case 'out': {
      await m.reply('👋 Bot ja raha hy... Allah Hafiz!');
      return setTimeout(() => sock.groupLeave(m.chat).catch(() => {}), 1500);
    }
    case 'join': {
      if (!arg.includes('chat.whatsapp.com')) return m.reply('❌ Group link do. Example: .join https://chat.whatsapp.com/xxxxx');
      const code = arg.split('chat.whatsapp.com/')[1]?.trim();
      const res = await sock.groupAcceptInvite(code);
      return m.reply(`✅ Group join ho gaya: ${res}`);
    }
    case 'requests': {
      const meta = await sock.groupMetadata(m.chat);
      let out = '';
      try {
        const reqs = await sock.groupRequestParticipantsList(m.chat);
        out = reqs.length ? reqs.map((r, i) => `${i + 1}. +${r.participant?.split('@')[0] || r.jid?.split('@')[0]}`).join('\n') : '(koi request nahi)';
      } catch { out = '(list nahi milsaki)' }
      return m.reply(`📥 *Join requests — ${meta.subject}*\n\n${out}`);
    }
    case 'accept': case 'reject': {
      if (!arg && !quoted) return m.reply(`❌ Number do ya request wale member ko reply karo. Example: ${config.PREFIX}${command} 923xxxxxxxxxx`);
      const num = arg ? arg.replace(/[^0-9]/g, '') : (quoted.key.participant || '').replace(/[^0-9]/g, '');
      await sock.groupRequestParticipantsUpdate(m.chat, [num + '@s.whatsapp.net'], command === 'accept' ? 'approve' : 'reject');
      return m.reply(`✅ +${num} ki request ${command === 'accept' ? 'ACCEPT' : 'REJECT'} ho gayi.`);
    }
    case 'acceptall': case 'rejectall': {
      try {
        const reqs = await sock.groupRequestParticipantsList(m.chat);
        if (!reqs.length) return m.reply('ℹ️ Koi pending request nahi hy.');
        const jids = reqs.map(r => r.participant || r.jid);
        await sock.groupRequestParticipantsUpdate(m.chat, jids, command === 'acceptall' ? 'approve' : 'reject');
        return m.reply(`✅ ${jids.length} requests ${command === 'acceptall' ? 'accept' : 'reject'} ho gayin.`);
      } catch (e) { return m.reply('❌ ' + e.message); }
    }
    case 'chreact': case 'chreact2': {
      if (!quoted) return m.reply('❌ Kisi message ko reply karo.');
      const emoji = arg && /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(arg) ? arg.match(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u)[0] : pick(['❤️', '🔥', '👍', '😂', '😮', '😢', '🙏']);
      return sock.sendMessage(m.chat, { react: { text: emoji, key: quoted.key } });
    }
    default: return m.reply('❓ Unknown group command');
  }
}

module.exports.commands = [
  'del','unmute','mute','tagall','kick','promote','demote','gcpp','revoke','link','ginfo','updategdesc',
  'updategname','poll','out','newgc','end','join','invite','tag','acceptall','rejectall','requests',
  'accept','reject','add','gcstatus2','gcstatus','everyone','chreact','chreact2',
].map(name => ({
  name, desc: 'Group admin command', category: 'GROUP', groupOnly: true, handler,
}));
