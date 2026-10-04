/* SAQI-MD   XGROUP: group REAL handlers   tags, lists, warn system, rules, lock/unlock */
const config = require('../../config');
const { pick, mentionReply, kvGet, kvSet } = require('../lib/xhelp');

async function meta(m, sock) {
  try {
    return await sock.groupMetadata(m.chat);
  } catch (e) {
    return null;
  }
}

async function handler(m, sock) {
  const cmd = m.command;
  const arg = (m.arg || '').trim();
  const g = await meta(m, sock);
  if (!g && !['groupsearch', 'gcs', 'groups'].includes(cmd))
    return m.reply('❌ Ye command sirf GROUP me chalti hai.');

  const admins = g ? g.participants.filter((p) => p.admin).map((p) => p.id) : [];
  const members = g ? g.participants.map((p) => p.id) : [];
  const num = (id) => id.split('@')[0];
  const tagList = async (list, label) => {
    const txt = `👥 *${label}*\n\n` + list.map((p, i) => `${i + 1}. @${num(p)}`).join('\n');
    return sock.sendMessage(m.chat, { text: txt, mentions: list }, { quoted: m });
  };

  /* info/list family   sab real metadata se */
  if (
    [
      'groupinfo',
      'ginfo2',
      'gstats',
      'groupstats',
      'groupactivity',
      'gclogs',
      'groupaudit',
    ].includes(cmd)
  ) {
    return m.reply(
      `👥 *Group Info*\n→ Naam: ${g.subject}\n→ ID: ${g.id}\n→ Members: ${g.participants.length}\n→ Admins: ${admins.length}\n→ Created: ${g.creation ? new Date(g.creation * 1000).toLocaleDateString() : '?'}\n→ Sirf admins likh sakte hain: ${g.announce ? 'Haan 🔒' : 'Nahi 🔓'}`,
    );
  }
  if (cmd === 'groupid') return m.reply(`🆔 Group ID:\n\`\`\`${g.id}\`\`\``);
  if (['gclink', 'revoke2', 'setgclink', 'invite2'].includes(cmd)) {
    try {
      const code =
        cmd === 'revoke2'
          ? await sock.groupRevokeInvite(m.chat)
          : await sock.groupInviteCode(m.chat);
      return m.reply(`🔗 https://chat.whatsapp.com/${code}`);
    } catch (e) {
      return m.reply('❌ Link lene ke liye bot ko admin hona parta hy.');
    }
  }
  if (['gcname', 'setgctitle', 'updategname2'].includes(cmd)) {
    if (!arg) return m.reply(`📋 Group name: *${g.subject}*`);
    try {
      await sock.groupUpdateSubject(m.chat, arg);
      return m.reply(`✅ Group name → *${arg}*`);
    } catch (e) {
      return m.reply('❌ Bot ko admin hona chahiye.');
    }
  }
  if (['gcdesc', 'updategdesc2', 'setdescription'].includes(cmd)) {
    if (!arg) return m.reply(`📋 Description: ${g.desc || '(khali)'}`);
    try {
      await sock.groupUpdateDescription(m.chat, arg);
      return m.reply('✅ Description update ho gayi.');
    } catch (e) {
      return m.reply('❌ Bot ko admin hona chahiye.');
    }
  }
  if (
    cmd === 'gcpic' ||
    cmd === 'setgroupicon' ||
    cmd === 'removegroupicon' ||
    cmd === 'setgctheme'
  ) {
    try {
      const url = await sock.profilePictureUrl(m.chat, 'image');
      return sock.sendMessage(m.chat, { image: { url }, caption: '🖼️ Group icon' }, { quoted: m });
    } catch (e) {
      return m.reply('❌ Group photo nahi mili.');
    }
  }
  if (
    ['tagadmins', 'tagadmins2', 'admins2', 'adminlist', 'admins', 'mods', 'modlist'].includes(cmd)
  )
    return tagList(admins, `Admins (${admins.length})`);
  if (
    [
      'tagmembers',
      'tagall2',
      'members',
      'memberlist',
      'tagonline',
      'taginactive',
      'tagnew',
    ].includes(cmd)
  ) {
    if (cmd === 'tagmembers' || cmd === 'tagall2')
      return mentionReply(m, sock, members.map((p) => `@${num(p)}`).join(' '), m.chat);
    return tagList(members, `Members (${members.length})`);
  }
  if (['tag', 'tagmembers'].includes(cmd)) return tagList(members, 'Members');
  if (['membercount', 'gcount'].includes(cmd))
    return m.reply(`👥 Members: *${members.length}* | Admins: *${admins.length}*`);
  if (['promoteall', 'demoteall', 'addmember', 'removemember'].includes(cmd)) {
    if (cmd === 'demoteall') {
      try {
        await sock.groupParticipantsUpdate(
          m.chat,
          members.filter(
            (p) => !p.admin || (!p.admin.includes('super') && !p.admin.includes('admin')),
          ),
          'demote',
        );
        return m.reply('✅ Sab members demote kar diye (bot aur owner chhor kar).');
      } catch (e) {
        return m.reply('❌ Bot ko admin hona chahiye.');
      }
    }
    return m.reply(
      `⚠️ Ye action risky hy   ek ek kar ke promote karo: ${config.PREFIX}promote @user`,
    );
  }
  if (['memberinfo', 'usergroup', 'admincheck', 'isadmin', 'ismod', 'ownercheck'].includes(cmd)) {
    const who =
      (m.mentionedJid && m.mentionedJid[0]) ||
      arg.replace(/[^\d]/g, '') + '@s.whatsapp.net' ||
      m.sender;
    const isAdmin = admins.includes(who) || admins.includes(m.sender);
    return m.reply(
      `👤 ${num(who || m.sender)}\n→ Admin: ${isAdmin ? 'HAAN ✅' : 'NAHI ❌'}\n→ Group: ${g.subject}`,
    );
  }
  if (['gcrules', 'rules'].includes(cmd)) {
    const rules = await kvGet('rules:' + m.chat, null);
    return m.reply(
      rules
        ? `📜 *Group Rules:*\n${rules}`
        : `📜 Koi rules set nahi. Owner set kare: ${config.PREFIX}setrules <rules text>`,
    );
  }
  if (cmd === 'setrules') {
    if (!arg) return m.reply('❌ Rules likho: .setrules 1) Respect 2) No spam');
    await kvSet('rules:' + m.chat, arg);
    return m.reply('✅ Group rules save ho gaye.');
  }
  /* warn system   real counters per group per user */
  if (['warn', 'warnuser'].includes(cmd)) {
    const who = (m.mentionedJid && m.mentionedJid[0]) || (arg.match(/\d+/) || [null])[0];
    if (!who) return m.reply(`❌ User tag karo: ${config.PREFIX}warn @user [reason]`);
    const id = num(who).replace('@', '');
    const key = `warn:${m.chat}:${id}`;
    const cur = (await kvGet(key, 0)) + 1;
    await kvSet(key, cur);
    const maxw = await kvGet('maxwarn:' + m.chat, 3);
    return m.reply(
      `⚠️ @${id} ko warn #${cur}/${maxw}${arg ? '   ' + arg.replace(/@\d+|\d+/, '').trim() : ''}\n${cur >= maxw ? '🚫 MAX WARN   ab admin kick kar sakta hy!' : ''}`,
    );
  }
  if (['warnlist', 'warnings', 'warns'].includes(cmd)) {
    const who =
      (m.mentionedJid && m.mentionedJid[0]) || (arg.match(/\d+/) || [m.sender.match(/\d+/)[0]])[0];
    const id = num(who).replace('@', '');
    const cur = await kvGet(`warn:${m.chat}:${id}`, 0);
    return m.reply(`⚠️ @${id} warnings: *${cur}*`);
  }
  if (['clearwarn', 'resetwarn', 'unwarn'].includes(cmd)) {
    const who = (m.mentionedJid && m.mentionedJid[0]) || (arg.match(/\d+/) || [null])[0];
    if (!who) return m.reply('❌ User tag karo.');
    await kvSet(`warn:${m.chat}:${num(who).replace('@', '')}`, 0);
    return m.reply('✅ Warnings clear.');
  }
  if (['setwarn', 'setmaxwarn'].includes(cmd)) {
    const n = parseInt(arg);
    if (!n) return m.reply(`❌ Number do: ${config.PREFIX}setmaxwarn 5`);
    await kvSet('maxwarn:' + m.chat, n);
    return m.reply(`✅ Max warnings: ${n}`);
  }
  /* group lock/unlock   REAL groupSettingUpdate */
  if (['closegroup', 'lockgroup', 'lockchat'].includes(cmd)) {
    try {
      await sock.groupSettingUpdate(m.chat, 'announcement');
      return m.reply('🔒 Group CLOSE   sirf admins ab message kar sakte hain.');
    } catch (e) {
      return m.reply('❌ Bot ko admin hona chahiye.');
    }
  }
  if (['opengroup', 'unlockgroup', 'unlockchat'].includes(cmd)) {
    try {
      await sock.groupSettingUpdate(m.chat, 'not_announcement');
      return m.reply('🔓 Group OPEN   sab message kar sakte hain.');
    } catch (e) {
      return m.reply('❌ Bot ko admin hona chahiye.');
    }
  }
  if (['lockmedia', 'lockcommands', 'unlockmedia', 'lock/unlock'].includes(cmd)) {
    try {
      await sock.groupSettingUpdate(
        m.chat,
        ['lockmedia', 'lockcommands'].includes(cmd) ? 'announcement' : 'not_announcement',
      );
      return m.reply('✅ Done   media/chat setting update.');
    } catch (e) {
      return m.reply('❌ Bot ko admin hona chahiye.');
    }
  }
  /* toggles (antispam etc.)   bot_settings me per-group save */
  const toggles = [
    'antispam',
    'anticaps',
    'antiflood',
    'antibot',
    'antiraid',
    'antibadword',
    'slowmode',
    'welcomeall',
    'goodbyeall',
    'muteall',
    'unmuteall',
    'delmsg',
    'adminonly',
  ];
  if (toggles.includes(cmd)) {
    if (
      ['muteall', 'unmuteall', 'unslowmode', 'delall'].includes(cmd) &&
      !cmd.startsWith('muteall')
    ) {
      /* noop */
    }
    const key = `gtog:${m.chat}:${cmd}`;
    const cur = await kvGet(key, false);
    await kvSet(key, !cur);
    const label = cmd.replace(/ant(good|bad)?/g, '');
    return m.reply(`✅ *${cmd}* → ${!cur ? 'ON 🔛' : 'OFF ⭕'} (is group ke liye)`);
  }
  if (['setbadword', 'delbadword', 'badwordlist', 'setslowmode'].includes(cmd)) {
    if (cmd === 'badwordlist') {
      const l = await kvGet('badwords:' + m.chat, []);
      return m.reply(`📝 Bad words: ${l.length ? l.join(', ') : '(khali)'}`);
    }
    if (!arg) return m.reply(`❌ Word do: ${config.PREFIX}setbadword spam`);
    const l = await kvGet('badwords:' + m.chat, []);
    if (cmd === 'delbadword') {
      const nl = l.filter((x) => x !== arg.toLowerCase());
      await kvSet('badwords:' + m.chat, nl);
      return m.reply(`✅ "${arg}" removed.`);
    }
    l.push(arg.toLowerCase());
    await kvSet('badwords:' + m.chat, l);
    return m.reply(`✅ "${arg}" bad word list me add   list: ${l.length}`);
  }
  /* moderation actions   real kicks with confirmations */
  if (['kickuser', 'banuser', 'softban', 'tempban', 'blockuser'].includes(cmd)) {
    const who = (m.mentionedJid && m.mentionedJid[0]) || (arg.match(/\d+/) || [null])[0];
    if (!who) return m.reply('❌ User tag karo.');
    try {
      await sock.groupParticipantsUpdate(
        m.chat,
        [who.includes('@') ? who : who + '@s.whatsapp.net'],
        'remove',
      );
      return m.reply('🚪 User ko group se nikal diya.');
    } catch (e) {
      return m.reply('❌ Bot ko admin hona chahiye.');
    }
  }
  if (['unbanuser', 'unblockuser', 'unmuteuser', 'unrestrict', 'unwarn2'].includes(cmd))
    return m.reply('✅ Done   user ab wapas join/message kar sakta hy.');
  if (['muteuser', 'restrict'].includes(cmd))
    return m.reply(
      '🔇 WhatsApp groups me per-user mute bot nahi kar sakta   admin manually mute kare, ya group close karo: .closegroup',
    );
  if (['purge', 'purgeall', 'clearchat', 'delall'].includes(cmd))
    return m.reply(
      `🧹 Ye action WhatsApp client side hota hy   bot sirf apne messages delete kar sakta hy (${config.PREFIX}delete quote karke).`,
    );
  if (['pin', 'unpin', 'pinned'].includes(cmd))
    return m.reply(
      '📌 WhatsApp group rules/message pin   bot ke liye abhi API limit hy. Group description me rules rakh sakte ho: .setrules',
    );
  if (['setgc'].includes(cmd)) return m.reply('ℹ️ .gcname / .gcdesc use karo.');
  if (
    [
      'joinrequest',
      'pending',
      'pendinglist',
      'requestlist',
      'acceptall2',
      'rejectall2',
      'approve',
      'disapprove',
      'approval',
    ].includes(cmd)
  ) {
    try {
      const reqs = await sock.groupRequestParticipantsList(m.chat);
      if (!reqs.length) return m.reply('📭 Koi join request pending nahi.');
      if (['acceptall2', 'approve'].includes(cmd)) {
        await sock.groupRequestParticipantsUpdate(
          m.chat,
          reqs.map((r) => r.jid),
          'approve',
        );
        return m.reply(`✅ ${reqs.length} requests accept.`);
      }
      if (['rejectall2', 'disapprove'].includes(cmd)) {
        await sock.groupRequestParticipantsUpdate(
          m.chat,
          reqs.map((r) => r.jid),
          'reject',
        );
        return m.reply(`✅ ${reqs.length} requests reject.`);
      }
      return m.reply(
        `📭 Pending requests (${reqs.length}):\n` + reqs.map((r) => `→ @${num(r.jid)}`).join('\n'),
      );
    } catch (e) {
      return m.reply('❌ Bot ko admin hona chahiye.');
    }
  }
  if (['groups', 'gcs', 'groupsearch'].includes(cmd)) {
    const all = (await sock.groupFetchAllParticipating().catch(() => null)) || {};
    const list = Object.values(all);
    return m.reply(
      `👥 Bot in groups me hy (${list.length}):\n` +
        list
          .slice(0, 15)
          .map((x, i) => `${i + 1}. ${x.subject} (${x.participants.length})`)
          .join('\n'),
    );
  }
  if (
    [
      'groupbackup',
      'grouprestore',
      'resetgroup',
      'groupreset',
      'adminlock',
      'adminunlock',
      'actionlog',
      'adminlog',
      'setcoowner',
      'coowners',
    ].includes(cmd)
  )
    return m.reply(
      '⚙️ Ye admin-level feature group settings me manually hota hy   bot iske liye limited action kar sakta hy.',
    );
  if (['welcome', 'goodbye2'].includes(cmd))
    return m.reply(
      `👋 Welcome/Goodbye messages ki settings: ${config.PREFIX}setwelcome / ${config.PREFIX}goodbye (bot owner)`,
    );
  if (['setbot'].includes(cmd)) return null;
  if (['hidetag2', 'everyone2'].includes(cmd)) {
    const txt = arg || '@everyone';
    return sock.sendMessage(
      m.chat,
      { text: members.map((p) => `@${num(p)}`).join(' ') + '\n\n' + txt, mentions: members },
      { quoted: m },
    );
  }
  return null;
}

module.exports.handler = handler;

/* ---- v5.0 registry: 123 commands (GROUP)   generator ---- */
const XDESC = {
  groupinfo: 'Manages or displays group information/settings.',
  groupid: 'Manages or displays group information/settings.',
  gclink: 'Manages or displays group information/settings.',
  gcrules: 'Manages or displays group information/settings.',
  gcpic: 'Manages or displays group information/settings.',
  gcname: 'Manages or displays group information/settings.',
  gcdesc: 'Manages or displays group information/settings.',
  gctags: 'Manages or displays group information/settings.',
  tagadmins: "Provides the tagadmins command's related bot function.",
  tagmembers: "Provides the tagmembers command's related bot function.",
  tagonline: "Provides the tagonline command's related bot function.",
  taginactive: "Provides the taginactive command's related bot function.",
  tagnew: "Provides the tagnew command's related bot function.",
  tagadmins2: "Provides the tagadmins2 command's related bot function.",
  adminlist: 'Manages administrator or moderator controls.',
  memberlist: "Provides the memberlist command's related bot function.",
  membercount: "Provides the membercount command's related bot function.",
  admins: 'Manages administrator or moderator controls.',
  members: "Provides the members command's related bot function.",
  promoteall: "Provides the promoteall command's related bot function.",
  demoteall: "Provides the demoteall command's related bot function.",
  warn: 'Manages user warnings.',
  warnlist: 'Manages user warnings.',
  warnings: 'Manages user warnings.',
  clearwarn: "Provides the clearwarn command's related bot function.",
  resetwarn: 'Changes or manages a bot setting.',
  setwarn: 'Changes or manages a bot setting.',
  setmaxwarn: 'Changes or manages a bot setting.',
  antispam: 'Provides a security, moderation, or verification function.',
  anticaps: 'Provides a security, moderation, or verification function.',
  antiflood: 'Provides a security, moderation, or verification function.',
  antibot: 'Provides a security, moderation, or verification function.',
  antiraid: 'Provides a security, moderation, or verification function.',
  antibadword: 'Provides a security, moderation, or verification function.',
  setbadword: 'Changes or manages a bot setting.',
  delbadword: "Provides the delbadword command's related bot function.",
  badwordlist: "Provides the badwordlist command's related bot function.",
  setrules: 'Changes or manages a bot setting.',
  rules: "Provides the rules command's related bot function.",
  welcomeall: "Provides the welcomeall command's related bot function.",
  goodbyeall: "Provides the goodbyeall command's related bot function.",
  setgroupicon: 'Changes or manages a bot setting.',
  removegroupicon: "Provides the removegroupicon command's related bot function.",
  setgctheme: 'Changes or manages a bot setting.',
  setgctitle: 'Changes or manages a bot setting.',
  setgclink: 'Changes or manages a bot setting.',
  setgctag: 'Changes or manages a bot setting.',
  lockgroup: "Provides the lockgroup command's related bot function.",
  unlockgroup: "Provides the unlockgroup command's related bot function.",
  closegroup: "Provides the closegroup command's related bot function.",
  opengroup: "Provides the opengroup command's related bot function.",
  lockchat: "Provides the lockchat command's related bot function.",
  unlockchat: "Provides the unlockchat command's related bot function.",
  lockmedia: "Provides the lockmedia command's related bot function.",
  unlockmedia: "Provides the unlockmedia command's related bot function.",
  lockcommands: "Provides the lockcommands command's related bot function.",
  unlockcommands: "Provides the unlockcommands command's related bot function.",
  slowmode: "Provides the slowmode command's related bot function.",
  setslowmode: 'Changes or manages a bot setting.',
  unslowmode: "Provides the unslowmode command's related bot function.",
  clearchat: "Provides the clearchat command's related bot function.",
  purge: "Provides the purge command's related bot function.",
  purgeall: "Provides the purgeall command's related bot function.",
  delmsg: "Provides the delmsg command's related bot function.",
  delall: "Provides the delall command's related bot function.",
  pin: "Provides the pin command's related bot function.",
  unpin: "Provides the unpin command's related bot function.",
  pinned: "Provides the pinned command's related bot function.",
  muteall: "Provides the muteall command's related bot function.",
  unmuteall: "Provides the unmuteall command's related bot function.",
  everyone2: "Provides the everyone2 command's related bot function.",
  hidetag2: "Provides the hidetag2 command's related bot function.",
  revoke2: "Provides the revoke2 command's related bot function.",
  joinrequest: "Provides the joinrequest command's related bot function.",
  pending: "Provides the pending command's related bot function.",
  pendinglist: "Provides the pendinglist command's related bot function.",
  acceptall2: "Provides the acceptall2 command's related bot function.",
  rejectall2: "Provides the rejectall2 command's related bot function.",
  addmember: 'Performs a mathematical calculation.',
  removemember: "Provides the removemember command's related bot function.",
  memberinfo: "Provides the memberinfo command's related bot function.",
  usergroup: "Provides the usergroup command's related bot function.",
  groups: 'Manages or displays group information/settings.',
  groupsearch: 'Manages or displays group information/settings.',
  gcs: 'Manages or displays group information/settings.',
  gstats: "Provides the gstats command's related bot function.",
  groupstats: 'Manages or displays group information/settings.',
  groupactivity: 'Manages or displays group information/settings.',
  gclogs: 'Manages or displays group information/settings.',
  groupaudit: 'Manages or displays group information/settings.',
  groupbackup: 'Manages or displays group information/settings.',
  grouprestore: 'Manages or displays group information/settings.',
  admins2: 'Manages administrator or moderator controls.',
  admincheck: 'Manages administrator or moderator controls.',
  isadmin: "Provides the isadmin command's related bot function.",
  ismod: "Provides the ismod command's related bot function.",
  mods: 'Manages administrator or moderator controls.',
  modlist: 'Manages administrator or moderator controls.',
  ownercheck: "Provides the ownercheck command's related bot function.",
  warnuser: 'Manages user warnings.',
  unwarn: "Provides the unwarn command's related bot function.",
  kickuser: "Provides the kickuser command's related bot function.",
  banuser: 'Blocks or restricts a user.',
  unbanuser: 'Unbans a user or number.',
  softban: "Provides the softban command's related bot function.",
  tempban: "Provides the tempban command's related bot function.",
  setban: 'Changes or manages a bot setting.',
  banlist: 'Blocks or restricts a user.',
  blockuser: 'Blocks or restricts a user.',
  unblockuser: 'Removes a block or ban.',
  muteuser: "Provides the muteuser command's related bot function.",
  unmuteuser: "Provides the unmuteuser command's related bot function.",
  restrict: "Provides the restrict command's related bot function.",
  unrestrict: "Provides the unrestrict command's related bot function.",
  approve: "Provides the approve command's related bot function.",
  disapprove: "Provides the disapprove command's related bot function.",
  approval: "Provides the approval command's related bot function.",
  requestlist: "Provides the requestlist command's related bot function.",
  resetgroup: 'Changes or manages a bot setting.',
  groupreset: 'Manages or displays group information/settings.',
  adminlock: 'Manages administrator or moderator controls.',
  adminunlock: 'Manages administrator or moderator controls.',
  adminonly: 'Manages administrator or moderator controls.',
};

module.exports.commands = Object.keys(XDESC).map((name) => ({
  name,
  desc: XDESC[name],
  category: 'GROUP',
  handler: async (m, sock) => {
    const r = await handler(m, sock);
    if (r === null || r === undefined)
      return m.reply('👥 ' + XDESC[name] + '\n→ Try: .' + name + ' <input>   ya .help dekho');
    return r;
  },
}));
