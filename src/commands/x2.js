// ===== x2.js shared prelude =====
const H = require('../lib/xhelp');
const config = require('../../config');
const { kvGet, kvSet, safeMath, xfetch: xfetchRaw, aiFallback } = H;
const xfetch = async (url, opts, ms) => {
  const r = await xfetchRaw(url, opts, ms);
  return r && typeof r.text === 'function' ? await r.text() : r;
};
const fs = require('fs');
const crypto = require('crypto');

const R = (m, t) => m.reply(t);
const A = (m) => String(m.arg || '').trim();
const low = (s) => String(s || '').toLowerCase();
const nameOf = (j) => String(j || '').split('@')[0];
const mJid = (m) =>
  (m.mentionedJid && m.mentionedJid[0]) ||
  (m.quoted && (m.quoted.sender || m.quoted.participant)) ||
  null;
const qtext = (m) => {
  try {
    const q = m.quoted;
    if (!q) return '';
    return (q.text || (q.msg && q.msg.text) || q.caption || '').toString().trim();
  } catch (e) {
    return '';
  }
};
const gmeta = async (m, sock) => {
  try {
    if (m.chat && String(m.chat).endsWith('@g.us')) return await sock.groupMetadata(m.chat);
  } catch (e) {}
  return null;
};
const GK = (m) => 'x2g:' + nameOf(m.chat || '');
const UK = (m) => 'x2u:' + nameOf(m.sender || '');
const REG = () =>
  global.__SAQI_CMDS_ALL && typeof global.__SAQI_CMDS_ALL.forEach === 'function'
    ? global.__SAQI_CMDS_ALL
    : null;
const regList = () => {
  const r = REG();
  if (!r) return [];
  const out = [];
  r.forEach((v, k) => out.push(v));
  return out;
};
const fmtCmd = (c) => '.' + c.name + '   ' + (c.desc || '');
const LISTMAX = 25;
async function listCmds(m, pred, title) {
  const all = regList()
    .filter(pred)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!all.length)
    return R(m, '📦 ' + title + ': registry abhi load nahi hui   thori dair baad try karo.');
  const lines = all.slice(0, LISTMAX).map(fmtCmd);
  const more = all.length > LISTMAX ? '\n… +' + (all.length - LISTMAX) + ' more' : '';
  return R(m, '📦 ' + title + ' (' + all.length + '):\n\n' + lines.join('\n') + more);
}
const TZ = {
  karachi: 'Asia/Karachi',
  lahore: 'Asia/Karachi',
  islamabad: 'Asia/Karachi',
  dubai: 'Asia/Dubai',
  abudhabi: 'Asia/Dubai',
  london: 'Europe/London',
  paris: 'Europe/Paris',
  berlin: 'Europe/Berlin',
  frankfurt: 'Europe/Berlin',
  newyork: 'America/New_York',
  york: 'America/New_York',
  toronto: 'America/Toronto',
  chicago: 'America/Chicago',
  losangeles: 'America/Los_Angeles',
  la: 'America/Los_Angeles',
  tokyo: 'Asia/Tokyo',
  delhi: 'Asia/Kolkata',
  india: 'Asia/Kolkata',
  beijing: 'Asia/Shanghai',
  shanghai: 'Asia/Shanghai',
  singapore: 'Asia/Singapore',
  hongkong: 'Asia/Hong_Kong',
  sydney: 'Australia/Sydney',
  moscow: 'Europe/Moscow',
  riyadh: 'Asia/Riyadh',
  makkah: 'Asia/Riyadh',
  madina: 'Asia/Riyadh',
  istanbul: 'Europe/Istanbul',
  dhaka: 'Asia/Dhaka',
  tehran: 'Asia/Tehran',
  cairo: 'Africa/Cairo',
  johannesburg: 'Africa/Johannesburg',
  saopaulo: 'America/Sao_Paulo',
  mexico: 'America/Mexico_City',
};
const fmtIn = (tz) => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
  } catch (e) {
    return String(new Date());
  }
};

const num = (s) => {
  const n = parseFloat(String(s || '').replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
};

const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function kvPush(key, item, max) {
  const list = (await kvGet(key)) || [];
  list.push(
    Object.assign(
      { id: Date.now() + '' + Math.floor(Math.random() * 1000), at: new Date().toISOString() },
      item,
    ),
  );
  while (max && list.length > max) list.shift();
  await kvSet(key, list);
}

async function setRem(m, key, ms, text) {
  const list = (await kvGet(key)) || [];
  const id = 'r' + Date.now();
  list.push({ id, t: Date.now() + ms, text });
  await kvSet(key, list);
  setTimeout(async () => {
    try {
      await m.reply('⏰ REMINDER: ' + text);
      const rest = ((await kvGet(key)) || []).filter((r) => r.id !== id);
      await kvSet(key, rest);
    } catch (e) {}
  }, ms);
  return id;
}

const MS = (s) => {
  const n = num(s);
  if (n === null) return null;
  return Math.max(5000, Math.round(n * 60000));
};

const TZ_CTRY = {
  pakistan: 'Asia/Karachi',
  india: 'Asia/Kolkata',
  'united arab emirates': 'Asia/Dubai',
  'saudi arabia': 'Asia/Riyadh',
  uk: 'Europe/London',
  'united kingdom': 'Europe/London',
  england: 'Europe/London',
  usa: 'America/New_York',
  'united states': 'America/New_York',
  canada: 'America/Toronto',
  japan: 'Asia/Tokyo',
  china: 'Asia/Shanghai',
  australia: 'Australia/Sydney',
  germany: 'Europe/Berlin',
  france: 'Europe/Paris',
  turkey: 'Europe/Istanbul',
  bangladesh: 'Asia/Dhaka',
  indonesia: 'Asia/Jakarta',
  malaysia: 'Asia/Kuala_Lumpur',
  singapore: 'Asia/Singapore',
  brazil: 'America/Sao_Paulo',
  'south africa': 'Africa/Johannesburg',
  egypt: 'Africa/Cairo',
  nigeria: 'Africa/Lagos',
  iran: 'Asia/Tehran',
  iraq: 'Asia/Baghdad',
  qatar: 'Asia/Qatar',
  kuwait: 'Asia/Kuwait',
};

const COLORS = {
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  yellow: '#FFFF00',
  orange: '#FFA500',
  purple: '#800080',
  pink: '#FFC0CB',
  black: '#000000',
  white: '#FFFFFF',
  gray: '#808080',
  grey: '#808080',
  brown: '#A52A2A',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  teal: '#008080',
  navy: '#000080',
  gold: '#FFD700',
  silver: '#C0C0C0',
  maroon: '#800000',
  olive: '#808000',
  lime: '#00FF00',
  skyblue: '#87CEEB',
  violet: '#EE82EE',
  indigo: '#4B0082',
  coral: '#FF7F50',
  salmon: '#FA8072',
  khaki: '#F0E68C',
  beige: '#F5F5DC',
};

const STATUS_IDEAS = [
  'Aaj apna ek goal likho aur us par kaam shuru karo 💪',
  'Chhoti khushi share karo 🌸',
  'Aaj ka best moment kya tha? 🤔',
  'Apne kisi kaam par proud feel karo 🏆',
  'Ek achi aadat jo aaj follow ki 🌱',
  'Aaj ka mood 1-10 me? 😄',
  'Apne kisi dost ko thanks bolo 🙏',
  'Aaj seekhi hui ek cheez likho 📚',
];

const HASHTAG_FOR = (w) =>
  '#' +
  low(w)
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((x, i) => (i === 0 ? x : x.charAt(0).toUpperCase() + x.slice(1)))
    .join('');

const TEMPLATE_LIST = [
  '🌟 Good morning: "Naya din, nayi umeedein"',
  '📚 Study: "Exam mode ON   dua karo"',
  '🌙 Good night: "Allah hafiz, sweet dreams"',
  '💪 Motivation: "Mushkilein kam nahi hotin, hum barh jate hain"',
  '🎉 Celebration: "Alhamdulillah, ek aur kadam bara ho gaya"',
];

const SEPS = [
  '━━━━━━━━━━━━━━',
  '────────────────',
  '••••••••••••••••',
  '════════════════',
  '▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
  '✦ ✦ ✦ ✦ ✦ ✦ ✦',
];

const SYMS = ['★ ☆ ✦ ✧ ♡ ♥ ✿ ❀ ☀ ☁ ☂ ☑ ☒ ⌚ ⌛ ⏰ ♪ ♫ ✔ ✖ ⚡ ❄ ⭐ 🌙 🔥 💯 ✅ ❌ ⏳ 📌'];

let CTRY_CACHE = null;

async function x2country(m, q, kind) {
  if (!q) return R(m, '⚠️ Country name/code do (e.g. Pakistan ya pk).');
  try {
    if (!CTRY_CACHE) {
      try {
        CTRY_CACHE = JSON.parse(
          await xfetch(
            'https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json',
            {},
            20000,
          ),
        );
      } catch (e) {
        CTRY_CACHE = [];
      }
    }
    const qq = low(q)
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const lat = (s) =>
      low(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    let j =
      (CTRY_CACHE || []).find(
        (c) => lat(c.name.common) === qq || low(c.cca2) === qq || low(c.cca3) === qq,
      ) ||
      (CTRY_CACHE || []).find(
        (c) => lat(c.name.common).includes(qq) || (c.altSpellings || []).some((a) => lat(a) === qq),
      ) ||
      (CTRY_CACHE || []).find(
        (c) =>
          c.translations &&
          Object.values(c.translations).some((t) => t && lat(t.common || t) === qq),
      );
    if (!j && /turkey/i.test(qq)) j = (CTRY_CACHE || []).find((c) => c.cca2 === 'TR');
    if (!j) return R(m, 'ℹ️ Country nahi mili.');
    const cur = j.currencies
      ? Object.entries(j.currencies)
          .map(([c, v]) => v.name + ' (' + c + (v.symbol ? ' ' + v.symbol : '') + ')')
          .join(', ')
      : '-';
    const idd = j.idd && j.idd.root ? j.idd.root + (j.idd.suffixes || []).join('') : '-';
    const lines = {
      countries:
        'Capital: ' +
        (j.capital ? j.capital.join(', ') : '-') +
        '\nCurrency: ' +
        cur +
        '\nLanguages: ' +
        (j.languages ? Object.values(j.languages).join(', ') : '-') +
        '\nCalling code: ' +
        idd,
      capital: '🏛️ Capital of ' + j.name.common + ': ' + (j.capital ? j.capital.join(', ') : '-'),
      flag:
        '🚩 ' +
        (j.flag || '') +
        ' ' +
        j.name.common +
        ' (' +
        (j.cca2 || '') +
        ')\nCapital: ' +
        (j.capital ? j.capital.join(', ') : '-'),
      currency: '💱 ' + j.name.common + ': ' + cur,
      tz:
        '🕰️ ' +
        j.name.common +
        ': ' +
        (TZ_CTRY[low(j.name.common)]
          ? fmtIn(TZ_CTRY[low(j.name.common)]) + ' (' + TZ_CTRY[low(j.name.common)] + ')'
          : '(city ke sath: .timein <city>)'),
      lang:
        '🗣️ ' + j.name.common + ': ' + (j.languages ? Object.values(j.languages).join(', ') : '-'),
    };
    return R(m, '🌍 ' + (lines[kind] || lines.countries));
  } catch (e) {
    return R(m, '⚠️ Country data nahi mila (' + String(e.message).slice(0, 50) + ').');
  }
}

const R1 = {
  // handlers part 1: group + moderation

  // ---- GROUP MANAGEMENT ----
  groupwelcome: async (m, sock) => {
    const k = GK(m) + ':welcome';
    const cur = await kvGet(k, { on: false, text: '' });
    const on = !cur.on;
    await kvSet(k, Object.assign(cur, { on }));
    return R(
      m,
      (on ? '✅' : '❌') +
        ' Group welcome messages: ' +
        (on ? 'ON' : 'OFF') +
        (cur.text ? '\nCustom: ' + cur.text : ''),
    );
  },
  groupgoodbye: async (m, sock) => {
    const k = GK(m) + ':goodbye';
    const cur = await kvGet(k, { on: false, text: '' });
    const on = !cur.on;
    await kvSet(k, Object.assign(cur, { on }));
    return R(m, (on ? '✅' : '❌') + ' Group goodbye messages: ' + (on ? 'ON' : 'OFF'));
  },
  welcomeimage: async (m, sock) =>
    R(
      m,
      '🖼️ Welcome card template:\n\n┌─ WELCOME ─┐\n👋 Welcome @' +
        nameOf(mJid(m) || m.sender) +
        '!\n📊 Member of ' +
        ((await gmeta(m, sock)) || { size: '?' }).size +
        '\n└───────────┘\n\nTip: .setwelcome2 <text> se apna custom welcome set karo.',
    ),
  goodbyeimage: async (m, sock) =>
    R(
      m,
      '🖼️ Goodbye card:\n\n┌─ GOODBYE ─┐\n😢 ' +
        (mJid(m) ? '@' + nameOf(mJid(m)) : 'Member') +
        ' ne group chhora\nAllah hafiz!\n└───────────┘',
    ),
  setwelcome2: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Welcome text do: .setwelcome2 Salam {user}!');
    await kvSet(GK(m) + ':welcome', { on: true, text: t });
    return R(m, '✅ Custom welcome message set:\n' + t);
  },
  setgoodbye2: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Goodbye text do: .setgoodbye2 Khuda hafiz {user}');
    await kvSet(GK(m) + ':goodbye', { on: true, text: t });
    return R(m, '✅ Custom goodbye message set:\n' + t);
  },
  resetwelcome: async (m, sock) => {
    await kvSet(GK(m) + ':welcome', { on: false, text: '' });
    return R(m, '♻️ Welcome default par reset ho gaya.');
  },
  resetgoodbye: async (m, sock) => {
    await kvSet(GK(m) + ':goodbye', { on: false, text: '' });
    return R(m, '♻️ Goodbye default par reset ho gaya.');
  },
  groupwelcomeinfo: async (m, sock) => {
    const c = await kvGet(GK(m) + ':welcome', { on: false, text: '' });
    return R(
      m,
      'ℹ️ Welcome config:\nStatus: ' +
        (c.on ? 'ON' : 'OFF') +
        '\nCustom text: ' +
        (c.text || '(default)'),
    );
  },
  groupgoodbyeinfo: async (m, sock) => {
    const c = await kvGet(GK(m) + ':goodbye', { on: false, text: '' });
    return R(
      m,
      'ℹ️ Goodbye config:\nStatus: ' +
        (c.on ? 'ON' : 'OFF') +
        '\nCustom text: ' +
        (c.text || '(default)'),
    );
  },
  setrules2: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Rules text do: .setrules2 1. Rule one...');
    await kvSet(GK(m) + ':rules', t);
    return R(m, '✅ Group rules set:\n\n' + t);
  },
  showrules: async (m, sock) => {
    const t = await kvGet(GK(m) + ':rules');
    if (!t) return R(m, 'ℹ️ Is group ki rules set nahi hyn. .setrules2 se set karo.');
    return R(m, '📜 *GROUP RULES*\n\n' + t);
  },
  addrule: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Rule likho: .addrule No spam');
    const cur = (await kvGet(GK(m) + ':rules')) || '';
    await kvSet(GK(m) + ':rules', (cur ? cur + '\n' : '') + '• ' + t);
    return R(m, '✅ Rule add ho gaya:\n• ' + t);
  },
  delrule: async (m, sock) => {
    const n = num(A(m));
    const cur = ((await kvGet(GK(m) + ':rules')) || '').split('\n');
    if (n === null || n < 1 || n > cur.length)
      return R(m, '⚠️ Rule number do (1-' + cur.length + ').');
    cur.splice(n - 1, 1);
    await kvSet(GK(m) + ':rules', cur.join('\n'));
    return R(m, '🗑️ Rule ' + n + ' delete ho gaya.');
  },
  ruleslist: async (m, sock) => {
    const t = await kvGet(GK(m) + ':rules');
    if (!t) return R(m, 'ℹ️ Koi rules nahi.');
    return R(m, '📜 Rules:\n\n' + t);
  },
  setrulesmode: async (m, sock) => {
    const t = low(A(m));
    if (!['on', 'off'].includes(t)) return R(m, '⚠️ .setrulesmode on/off');
    await kvSet(GK(m) + ':rulesmode', t);
    return R(m, '✅ Rules on-join mode: ' + t.toUpperCase());
  },
  groupname: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    return R(m, '👥 Group name: ' + g.subject);
  },
  groupdesc: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    return R(m, '📝 Group description:\n\n' + (g.desc || '(koi description nahi)'));
  },
  groupcreated: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    return R(
      m,
      '📅 Group created: ' + (g.creation ? new Date(g.creation * 1000).toDateString() : 'unknown'),
    );
  },
  groupowner: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    return R(
      m,
      '👑 Group owner: @' +
        nameOf(g.owner || '') +
        (g.owner ? '' : '\n(owner info available nahi)'),
    );
  },
  grouplink: async (m, sock) => {
    try {
      const code = await sock.groupInviteCode(m.chat);
      return R(m, '🔗 Group invite link:\nhttps://chat.whatsapp.com/' + code);
    } catch (e) {
      return R(m, '⚠️ Link nahi mil sakta   bot ko admin banao.');
    }
  },
  groupinvite: async (m, sock) => {
    try {
      const code = await sock.groupInviteCode(m.chat);
      const g = (await gmeta(m, sock)) || { subject: 'Group' };
      return R(
        m,
        '📨 *Group Invite*\n\n👥 ' +
          g.subject +
          '\n🔗 https://chat.whatsapp.com/' +
          code +
          '\n\nUpar link se join karo!',
      );
    } catch (e) {
      return R(m, '⚠️ Link nahi ban sakta   bot ko admin banao.');
    }
  },
  groupmembers: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    const list = g.participants.map((p, i) => i + 1 + '. @' + nameOf(p.id)).join('\n');
    return R(m, '👥 Members (' + g.size + '):\n\n' + list.slice(0, 3000));
  },
  groupadmins: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    const admins = g.participants.filter((p) => p.admin);
    if (!admins.length) return R(m, 'ℹ️ Koi admin nahi.');
    return R(
      m,
      '👑 Admins (' +
        admins.length +
        '):\n' +
        admins
          .map((p) => '• @' + nameOf(p.id) + (p.admin === 'superadmin' ? ' (owner)' : ''))
          .join('\n'),
    );
  },
  groupbots: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    const bots = g.participants.filter((p) => /[bot|md|bot0-9]/i.test(nameOf(p.id)));
    return R(
      m,
      '🤖 Detected bot/admin accounts (' +
        bots.length +
        '):\n' +
        (bots.map((p) => '• @' + nameOf(p.id)).join('\n') || '(koi nahi)'),
    );
  },
  membercount2: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    return R(m, '👥 Total members: ' + g.size);
  },
  memberid: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Kisi member ko mention karo.');
    return R(m, '🆔 WhatsApp ID: ' + j + '\nNumber: +' + nameOf(j));
  },
  membertag: async (m, sock) => {
    const j = mJid(m);
    const t = A(m);
    if (!j) return R(m, '⚠️ Member mention karo + message: .membertag @user hello');
    return sock.sendMessage(m.chat, {
      text: '🏷️ ' + (t || 'Tag!') + ' @' + nameOf(j),
      mentions: [j],
    });
  },
  tagmembers2: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('tagall');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ tagall available nahi.');
  },
  tagonline2: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('tagall');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ tagall available nahi.');
  },
  randommember: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    const p = pickOne(g.participants);
    return sock.sendMessage(m.chat, {
      text: '🎲 Random member: @' + nameOf(p.id),
      mentions: [p.id],
    });
  },
  randomadmin: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    const admins = g.participants.filter((p) => p.admin);
    if (!admins.length) return R(m, 'ℹ️ Koi admin nahi.');
    const p = pickOne(admins);
    return sock.sendMessage(m.chat, {
      text: '🎲 Random admin: @' + nameOf(p.id),
      mentions: [p.id],
    });
  },
  memberstats: async (m, sock) => {
    const j = mJid(m) || m.sender;
    const c = (await kvGet('x2act:' + nameOf(m.chat) + ':' + nameOf(j))) || 0;
    return R(
      m,
      '📊 @' +
        nameOf(j) +
        ' ke stats:\nCommands used (is chat): ' +
        c +
        '\n\n(Stats har command use par barhte hyn)',
    );
  },
  groupstats2: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    const admins = g.participants.filter((p) => p.admin).length;
    const acts = (await kvGet('x2act:' + nameOf(m.chat))) || 0;
    return R(
      m,
      '📊 *Group Stats*\n\n👥 Members: ' +
        g.size +
        '\n👑 Admins: ' +
        admins +
        '\n👤 Normal members: ' +
        (g.size - admins) +
        '\n🤖 Commands used: ' +
        acts,
    );
  },
  setmemberlimit: async (m, sock) => {
    const n = num(A(m));
    if (!n) return R(m, '⚠️ Number do: .setmemberlimit 100');
    await kvSet(GK(m) + ':memberlimit', n);
    return R(m, '✅ Member limit set: ' + n);
  },
  memberlimit: async (m, sock) => {
    const n = await kvGet(GK(m) + ':memberlimit');
    return R(m, 'ℹ️ Member limit: ' + (n || '(set nahi   .setmemberlimit <n>)'));
  },
  groupnote: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) {
      const n = await kvGet(GK(m) + ':notes');
      return R(m, n ? '📌 Group note:\n' + n : '⚠️ Note likho: .groupnote ye group k liye note');
    }
    await kvSet(GK(m) + ':notes', t);
    return R(m, '✅ Group note save ho gaya.');
  },
  groupnotes: async (m, sock) => {
    const l = (await kvGet(GK(m) + ':noteslist')) || [];
    const one = await kvGet(GK(m) + ':notes');
    if (!l.length && !one) return R(m, 'ℹ️ Koi group notes nahi. .addgroupnote se add karo.');
    return R(
      m,
      '📌 Group notes:\n\n' +
        (one ? '• ' + one + '\n' : '') +
        l.map((n) => '• ' + n.text).join('\n'),
    );
  },
  addgroupnote: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Note likho: .addgroupnote text');
    await kvPush(GK(m) + ':noteslist', { text: t });
    return R(m, '✅ Note add: ' + t);
  },
  delgroupnote: async (m, sock) => {
    const n = num(A(m));
    const l = (await kvGet(GK(m) + ':noteslist')) || [];
    if (!n || n < 1 || n > l.length)
      return R(m, '⚠️ Note number do (1-' + l.length + '). .groupnotes se list dekho.');
    l.splice(n - 1, 1);
    await kvSet(GK(m) + ':noteslist', l);
    return R(m, '🗑️ Note delete ho gaya.');
  },
  groupreminder: async (m, sock) => {
    const mins = num(A(m).split(' ')[0]);
    const text = A(m).split(' ').slice(1).join(' ');
    if (!mins || !text) return R(m, '⚠️ Format: .groupreminder <minutes> <text>');
    const id = await setRem(m, GK(m) + ':rems', mins * 60000, text);
    return R(m, '⏰ Group reminder set (' + mins + ' min): ' + text + '\nID: ' + id);
  },
  groupreminders: async (m, sock) => {
    const l = (await kvGet(GK(m) + ':rems')) || [];
    if (!l.length) return R(m, 'ℹ️ Koi group reminders nahi.');
    return R(
      m,
      '⏰ Group reminders:\n' +
        l
          .map(
            (r) =>
              '• [' +
              r.id +
              '] ' +
              Math.max(0, Math.round((r.t - Date.now()) / 60000)) +
              ' min   ' +
              r.text,
          )
          .join('\n'),
    );
  },
  delgroupreminder: async (m, sock) => {
    const id = A(m);
    const l = (await kvGet(GK(m) + ':rems')) || [];
    const rest = l.filter((r) => r.id !== id);
    if (rest.length === l.length) return R(m, '⚠️ ID nahi mili. .groupreminders dekho.');
    await kvSet(GK(m) + ':rems', rest);
    return R(m, '🗑️ Reminder delete ho gaya.');
  },
  groupannounce: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Announcement likho: .groupannounce text');
    const g = await gmeta(m, sock);
    const men = g ? g.participants.map((p) => p.id) : [];
    return sock.sendMessage(m.chat, {
      text:
        '📢 *ANNOUNCEMENT* 📢\n━━━━━━━━━━━━\n' + t + '\n━━━━━━━━━━━━\n  ' + (m.pushName || 'Admin'),
      mentions: men,
    });
  },
  groupnotice: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Notice likho: .groupnotice text');
    return sock.sendMessage(m.chat, { text: '📋 *Notice:* ' + t });
  },
  groupvote: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Vote question likho: .groupvote Best admin?');
    await kvSet(GK(m) + ':vote', { q: t, votes: {}, open: true });
    return R(
      m,
      '🗳️ *Vote START*\nQ: ' + t + '\n\nVote dene ke liye: .vote ha / .vote na (reply me)',
    );
  },
  voteresult: async (m, sock) => {
    const v = await kvGet(GK(m) + ':vote');
    if (!v || !v.q) return R(m, 'ℹ️ Koi vote chal nahi raha. .groupvote se shuru karo.');
    const entries = Object.entries(v.votes || {});
    const tally = {};
    entries.forEach(([u, o]) => {
      tally[o] = (tally[o] || 0) + 1;
    });
    const rows =
      Object.entries(tally)
        .map(([o, c]) => '• ' + o + ': ' + c + ' vote(s)')
        .join('\n') || '(abhi koi vote nahi)';
    return R(
      m,
      '🗳️ Vote results\nQ: ' + v.q + '\nStatus: ' + (v.open ? 'OPEN' : 'CLOSED') + '\n\n' + rows,
    );
  },
  endvote: async (m, sock) => {
    const v = await kvGet(GK(m) + ':vote');
    if (!v || !v.q) return R(m, 'ℹ️ Koi vote nahi.');
    const entries = Object.entries(v.votes || {});
    const tally = {};
    entries.forEach(([u, o]) => {
      tally[o] = (tally[o] || 0) + 1;
    });
    await kvSet(GK(m) + ':vote', {});
    return R(
      m,
      '🏁 *Vote CLOSED*\nQ: ' +
        v.q +
        '\n\nFinal:\n' +
        (Object.entries(tally)
          .map(([o, c]) => '• ' + o + ': ' + c)
          .join('\n') || '(koi vote nahi)'),
    );
  },
  vote: async (m, sock) => {
    const v = await kvGet(GK(m) + ':vote');
    if (!v || !v.q || !v.open) return R(m, 'ℹ️ Koi open vote nahi.');
    const o = low(A(m)) || 'yes';
    v.votes = v.votes || {};
    v.votes[nameOf(m.sender)] = o;
    await kvSet(GK(m) + ':vote', v);
    return R(m, '✅ @' + nameOf(m.sender) + ' ne vote diya: ' + o);
  },
  groupfaq: async (m, sock) => {
    const l = (await kvGet(GK(m) + ':faq')) || [];
    if (!l.length) return R(m, 'ℹ️ FAQ khali hy. .addfaq <q> | <a> se add karo.');
    return R(
      m,
      '❓ *Group FAQ*\n\n' + l.map((f, i) => i + 1 + '. Q: ' + f.q + '\n   A: ' + f.a).join('\n'),
    );
  },
  addfaq: async (m, sock) => {
    const parts = A(m).split('|');
    if (parts.length < 2) return R(m, '⚠️ Format: .addfaq question | answer');
    await kvPush(GK(m) + ':faq', { q: parts[0].trim(), a: parts.slice(1).join('|').trim() });
    return R(m, '✅ FAQ add ho gaya.');
  },
  delfaq: async (m, sock) => {
    const n = num(A(m));
    const l = (await kvGet(GK(m) + ':faq')) || [];
    if (!n || n < 1 || n > l.length) return R(m, '⚠️ FAQ number do (1-' + l.length + ').');
    l.splice(n - 1, 1);
    await kvSet(GK(m) + ':faq', l);
    return R(m, '🗑️ FAQ delete ho gaya.');
  },
  faqlist: async (m, sock) => {
    const l = (await kvGet(GK(m) + ':faq')) || [];
    if (!l.length) return R(m, 'ℹ️ Koi FAQ nahi.');
    return R(m, '❓ FAQ list:\n' + l.map((f, i) => i + 1 + '. ' + f.q).join('\n'));
  },
  grouphelp: async (m, sock) =>
    listCmds(
      m,
      (c) =>
        /group|member|tag|warn|mute|kick|promote|vote|rules/i.test(c.name) &&
        !/owner|hidden/i.test(c.desc || ''),
      'Group Management Commands',
    ),
  memberhelp: async (m, sock) => listCmds(m, (c) => /member/i.test(c.name), 'Member Commands'),
  adminhelp2: async (m, sock) =>
    listCmds(
      m,
      (c) => /kick|promote|demote|warn|mute|close|open|add|antibot|antilink/i.test(c.name),
      'Admin Commands',
    ),
  groupconfig: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    const wl = await kvGet(GK(m) + ':welcome', { on: false });
    const ml = await kvGet(GK(m) + ':memberlimit');
    const mode = await kvGet(GK(m) + ':mode', 'normal');
    return R(
      m,
      '⚙️ *Group Config*\n\nName: ' +
        g.subject +
        '\nMembers: ' +
        g.size +
        '\nWelcome: ' +
        (wl.on ? 'ON' : 'OFF') +
        '\nMember limit: ' +
        (ml || '-') +
        '\nMode: ' +
        mode,
    );
  },
  exportgroup: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    const data = JSON.stringify(
      { subject: g.subject, size: g.size, creation: g.creation, desc: g.desc },
      null,
      2,
    );
    return R(m, '📤 Group export:\n\n' + data);
  },
  groupbackup2: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    await kvSet(GK(m) + ':backup', { subject: g.subject, desc: g.desc, at: Date.now() });
    return R(m, '💾 Group settings backup ho gaye. .grouprestore2 se wapas lao.');
  },
  grouprestore2: async (m, sock) => {
    const b = await kvGet(GK(m) + ':backup');
    if (!b) return R(m, 'ℹ️ Koi backup nahi. .groupbackup2 pehle chalao.');
    return R(
      m,
      '♻️ Backup mila:\nName: ' +
        b.subject +
        '\nDesc: ' +
        (b.desc || '-') +
        '\n\nRestore ke liye: .gcname / .gcdesc se apply karo.',
    );
  },
  groupmode: async (m, sock) => {
    const md = await kvGet(GK(m) + ':mode', 'normal');
    return R(m, 'ℹ️ Group moderation mode: ' + md);
  },
  setgroupmode: async (m, sock) => {
    const md = low(A(m));
    if (!['normal', 'strict', 'relaxed'].includes(md))
      return R(m, '⚠️ .setgroupmode normal/strict/relaxed');
    await kvSet(GK(m) + ':mode', md);
    return R(m, '✅ Group mode: ' + md);
  },
  memberwelcome: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Member mention karo.');
    return sock.sendMessage(m.chat, {
      text: '👋 Welcome @' + nameOf(j) + '! Group me khush amdeed 🌟',
      mentions: [j],
    });
  },
  membercard: async (m, sock) => {
    const j = mJid(m) || m.sender;
    return R(
      m,
      '🪪 *Member Card*\n\n👤 @' +
        nameOf(j) +
        '\n🆔 ' +
        j +
        '\n📱 +' +
        nameOf(j) +
        '\n📅 ' +
        new Date().toDateString(),
    );
  },
  groupcard: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    return R(
      m,
      '🪪 *Group Card*\n\n👥 ' +
        g.subject +
        '\n👤 Members: ' +
        g.size +
        '\n📅 Created: ' +
        (g.creation ? new Date(g.creation * 1000).toDateString() : '?') +
        '\n🆔 ' +
        m.chat,
    );
  },
  groupqr: async (m, sock) => {
    try {
      const code = await sock.groupInviteCode(m.chat);
      const url = 'https://chat.whatsapp.com/' + code;
      await sock.sendMessage(m.chat, {
        image: {
          url:
            'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=' +
            encodeURIComponent(url),
        },
        caption: '📷 Group QR   link: ' + url,
      });
      return { sent: true };
    } catch (e) {
      return R(m, '⚠️ QR nahi bana   bot ko admin banao.');
    }
  },
  groupmention: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    return R(m, '🏷️ Mention list:\n' + g.participants.map((p) => '@' + nameOf(p.id)).join(' '));
  },
  groupcount: async (m, sock) => {
    const g = await gmeta(m, sock);
    if (!g) return R(m, '🚫 Ye group command hy.');
    const admins = g.participants.filter((p) => p.admin).length;
    return R(
      m,
      '🔢 Group count:\n\n👥 Total: ' +
        g.size +
        '\n👑 Admins: ' +
        admins +
        '\n👤 Normal: ' +
        (g.size - admins),
    );
  },
  // ---- MODERATION ----
  warn2: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('warn');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ warn available nahi.');
  },
  warnings2: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('warnings');
    if (t) return t.handler(m, sock);
    const j = mJid(m) || m.sender;
    const n = ((await kvGet('x2warn:' + nameOf(m.chat) + ':' + nameOf(j))) || []).length;
    return R(m, '⚠️ @' + nameOf(j) + ' warnings: ' + n);
  },
  clearwarnings: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Member mention karo.');
    await kvSet('x2warn:' + nameOf(m.chat) + ':' + nameOf(j), []);
    return R(m, '✅ @' + nameOf(j) + ' ki saari warnings clear.');
  },
  warnreason: async (m, sock) => {
    const j = mJid(m);
    const r = A(m);
    if (!j || !r) return R(m, '⚠️ .warnreason @user reason');
    const key = 'x2warn:' + nameOf(m.chat) + ':' + nameOf(j);
    const l = (await kvGet(key)) || [];
    l.push({ reason: r, by: nameOf(m.sender), at: new Date().toISOString() });
    await kvSet(key, l);
    return sock.sendMessage(m.chat, {
      text: '⚠️ @' + nameOf(j) + ' warned (' + l.length + '):\nReason: ' + r,
      mentions: [j],
    });
  },
  warnsettings: async (m, sock) => {
    const lim = await kvGet('x2warnlimit:' + nameOf(m.chat), 3);
    const act = await kvGet('x2warnact:' + nameOf(m.chat), 'kick');
    return R(m, '⚙️ Warn settings:\nLimit: ' + lim + '\nAction: ' + act);
  },
  setwarnlimit: async (m, sock) => {
    const n = num(A(m));
    if (!n) return R(m, '⚠️ .setwarnlimit 3');
    await kvSet('x2warnlimit:' + nameOf(m.chat), n);
    return R(m, '✅ Warn limit: ' + n);
  },
  setwarnaction: async (m, sock) => {
    const a = low(A(m));
    if (!['kick', 'mute', 'none'].includes(a)) return R(m, '⚠️ .setwarnaction kick/mute/none');
    await kvSet('x2warnact:' + nameOf(m.chat), a);
    return R(m, '✅ Warn action: ' + a);
  },
  muteuser2: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('mute');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ mute available nahi.');
  },
  unmuteuser2: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('unmute');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ unmute available nahi.');
  },
  mutelist: async (m, sock) => {
    const l = (await kvGet('x2muted:' + nameOf(m.chat))) || [];
    return R(
      m,
      '🔇 Muted members: ' + (l.length ? l.map((u) => '@' + u).join(', ') : '(koi nahi)'),
    );
  },
  setmutetime: async (m, sock) => {
    const n = num(A(m));
    if (!n) return R(m, '⚠️ .setmutetime 30 (minutes)');
    await kvSet('x2mutetime:' + nameOf(m.chat), n);
    return R(m, '✅ Default mute duration: ' + n + ' min');
  },
  kickreason: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('kick');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ kick available nahi.');
  },
  banreason: async (m, sock) => {
    const j = mJid(m);
    const r = A(m);
    if (!j) return R(m, '⚠️ .banreason @user reason');
    await kvPush('x2bans:' + nameOf(m.chat), { user: nameOf(j), reason: r || 'no reason' });
    return R(m, '🔨 @' + nameOf(j) + ' ban recorded. Reason: ' + (r || 'no reason'));
  },
  tempbanlist: async (m, sock) => {
    const l = (await kvGet('x2bans:' + nameOf(m.chat))) || [];
    return R(
      m,
      '🚫 Temp bans:\n' +
        (l.length ? l.map((b) => '• @' + b.user + '   ' + b.reason).join('\n') : '(koi nahi)'),
    );
  },
  untempban: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Member mention karo.');
    const l = ((await kvGet('x2bans:' + nameOf(m.chat))) || []).filter((b) => b.user !== nameOf(j));
    await kvSet('x2bans:' + nameOf(m.chat), l);
    return R(m, '✅ @' + nameOf(j) + ' unban.');
  },
  baninfo: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Member mention karo.');
    const l = ((await kvGet('x2bans:' + nameOf(m.chat))) || []).filter((b) => b.user === nameOf(j));
    return R(
      m,
      'ℹ️ @' +
        nameOf(j) +
        ' ban info:\n' +
        (l.length ? l.map((b) => '• ' + b.reason + ' (' + b.at + ')').join('\n') : 'koi ban nahi'),
    );
  },
  banhistory: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Member mention karo.');
    const bans = ((await kvGet('x2bans:' + nameOf(m.chat))) || []).filter(
      (b) => b.user === nameOf(j),
    );
    const warns = (await kvGet('x2warn:' + nameOf(m.chat) + ':' + nameOf(j))) || [];
    return R(
      m,
      '📖 Mod history @' + nameOf(j) + ':\nBans: ' + bans.length + '\nWarnings: ' + warns.length,
    );
  },
  modhistory: async (m, sock) => {
    const l = (await kvGet('x2modlog:' + nameOf(m.chat))) || [];
    if (!l.length) return R(m, 'ℹ️ Koi mod history nahi.');
    return R(
      m,
      '📖 Recent mod actions:\n' +
        l
          .slice(-10)
          .map((e) => '• [' + e.at.slice(0, 10) + '] ' + e.text)
          .join('\n'),
    );
  },
  modstats: async (m, sock) => {
    const l = (await kvGet('x2modlog:' + nameOf(m.chat))) || [];
    return R(m, '📊 Mod actions total: ' + l.length);
  },
  modlogs: async (m, sock) => {
    const l = (await kvGet('x2modlog:' + nameOf(m.chat))) || [];
    return R(
      m,
      '📝 Mod logs:\n' +
        (l.length
          ? l
              .slice(-10)
              .map((e) => '• ' + e.text)
              .join('\n')
          : '(empty)'),
    );
  },
  clearmodlogs: async (m, sock) => {
    await kvSet('x2modlog:' + nameOf(m.chat), []);
    return R(m, '🗑️ Mod logs clear.');
  },
  modsummary: async (m, sock) => {
    const l = (await kvGet('x2modlog:' + nameOf(m.chat))) || [];
    const bans = ((await kvGet('x2bans:' + nameOf(m.chat))) || []).length;
    return R(
      m,
      '📊 *Mod Summary*\nActions: ' +
        l.length +
        '\nBans: ' +
        bans +
        '\nLast: ' +
        (l.length ? l[l.length - 1].text : '-'),
    );
  },
  setfloodlimit: async (m, sock) => {
    const n = num(A(m));
    if (!n) return R(m, '⚠️ .setfloodlimit 5 (messages per burst)');
    await kvSet('x2flood:' + nameOf(m.chat), n);
    return R(m, '✅ Flood limit: ' + n + ' messages');
  },
  setfloodaction: async (m, sock) => {
    const a = low(A(m));
    if (!['warn', 'delete', 'none'].includes(a)) return R(m, '⚠️ .setfloodaction warn/delete/none');
    await kvSet('x2floodact:' + nameOf(m.chat), a);
    return R(m, '✅ Flood action: ' + a);
  },
  anticaps2: async (m, sock) => {
    const k = 'x2anticaps:' + nameOf(m.chat);
    const cur = await kvGet(k, false);
    await kvSet(k, !cur);
    return R(m, (cur ? '❌' : '✅') + ' Anti-caps: ' + (!cur ? 'ON' : 'OFF'));
  },
  setcapslimit: async (m, sock) => {
    const n = num(A(m));
    if (!n) return R(m, '⚠️ .setcapslimit 70 (% caps)');
    await kvSet('x2capslimit:' + nameOf(m.chat), n);
    return R(m, '✅ Caps limit: ' + n + '%');
  },
  antispam3: async (m, sock) => {
    const k = 'x2antispam:' + nameOf(m.chat);
    const cur = await kvGet(k, false);
    await kvSet(k, !cur);
    return R(m, (cur ? '❌' : '✅') + ' Anti-spam: ' + (!cur ? 'ON' : 'OFF'));
  },
  setspamlimit: async (m, sock) => {
    const n = num(A(m));
    if (!n) return R(m, '⚠️ .setspamlimit 3 (same messages)');
    await kvSet('x2spamlimit:' + nameOf(m.chat), n);
    return R(m, '✅ Spam limit: ' + n);
  },
  setspamaction: async (m, sock) => {
    const a = low(A(m));
    if (!['warn', 'delete', 'none'].includes(a)) return R(m, '⚠️ .setspamaction warn/delete/none');
    await kvSet('x2spamact:' + nameOf(m.chat), a);
    return R(m, '✅ Spam action: ' + a);
  },
  antilink2: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('antilink');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ antilink available nahi.');
  },
  linkallow: async (m, sock) => {
    const d = low(A(m))
      .replace(/^https?:\/\//, '')
      .split('/')[0];
    if (!d) return R(m, '⚠️ Domain do: .linkallow example.com');
    const l = (await kvGet('x2linkallow:' + nameOf(m.chat))) || [];
    if (!l.includes(d)) l.push(d);
    await kvSet('x2linkallow:' + nameOf(m.chat), l);
    return R(m, '✅ Allowed: ' + d);
  },
  linkdeny: async (m, sock) => {
    const d = low(A(m));
    const l = ((await kvGet('x2linkallow:' + nameOf(m.chat))) || []).filter((x) => x !== d);
    await kvSet('x2linkallow:' + nameOf(m.chat), l);
    return R(m, '🗑️ Removed: ' + d);
  },
  linklist: async (m, sock) => {
    const l = (await kvGet('x2linkallow:' + nameOf(m.chat))) || [];
    return R(m, '🔗 Allowed domains:\n' + (l.length ? l.join('\n') : '(koi nahi)'));
  },
  antibadword2: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('antibadword');
    if (t) return t.handler(m, sock);
    const k = 'x2antibad:' + nameOf(m.chat);
    const cur = await kvGet(k, false);
    await kvSet(k, !cur);
    return R(m, (cur ? '❌' : '✅') + ' Anti-badword: ' + (!cur ? 'ON' : 'OFF'));
  },
  badwordadd: async (m, sock) => {
    const w = low(A(m));
    if (!w) return R(m, '⚠️ Word do.');
    const l = (await kvGet('x2badwords:' + nameOf(m.chat))) || [];
    if (!l.includes(w)) l.push(w);
    await kvSet('x2badwords:' + nameOf(m.chat), l);
    return R(m, '✅ Blocked: ' + w);
  },
  badwordremove: async (m, sock) => {
    const w = low(A(m));
    const l = ((await kvGet('x2badwords:' + nameOf(m.chat))) || []).filter((x) => x !== w);
    await kvSet('x2badwords:' + nameOf(m.chat), l);
    return R(m, '🗑️ Unblocked: ' + w);
  },
  badwordlist2: async (m, sock) => {
    const l = (await kvGet('x2badwords:' + nameOf(m.chat))) || [];
    return R(m, '🚫 Blocked words:\n' + (l.length ? l.join(', ') : '(empty)'));
  },
  setbadwordaction: async (m, sock) => {
    const a = low(A(m));
    if (!['delete', 'warn', 'none'].includes(a))
      return R(m, '⚠️ .setbadwordaction delete/warn/none');
    await kvSet('x2badact:' + nameOf(m.chat), a);
    return R(m, '✅ Badword action: ' + a);
  },
  antiinvite: async (m, sock) => {
    const k = 'x2antiinvite:' + nameOf(m.chat);
    const cur = await kvGet(k, false);
    await kvSet(k, !cur);
    return R(m, (cur ? '❌' : '✅') + ' Anti-invite: ' + (!cur ? 'ON' : 'OFF'));
  },
  antimention: async (m, sock) => {
    const k = 'x2antimention:' + nameOf(m.chat);
    const cur = await kvGet(k, false);
    await kvSet(k, !cur);
    return R(m, (cur ? '❌' : '✅') + ' Anti-mention-spam: ' + (!cur ? 'ON' : 'OFF'));
  },
  setmentionlimit: async (m, sock) => {
    const n = num(A(m));
    if (!n) return R(m, '⚠️ .setmentionlimit 10');
    await kvSet('x2mentionlimit:' + nameOf(m.chat), n);
    return R(m, '✅ Mention limit: ' + n);
  },
  antiforward: async (m, sock) => {
    const k = 'x2antifwd:' + nameOf(m.chat);
    const cur = await kvGet(k, false);
    await kvSet(k, !cur);
    return R(m, (cur ? '❌' : '✅') + ' Anti-forward: ' + (!cur ? 'ON' : 'OFF'));
  },
  antimedia: async (m, sock) => {
    const k = 'x2antimedia:' + nameOf(m.chat);
    const cur = await kvGet(k, 'off');
    await kvSet(k, cur === 'off' ? 'on' : 'off');
    return R(m, (cur === 'off' ? '✅' : '❌') + ' Anti-media: ' + (cur === 'off' ? 'ON' : 'OFF'));
  },
  setmediarule: async (m, sock) => {
    const r = low(A(m));
    if (!r) return R(m, '⚠️ .setmediarule image/video/audio/sticker');
    await kvSet('x2mediarule:' + nameOf(m.chat), r);
    return R(m, '✅ Media rule: ' + r);
  },
  moderationon: async (m, sock) => {
    await kvSet('x2moderation:' + nameOf(m.chat), true);
    return R(m, '✅ Moderation features ON (anticaps/antispam/antilink jo bhi set hyn).');
  },
  moderationoff: async (m, sock) => {
    await kvSet('x2moderation:' + nameOf(m.chat), false);
    return R(m, '❌ Moderation features OFF.');
  },
  modstatus: async (m, sock) => {
    const gk = nameOf(m.chat);
    const on = await kvGet('x2moderation:' + gk, false);
    const caps = await kvGet('x2anticaps:' + gk, false);
    const spam = await kvGet('x2antispam:' + gk, false);
    const inv = await kvGet('x2antiinvite:' + gk, false);
    const fwd = await kvGet('x2antifwd:' + gk, false);
    return R(
      m,
      '🛡️ *Moderation Status*\n\nMaster: ' +
        (on ? 'ON' : 'OFF') +
        '\nAnti-caps: ' +
        (caps ? 'ON' : 'OFF') +
        '\nAnti-spam: ' +
        (spam ? 'ON' : 'OFF') +
        '\nAnti-invite: ' +
        (inv ? 'ON' : 'OFF') +
        '\nAnti-forward: ' +
        (fwd ? 'ON' : 'OFF'),
    );
  },
  automodhelp: async (m, sock) =>
    listCmds(m, (c) => /anti|flood|spam|caps|slow|mod/.test(c.name), 'Auto-Moderation Commands'),
  slowmode2: async (m, sock) => {
    const k = 'x2slow:' + nameOf(m.chat);
    const cur = await kvGet(k, 0);
    await kvSet(k, cur ? 0 : 10);
    return R(m, cur ? '❌ Slowmode OFF.' : '✅ Slowmode ON (10s between messages).');
  },
  setslowtime: async (m, sock) => {
    const n = num(A(m));
    if (!n) return R(m, '⚠️ .setslowtime 10 (seconds)');
    await kvSet('x2slow:' + nameOf(m.chat), n);
    return R(m, '✅ Slowmode: ' + n + 's');
  },
  slowstatus: async (m, sock) => {
    const n = await kvGet('x2slow:' + nameOf(m.chat), 0);
    return R(m, 'ℹ️ Slowmode: ' + (n ? n + 's ON' : 'OFF'));
  },
  approveuser: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Member mention karo.');
    const l = (await kvGet('x2approved:' + nameOf(m.chat))) || [];
    if (!l.includes(nameOf(j))) l.push(nameOf(j));
    await kvSet('x2approved:' + nameOf(m.chat), l);
    return R(m, '✅ @' + nameOf(j) + ' approved.');
  },
  removeapproved: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Member mention karo.');
    const l = ((await kvGet('x2approved:' + nameOf(m.chat))) || []).filter((u) => u !== nameOf(j));
    await kvSet('x2approved:' + nameOf(m.chat), l);
    return R(m, '🗑️ @' + nameOf(j) + ' removed from approved.');
  },
  approvedlist: async (m, sock) => {
    const l = (await kvGet('x2approved:' + nameOf(m.chat))) || [];
    return R(
      m,
      '✅ Approved members:\n' + (l.length ? l.map((u) => '@' + u).join(', ') : '(empty)'),
    );
  },
  setmodrole: async (m, sock) => {
    const r = A(m);
    if (!r) return R(m, '⚠️ .setmodrole Admin');
    await kvSet('x2modrole:' + nameOf(m.chat), r);
    return R(m, '✅ Mod role: ' + r);
  },
  modrole: async (m, sock) => {
    const r = await kvGet('x2modrole:' + nameOf(m.chat));
    return R(m, 'ℹ️ Mod role: ' + (r || '(set nahi)'));
  },
  raidmode: async (m, sock) => {
    await kvSet('x2raid:' + nameOf(m.chat), true);
    return R(m, '🚨 Raid mode ON   strict moderation active.');
  },
  raidoff: async (m, sock) => {
    await kvSet('x2raid:' + nameOf(m.chat), false);
    return R(m, '✅ Raid mode OFF.');
  },
  raidstatus: async (m, sock) => {
    const r = await kvGet('x2raid:' + nameOf(m.chat), false);
    return R(m, 'ℹ️ Raid mode: ' + (r ? 'ON 🚨' : 'OFF'));
  },
  safeusers: async (m, sock) => {
    const l = (await kvGet('x2trust:' + nameOf(m.chat))) || [];
    return R(
      m,
      '🛡️ Trusted members:\n' + (l.length ? l.map((u) => '@' + u).join(', ') : '(koi nahi)'),
    );
  },
  trustuser: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Member mention karo.');
    const l = (await kvGet('x2trust:' + nameOf(m.chat))) || [];
    if (!l.includes(nameOf(j))) l.push(nameOf(j));
    await kvSet('x2trust:' + nameOf(m.chat), l);
    return R(m, '✅ @' + nameOf(j) + ' trusted.');
  },
  untrustuser: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Member mention karo.');
    const l = ((await kvGet('x2trust:' + nameOf(m.chat))) || []).filter((u) => u !== nameOf(j));
    await kvSet('x2trust:' + nameOf(m.chat), l);
    return R(m, '🗑️ @' + nameOf(j) + ' untrusted.');
  },
  trustlist: async (m, sock) => {
    const l = (await kvGet('x2trust:' + nameOf(m.chat))) || [];
    return R(m, '🛡️ Trust list:\n' + (l.length ? l.map((u) => '@' + u).join(', ') : '(empty)'));
  },
};

const R2 = {
  // handlers part 2: status & messaging + contacts

  // ---- STATUS & MESSAGING ----
  statusmessage: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Text do: .statusmessage Hello world');
    try {
      await sock.sendMessage('status@broadcast', { text: t });
      return R(m, '✅ Text status post ho gaya! 📱');
    } catch (e) {
      return R(m, '⚠️ Status post nahi hua: ' + e.message);
    }
  },
  statusphoto: async (m, sock) => {
    const q = m.quoted;
    if (!q || !(q.msg && q.msg.image)) return R(m, '⚠️ Kisi IMAGE ka reply karo phir .statusphoto');
    try {
      await sock.sendMessage('status@broadcast', { image: q.msg.image, caption: A(m) || '' });
      return R(m, '✅ Photo status post ho gayi! 📱');
    } catch (e) {
      return R(m, '⚠️ Status post nahi hua (' + e.message + ')');
    }
  },
  statusvideo2: async (m, sock) => {
    const q = m.quoted;
    if (!q || !(q.msg && q.msg.video))
      return R(m, '⚠️ Kisi VIDEO ka reply karo phir .statusvideo2');
    try {
      await sock.sendMessage('status@broadcast', { video: q.msg.video, caption: A(m) || '' });
      return R(m, '✅ Video status post ho gaya! 📱');
    } catch (e) {
      return R(m, '⚠️ Video status nahi hua (' + e.message + ')');
    }
  },
  statusquote2: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do ya kisi message ka reply karo.');
    return R(m, '❝ ' + t + ' ❞\n\n  ' + (m.pushName || 'Unknown'));
  },
  statuspoll2: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ .statuspoll2 Question? | opt1 | opt2');
    const parts = t
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length < 2) return R(m, '⚠️ Kam az kam 2 options do ( | se alag).');
    try {
      await sock.sendMessage(m.chat, {
        poll: { name: parts[0], values: parts.slice(1), selectableCount: 1 },
      });
      return { sent: true };
    } catch (e) {
      return R(
        m,
        '📋 Poll: ' +
          parts[0] +
          '\n' +
          parts
            .slice(1)
            .map((o, i) => i + 1 + '. ' + o)
            .join('\n'),
      );
    }
  },
  statuslink: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Link do: .statuslink https://...');
    return R(
      m,
      '🔗 Status draft:\n\n' +
        t +
        '\n\nLink ke sath post kar diya jaye to .statusmessage me paste karo.',
    );
  },
  statusbanner: async (m, sock) => {
    const t = A(m) || 'SAQI BOT';
    const line = '━'.repeat(Math.min(t.length + 4, 30));
    return R(m, '🚩 Banner:\n\n┏' + line + '┓\n  ' + t.toUpperCase() + '\n┗' + line + '┛');
  },
  statusfont2: async (m, sock) => {
    const t = A(m) || 'status';
    const fonts = {
      bold: '*' + t + '*',
      italic: '_' + t + '_',
      mono: '```' + t + '```',
      strike: '~' + t + '~',
      serif: '𝐒𝐭𝐲𝐥𝐞 𝐬𝐞𝐭: ' + t,
    };
    return R(
      m,
      '🔤 Font options:\n\n' +
        Object.entries(fonts)
          .map(([k, v]) => k + ': ' + v)
          .join('\n'),
    );
  },
  statuspreview: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(
      m,
      '👁️ Status preview:\n\n━━━━━━━━━\n' + t + '\n━━━━━━━━━\n  via ' + (m.pushName || 'bot'),
    );
  },
  statussave2: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Draft text do.');
    await kvPush(UK(m) + ':drafts', { text: t }, 20);
    return R(m, '💾 Draft save ho gaya. .statusdrafts se dekho.');
  },
  statusdrafts: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':drafts')) || [];
    if (!l.length) return R(m, 'ℹ️ Koi drafts nahi. .statussave2 se save karo.');
    return R(
      m,
      '📁 Drafts (' +
        l.length +
        '):\n' +
        l.map((d, i) => i + 1 + '. ' + d.text.slice(0, 50)).join('\n'),
    );
  },
  statusdraft: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':drafts')) || [];
    if (!l.length) return R(m, 'ℹ️ Koi draft nahi.');
    const d = l[l.length - 1];
    return R(m, '📄 Latest draft:\n\n' + d.text);
  },
  deldraft: async (m, sock) => {
    const n = num(A(m));
    const l = (await kvGet(UK(m) + ':drafts')) || [];
    if (!n || n < 1 || n > l.length) return R(m, '⚠️ Draft number do (1-' + l.length + ').');
    l.splice(n - 1, 1);
    await kvSet(UK(m) + ':drafts', l);
    return R(m, '🗑️ Draft delete.');
  },
  cleardrafts: async (m, sock) => {
    await kvSet(UK(m) + ':drafts', []);
    return R(m, '🗑️ Saare drafts clear.');
  },
  statusschedule: async (m, sock) => {
    const mins = num(A(m).split(' ')[0]);
    const text = A(m).split(' ').slice(1).join(' ');
    if (!mins || !text) return R(m, '⚠️ .statusschedule <minutes> <text>');
    await setRem(m, UK(m) + ':schstatus', mins * 60000, '📱 Scheduled status ka waqt: ' + text);
    return R(m, '⏰ Status schedule (' + mins + ' min baad post karne ki yaad dilayenge).');
  },
  scheduledstatus: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':schstatus')) || [];
    return R(
      m,
      '⏰ Scheduled statuses: ' +
        (l.length ? l.map((r) => '• ' + r.text.slice(0, 40)).join('\n') : '(koi nahi)'),
    );
  },
  cancelscheduledstatus: async (m, sock) => {
    await kvSet(UK(m) + ':schstatus', []);
    return R(m, '🗑️ Scheduled statuses cancel.');
  },
  statusreminder: async (m, sock) => {
    const mins = num(A(m).split(' ')[0]);
    const text = A(m).split(' ').slice(1).join(' ') || 'Status post karna!';
    if (!mins) return R(m, '⚠️ .statusreminder 60 (minutes)');
    await setRem(m, UK(m) + ':rem', mins * 60000, text);
    return R(m, '⏰ Status reminder set (' + mins + ' min).');
  },
  statusideas: async (m, sock) =>
    R(
      m,
      '💡 Status ideas:\n' +
        STATUS_IDEAS.slice(0, 4)
          .map((s, i) => i + 1 + '. ' + s)
          .join('\n'),
    ),
  statushashtags: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Keywords do: .statushashtags pakistan cricket');
    return R(m, '#️⃣ Hashtags:\n' + HASHTAG_FOR(t));
  },
  statussymbols: async (m, sock) => R(m, '✨ Status symbols:\n' + SYMS.join(' ')),
  statusseparator: async (m, sock) =>
    R(m, '➖ Separators:\n\n' + SEPS.map((s) => s + '\n').join('')),
  statustemplate: async (m, sock) => R(m, '📋 Status templates:\n\n' + TEMPLATE_LIST.join('\n')),
  goodmorning2: async (m, sock) =>
    R(m, '🌅 *Good Morning!*\n\n"Naya din naye rang, Allah ka shukar 🙏"\n\n☀️ ✨ 💛'),
  goodnight2: async (m, sock) =>
    R(m, '🌙 *Good Night!*\n\n"Allah hafiz   sweet dreams 😴"\n\n⭐ 🌙 ✨'),
  motivationstatus: async (m, sock) =>
    R(
      m,
      '💪 *' +
        pickOne([
          'Mehnat itni khamoshi se karo ke kamyabi shor macha de',
          'Dream big, work hard',
          'Har din ek naya mauka hy',
          'Mushkilein to aati hyn, guzar jati hyn',
        ]) +
        '*',
    ),
  studystatus: async (m, sock) =>
    R(m, '📚 *Study Mode: ON*\n\nDua karo, mehnat jari rakho 🤲\n#Study #Focus'),
  birthdaystatus: async (m, sock) =>
    R(m, '🎂 *Happy Birthday!*\n\nAllah tumhein khush rakhe, kamiyab kare! 🎉🎈'),
  eidstatus: async (m, sock) =>
    R(m, '🌙 *Eid Mubarak!*\n\nEid ki khushiyan sab ke liye! 🕌 🎉\n#EidMubarak'),
  jummastatus: async (m, sock) =>
    R(m, '🕌 *Jumma Mubarak!*\n\n"Jumma ke din dua qabool hoti hy"   Dua me yaad rakhna 🤲'),
  statuscounter: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':drafts')) || [];
    return R(m, '🔢 Saved drafts: ' + l.length);
  },
  statusprivacy2: async (m, sock) =>
    R(
      m,
      '🔒 Status privacy WhatsApp app me manage hoti hy:\nSettings → Privacy → Status\n\nOptions: My Contacts / Except / Only Share With',
    ),
  statusmute2: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Contact mention karo.');
    const l = (await kvGet(UK(m) + ':mutedstatus')) || [];
    if (!l.includes(nameOf(j))) l.push(nameOf(j));
    await kvSet(UK(m) + ':mutedstatus', l);
    return R(m, '🔇 @' + nameOf(j) + ' ke statuses muted (local list).');
  },
  statusunmute2: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Contact mention karo.');
    const l = ((await kvGet(UK(m) + ':mutedstatus')) || []).filter((u) => u !== nameOf(j));
    await kvSet(UK(m) + ':mutedstatus', l);
    return R(m, '🔔 @' + nameOf(j) + ' unmuted.');
  },
  statuscontacts: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':mutedstatus')) || [];
    return R(
      m,
      '👥 Status contacts:\nMuted: ' + (l.length ? l.map((u) => '@' + u).join(', ') : '(koi nahi)'),
    );
  },
  statusrefresh: async (m, sock) =>
    R(m, '🔄 Status data refresh ho gaya.\nTime: ' + new Date().toLocaleTimeString()),
  message: async (m, sock) => {
    const j = mJid(m);
    const t = A(m);
    if (!j || !t) return R(m, '⚠️ .message @number text');
    try {
      await sock.sendMessage(j, { text: '📨 ' + t + '\n\n  via ' + (m.pushName || 'bot') });
      return R(m, '✅ Message @' + nameOf(j) + ' ko bhej diya.');
    } catch (e) {
      return R(m, '⚠️ Message nahi gaya: ' + e.message);
    }
  },
  quotemessage: async (m, sock) => {
    const q = m.quoted;
    if (!q) return R(m, '⚠️ Kisi message ka reply karo.');
    return R(m, '❝ ' + (qtext(m) || '(media)') + ' ❞');
  },
  repeatmsg: async (m, sock) => {
    const parts = A(m).match(/^(.*?)\s+(\d+)$/);
    if (!parts) return R(m, '⚠️ Format: .repeatmsg hello 5');
    const n = Math.min(parseInt(parts[2]), 10);
    return R(m, Array(n).fill(parts[1]).join('\n'));
  },
  delaymsg: async (m, sock) => {
    const parts = A(m).match(/^(\d+)\s+(.*)$/);
    if (!parts) return R(m, '⚠️ Format: .delaymsg 10 hello (seconds)');
    const sec = Math.min(parseInt(parts[1]), 300);
    await R(m, '⏳ ' + sec + 's baad message jayega...');
    setTimeout(() => sock.sendMessage(m.chat, { text: parts[2] }).catch(() => {}), sec * 1000);
    return { delayed: true };
  },
  broadcastmsg: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(
      m,
      '📣 *BROADCAST* 📣\n━━━━━━━━━\n' + t + '\n━━━━━━━━━\n(Ready   bhejne ke liye copy karo)',
    );
  },
  announcement: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Title/text do.');
    return R(
      m,
      '📢 *' + t.toUpperCase() + '* 📢\n\n' + new Date().toDateString() + '\n  Management',
    );
  },
  notice: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(m, '📋 *Notice:* ' + t);
  },
  remindmsg: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(m, '⏰ *REMINDER*\n\n' + t);
  },
  thankmsg: async (m, sock) =>
    R(
      m,
      '🙏 *Shukriya!*\n\n' +
        (A(m) || 'Aap ka bohat shukriya, aap ka sath hamare liye bohat qeemti hy! 💚'),
    ),
  apologymessage: async (m, sock) =>
    R(m, '😔 *Sorry!*\n\n' + (A(m) || 'Galti ho gayi, maaf kar dena. Aage dhyan rakhunga.')),
  welcomemessage: async (m, sock) =>
    R(
      m,
      '👋 *Welcome!*\n\n' + (A(m) || 'Group me khush amdeed! Rules follow karna na bhoolein 🌟'),
    ),
  congratsmessage: async (m, sock) =>
    R(m, '🎉 *Mubarak ho!*\n\n' + (A(m) || 'Bohat bohat mubarak ho   Allah tarqqi de! 🎊')),
  goodluckmessage: async (m, sock) =>
    R(m, '🍀 *Best of Luck!*\n\n' + (A(m) || 'Tumhare liye best wishes   kamyabi zaroor milegi!')),
  birthdaymessage: async (m, sock) =>
    R(
      m,
      '🎂 *Happy Birthday* 🎂\n\n' +
        (A(m) || 'Allah tujhe hamesha khush rakhe, kamiyab kare! 🎈🎁'),
    ),
  festivalmessage: async (m, sock) =>
    R(
      m,
      '🎉 *Mubarak ho!* 🎉\n\n' +
        (A(m) || 'Festival ki dher sari mubarakbaad   khushiyan hazar! ✨'),
    ),
  quotemessage2: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Reply ya text do.');
    return R(m, '┃❝ ' + t + '\n┃\n┗   ' + (m.pushName || 'Unknown'));
  },
  messagecount: async (m, sock) => {
    const c = (await kvGet('x2act:' + nameOf(m.chat) + ':' + nameOf(m.sender))) || 0;
    return R(
      m,
      '🔢 Aap ke is chat me bot-commands: ' +
        c +
        '\n(Poori chat ka count WhatsApp app me group info me hy)',
    );
  },
  chatstats: async (m, sock) => {
    const mine = (await kvGet('x2act:' + nameOf(m.chat) + ':' + nameOf(m.sender))) || 0;
    const tot = (await kvGet('x2act:' + nameOf(m.chat))) || 0;
    return R(m, '📊 *Chat Stats*\n\n🤖 Commands (chat): ' + tot + '\n👤 Aap ke commands: ' + mine);
  },
  chatid: async (m, sock) => R(m, '🆔 Chat ID:\n' + m.chat),
  chattype: async (m, sock) =>
    R(
      m,
      '💬 Chat type: ' +
        (String(m.chat).endsWith('@g.us')
          ? 'Group'
          : String(m.chat).endsWith('@s.whatsapp.net')
            ? 'Private'
            : String(m.chat).endsWith('@broadcast')
              ? 'Status/Broadcast'
              : 'Other') +
        '\nJID: ' +
        m.chat,
    ),
  chatinfo: async (m, sock) => {
    if (String(m.chat).endsWith('@g.us')) {
      const g = await gmeta(m, sock);
      if (g)
        return R(
          m,
          'ℹ️ *Chat Info*\n\nType: Group\nName: ' +
            g.subject +
            '\nMembers: ' +
            g.size +
            '\nID: ' +
            m.chat,
        );
    }
    return R(m, 'ℹ️ *Chat Info*\n\nType: Private\nJID: ' + m.chat + '\nNumber: +' + nameOf(m.chat));
  },
  lastmessage: async (m, sock) => {
    const q = m.quoted;
    if (!q) return R(m, '⚠️ Reply ke sath use karo   last message ki info usi se milti hy.');
    return R(
      m,
      '📩 Replied message info:\n\nFrom: @' +
        nameOf(q.sender || q.participant || '') +
        '\nText: ' +
        (qtext(m).slice(0, 100) || '(media/empty)'),
    );
  },
  repliedinfo: async (m, sock) => {
    const q = m.quoted;
    if (!q) return R(m, '⚠️ Kisi message ka reply karo.');
    const types = ['image', 'video', 'sticker', 'audio', 'document', 'contact', 'location'];
    let type = 'text';
    try {
      type = Object.keys(q.msg || {}).find((k) => types.some((t) => k.includes(t)))
        ? 'media'
        : 'text';
    } catch (e) {}
    return R(
      m,
      '🔍 Replied message:\n\n👤 Sender: @' +
        nameOf(q.sender || q.participant || '') +
        '\nType: ' +
        type +
        '\nText: ' +
        (qtext(m).slice(0, 120) || '(none)'),
    );
  },
  // ---- CONTACTS ----
  information: async (m, sock) =>
    R(
      m,
      'ℹ️ *Bot Information*\n\n🤖 ' +
        (config.BOT_NAME || 'SAQI-MD') +
        ' v' +
        (config.BOT_VERSION || '5') +
        '\n👨‍💻 Powered by Attitude King\n📋 Total commands: ' +
        ((global.__SAQI_CMDS_ALL && global.__SAQI_CMDS_ALL.size) || '2300+') +
        '\n\n.Help se sari commands dekho!',
    ),
  contacts: async (m, sock) => listCmds(m, (c) => /contact/i.test(c.name), 'Contact Commands'),
  contactinfo: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Kisi ko mention karo.');
    return R(
      m,
      '👤 *Contact Info*\n\n📱 Number: +' +
        nameOf(j) +
        '\n🆔 ' +
        j +
        '\n👤 Name: ' +
        (m.pushName || 'unknown'),
    );
  },
  contactname: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Mention karo.');
    try {
      return R(
        m,
        '👤 Display name: @' + nameOf(j) + '\n(pushName: ' + (m.pushName || 'unknown') + ')',
      );
    } catch (e) {
      return R(m, '⚠️ Name nahi mila.');
    }
  },
  contactnumber: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Mention karo.');
    return R(m, '📱 Number: +' + nameOf(j));
  },
  contactid: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Mention karo.');
    return R(m, '🆔 ' + j);
  },
  contactdp: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Mention karo.');
    try {
      const url = await sock.profilePictureUrl(j, 'image');
      await sock.sendMessage(m.chat, {
        image: { url },
        caption: '🖼️ DP of @' + nameOf(j),
        mentions: [j],
      });
      return { sent: true };
    } catch (e) {
      return R(m, '⚠️ DP nahi mili (private ya set nahi).');
    }
  },
  contactbio: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Mention karo.');
    try {
      const s = await sock.fetchStatus(j);
      const st = s && s[0] && s[0].status;
      return R(m, '📖 Bio of @' + nameOf(j) + ':\n' + (st || '(empty)'));
    } catch (e) {
      return R(m, '⚠️ Bio nahi mili.');
    }
  },
  contactstatus: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Mention karo.');
    try {
      const s = await sock.fetchStatus(j);
      const st = s && s[0] && s[0].status;
      return R(m, '🔍 @' + nameOf(j) + ' public status:\n' + (st || '(none)'));
    } catch (e) {
      return R(m, '⚠️ Status nahi mila.');
    }
  },
  contactcard: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Mention karo.');
    return R(
      m,
      '🪪 *Contact Card*\n━━━━━━━━━\n👤 @' +
        nameOf(j) +
        '\n📱 +' +
        nameOf(j) +
        '\n🆔 ' +
        j +
        '\n━━━━━━━━━',
    );
  },
  contactqr: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Mention karo.');
    const data = 'MECARD:n:' + nameOf(j) + ';tel:+' + nameOf(j) + ';;';
    await sock.sendMessage(m.chat, {
      image: {
        url:
          'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=' +
          encodeURIComponent(data),
      },
      caption: '📷 Contact QR   @' + nameOf(j),
      mentions: [j],
    });
    return { sent: true };
  },
  savecard: async (m, sock) => {
    const j = mJid(m);
    if (!j) return R(m, '⚠️ Mention karo.');
    const vcf =
      'BEGIN:VCARD\nVERSION:3.0\nFN:' + nameOf(j) + '\nTEL:+ ' + nameOf(j) + '\nEND:VCARD';
    return R(m, '💾 vCard:\n\n' + vcf);
  },
  contactsearch: async (m, sock) => {
    const q = low(A(m));
    if (!q) return R(m, '⚠️ Naam likho.');
    const l = (await kvGet(UK(m) + ':contacts')) || [];
    const hits = l.filter((c) => low(c.name).includes(q) || low(c.num).includes(q));
    return R(
      m,
      '🔍 Results:\n' +
        (hits.length ? hits.map((c) => '• ' + c.name + '   +' + c.num).join('\n') : '(koi nahi)'),
    );
  },
  contactlist: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':contacts')) || [];
    return R(
      m,
      '📇 Saved contacts (' +
        l.length +
        '):\n' +
        (l.length ? l.map((c) => '• ' + c.name + '   +' + c.num).join('\n') : '(empty)'),
    );
  },
  addcontact: async (m, sock) => {
    const j = mJid(m);
    const name = A(m);
    if (!j && !/^\+?\d+$/.test(name))
      return R(m, '⚠️ .addcontact @user naam  (ya .addcontact 923xx naam)');
    const num2 = j ? nameOf(j) : name.replace(/\D/g, '');
    const nm = j ? A(m) || nameOf(j) : A(m).split(' ').slice(1).join(' ') || nameOf(j);
    const l = (await kvGet(UK(m) + ':contacts')) || [];
    l.push({ name: nm, num: num2 });
    await kvSet(UK(m) + ':contacts', l);
    return R(m, '✅ Contact save: ' + nm + ' (+' + num2 + ')');
  },
  removecontact: async (m, sock) => {
    const q = low(A(m));
    const l = ((await kvGet(UK(m) + ':contacts')) || []).filter(
      (c) => low(c.name) !== q && c.num !== q.replace(/\D/g, ''),
    );
    await kvSet(UK(m) + ':contacts', l);
    return R(m, '🗑️ Removed (agar tha).');
  },
  renamecontact: async (m, sock) => {
    const parts = A(m).split('|');
    if (parts.length < 2) return R(m, '⚠️ .renamecontact old | new');
    const oldn = parts[0].trim();
    const l = (await kvGet(UK(m) + ':contacts')) || [];
    const c = l.find((x) => low(x.name) === low(oldn));
    if (!c) return R(m, '⚠️ Contact nahi mila.');
    c.name = parts[1].trim();
    await kvSet(UK(m) + ':contacts', l);
    return R(m, '✅ Rename: ' + c.name);
  },
  contactnote: async (m, sock) => {
    const parts = A(m).split('|');
    if (parts.length < 2) return R(m, '⚠️ .contactnote naam | note');
    await kvPush(UK(m) + ':cnotes', {
      who: parts[0].trim(),
      text: parts.slice(1).join('|').trim(),
    });
    return R(m, '✅ Note save.');
  },
  contactnotes: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':cnotes')) || [];
    if (!l.length) return R(m, 'ℹ️ Koi notes nahi.');
    return R(m, '📝 Contact notes:\n' + l.map((n) => '• ' + n.who + ': ' + n.text).join('\n'));
  },
  addcontactnote: async (m, sock) => {
    const parts = A(m).split('|');
    if (parts.length < 2) return R(m, '⚠️ .addcontactnote naam | note');
    await kvPush(UK(m) + ':cnotes', {
      who: parts[0].trim(),
      text: parts.slice(1).join('|').trim(),
    });
    return R(m, '✅ Note add.');
  },
  delcontactnote: async (m, sock) => {
    const n = num(A(m));
    const l = (await kvGet(UK(m) + ':cnotes')) || [];
    if (!n || n < 1 || n > l.length) return R(m, '⚠️ Note number do.');
    l.splice(n - 1, 1);
    await kvSet(UK(m) + ':cnotes', l);
    return R(m, '🗑️ Note delete.');
  },
  contactreminder: async (m, sock) => {
    const mins = num(A(m).split(' ')[0]);
    const text = A(m).split(' ').slice(1).join(' ');
    if (!mins || !text) return R(m, '⚠️ .contactreminder <min> <text>');
    await setRem(m, UK(m) + ':crem', mins * 60000, text);
    return R(m, '⏰ Reminder set.');
  },
  contactreminders: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':crem')) || [];
    return R(
      m,
      '⏰ Contact reminders: ' + (l.length ? l.map((r) => '• ' + r.text).join('\n') : '(koi nahi)'),
    );
  },
  delcontactreminder: async (m, sock) => {
    await kvSet(UK(m) + ':crem', []);
    return R(m, '🗑️ Saare reminders clear.');
  },
  contactgroup: async (m, sock) =>
    R(
      m,
      '👥 Shared groups WhatsApp app me dikhaye jate hyn:\nContact → Groups in common\n(Bot ye data publicly fetch nahi kar sakta)',
    ),
  sharedgroups: async (m, sock) =>
    R(m, '👥 WhatsApp app me contact kholo → "Groups in common"   wo official tareeqa hy.'),
  contacthelp: async (m, sock) => listCmds(m, (c) => /contact/.test(c.name), 'Contact Commands'),
  contactsettings: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':contacts')) || [];
    const n = (await kvGet(UK(m) + ':cnotes')) || [];
    return R(m, '⚙️ Contact settings:\nSaved contacts: ' + l.length + '\nNotes: ' + n.length);
  },
  contactcount: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':contacts')) || [];
    return R(m, '🔢 Saved contacts: ' + l.length);
  },
  contactexport: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':contacts')) || [];
    return R(
      m,
      '📤 Export:\n' + (l.length ? l.map((c) => c.name + ',' + c.num).join('\n') : '(empty)'),
    );
  },
  contactimport: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do (name,number per line).');
    const rows = t
      .split('\n')
      .map((r) => r.split(','))
      .filter((p) => p.length >= 2 && /\d{7,}/.test(p[1] || ''));
    const l = (await kvGet(UK(m) + ':contacts')) || [];
    rows.forEach((p) => l.push({ name: p[0].trim(), num: p[1].replace(/\D/g, '') }));
    await kvSet(UK(m) + ':contacts', l);
    return R(m, '✅ ' + rows.length + ' contacts import ho gaye.');
  },
  contactbackup: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':contacts')) || [];
    await kvSet(UK(m) + ':cbackup', l);
    return R(m, '💾 Contacts backup (' + l.length + ').');
  },
  contactrestore: async (m, sock) => {
    const b = await kvGet(UK(m) + ':cbackup');
    if (!b) return R(m, 'ℹ️ Koi backup nahi.');
    await kvSet(UK(m) + ':contacts', b);
    return R(m, '♻️ ' + b.length + ' contacts restore.');
  },
};

const R3 = {
  // handlers part 3: stickers & simple media + files & documents

  // ---- STICKERS ----
  makepack: async (m, sock) => {
    const name = A(m) || 'MyPack';
    const l = (await kvGet(UK(m) + ':packs')) || {};
    if (l[name]) return R(m, '⚠️ Pack "' + name + '" pehle se hy. .packlist dekho.');
    l[name] = { author: m.pushName || 'unknown', stickers: [], cover: '' };
    await kvSet(UK(m) + ':packs', l);
    return R(m, '📦 Sticker pack "' + name + '" bana! .packadd se stickers add karo.');
  },
  packadd: async (m, sock) => {
    const pack = A(m).split(' ')[0] || 'MyPack';
    const label = A(m).split(' ').slice(1).join(' ');
    const l = (await kvGet(UK(m) + ':packs')) || {};
    if (!l[pack]) return R(m, '⚠️ Pack "' + pack + '" nahi. .makepack ' + pack);
    l[pack].stickers.push(label || 'sticker-' + (l[pack].stickers.length + 1));
    await kvSet(UK(m) + ':packs', l);
    return R(m, '✅ "' + pack + '" me sticker add   total: ' + l[pack].stickers.length);
  },
  packremove: async (m, sock) => {
    const pack = A(m).split(' ')[0];
    const idx = num(A(m).split(' ')[1]);
    const l = (await kvGet(UK(m) + ':packs')) || {};
    if (!l[pack] || !idx || idx > l[pack].stickers.length)
      return R(m, '⚠️ .packremove <pack> <number>');
    l[pack].stickers.splice(idx - 1, 1);
    await kvSet(UK(m) + ':packs', l);
    return R(m, '🗑️ Sticker ' + idx + ' removed from "' + pack + '".');
  },
  packlist: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':packs')) || {};
    const keys = Object.keys(l);
    if (!keys.length) return R(m, 'ℹ️ Koi packs nahi. .makepack se banao.');
    return R(
      m,
      '📦 Sticker packs:\n' +
        keys
          .map((k) => '• ' + k + ' (' + l[k].stickers.length + ' stickers, by ' + l[k].author + ')')
          .join('\n'),
    );
  },
  packrename: async (m, sock) => {
    const parts = A(m).split('|');
    if (parts.length < 2) return R(m, '⚠️ .packrename old | new');
    const l = (await kvGet(UK(m) + ':packs')) || {};
    const o = parts[0].trim();
    if (!l[o]) return R(m, '⚠️ Pack nahi mila.');
    l[parts[1].trim()] = l[o];
    delete l[o];
    await kvSet(UK(m) + ':packs', l);
    return R(m, '✅ Renamed to "' + parts[1].trim() + '"');
  },
  packauthor: async (m, sock) => {
    const parts = A(m).split(' ');
    const l = (await kvGet(UK(m) + ':packs')) || {};
    if (!l[parts[0]]) return R(m, '⚠️ .packauthor <pack> <author>');
    l[parts[0]].author = parts.slice(1).join(' ') || 'unknown';
    await kvSet(UK(m) + ':packs', l);
    return R(m, '✅ Author set: ' + l[parts[0]].author);
  },
  packcover: async (m, sock) => {
    const parts = A(m).split(' ');
    const l = (await kvGet(UK(m) + ':packs')) || {};
    if (!l[parts[0]]) return R(m, '⚠️ .packcover <pack> <label>');
    l[parts[0]].cover = parts.slice(1).join(' ');
    await kvSet(UK(m) + ':packs', l);
    return R(m, '✅ Cover set for "' + parts[0] + '"');
  },
  packdelete: async (m, sock) => {
    const p = A(m);
    const l = (await kvGet(UK(m) + ':packs')) || {};
    if (!l[p]) return R(m, '⚠️ Pack nahi mila.');
    delete l[p];
    await kvSet(UK(m) + ':packs', l);
    return R(m, '🗑️ Pack "' + p + '" deleted.');
  },
  stickerinfo2: async (m, sock) => {
    const q = m.quoted;
    if (!q) return R(m, '⚠️ Kisi sticker ka reply karo.');
    const type = q.msg
      ? Object.keys(q.msg).find((k) => k.includes('sticker')) || 'unknown'
      : 'unknown';
    return R(
      m,
      'ℹ️ Sticker info:\nType: ' + type + '\nFrom: @' + nameOf(q.sender || q.participant || ''),
    );
  },
  stickerid: async (m, sock) => {
    const q = m.quoted;
    if (!q) return R(m, '⚠️ Sticker ka reply karo.');
    return R(m, '🆔 Sticker message key:\n' + (q.id || q.key || '(id available nahi)'));
  },
  stickerauthor: async (m, sock) => {
    const q = m.quoted;
    if (!q) return R(m, '⚠️ Sticker ka reply karo.');
    return R(
      m,
      '✍️ Sticker from: @' +
        nameOf(q.sender || q.participant || '') +
        '\n(Sticker file ke andar author metadata hota hy   WhatsApp use dikhata hy jab pack install ho)',
    );
  },
  stickerpack2: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':packs')) || {};
    const keys = Object.keys(l);
    if (!keys.length) return R(m, 'ℹ️ Koi packs nahi.');
    return R(
      m,
      '📦 Current packs:\n' +
        keys.map((k) => '• ' + k + '   ' + l[k].stickers.length + ' stickers').join('\n'),
    );
  },
  stickertext2: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('tssticker');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ Text sticker: .stickertext2 <text>');
  },
  stickeremoji2: async (m, sock) => {
    const e = A(m) || '🔥';
    return R(
      m,
      '✨ Emoji sticker ready: ' + e + '\n(WhatsApp me bhejne ke liye .sticker se image banao)',
    );
  },
  stickerquote: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text do ya reply karo.');
    return R(m, '🏷️ Quote sticker text:\n\n❝ ' + t + ' ❞\n\n(.tssticker se banao)');
  },
  stickerlabel: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Label text do.');
    return R(
      m,
      '🏷️ Label ready: [' + t + ']\nSticker par lagane ke liye image editor use karo ya .tssticker',
    );
  },
  stickercrop2: async (m, sock) =>
    R(
      m,
      '✂️ Crop: image ka reply karo + size (e.g. .stickercrop2 400)\nNote: sticker banana .sticker khud square crop karta hy (512x512).',
    ),
  stickerfit: async (m, sock) =>
    R(
      m,
      '🖼️ Fit: image ko 512x512 canvas par fit karne ke liye image ka reply karo   .sticker seedha ye karta hy.',
    ),
  stickerpad: async (m, sock) =>
    R(m, '🔲 Padding: .sticker me auto-padding hoti hy. Custom chahiye to .stickertext2 try karo.'),
  stickersquare: async (m, sock) =>
    R(m, '⬜ Square canvas: .sticker har image ko 512x512 square bana deta hy.'),
  stickerround2: async (m, sock) =>
    R(
      m,
      '⚪ Round sticker: .sticker <圆形>   WhatsApp round crop chat me dikhata hy. Image ka reply kar ke .sticker use karo.',
    ),
  stickerframe2: async (m, sock) =>
    R(m, '🖼️ Frame: image reply + .sticker   border ke liye .stickertext2 <text> try karo.'),
  stickertitle: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Title do.');
    return R(m, '🔖 Title: ' + t.toUpperCase() + '\n(.tssticker se sticker banta hy)');
  },
  stickerbadge: async (m, sock) => R(m, '🔰 Badge text ready: [' + (A(m) || 'NEW') + ']'),
  stickerdate: async (m, sock) =>
    R(
      m,
      '📅 Date label: ' +
        new Date().toDateString() +
        '\n(.tssticker is text se sticker bana sakta hy)',
    ),
  stickertime: async (m, sock) => R(m, '⏰ Time label: ' + new Date().toLocaleTimeString()),
  stickersign: async (m, sock) =>
    R(m, '✍️ Signature:   ' + (A(m) || m.pushName || 'Attitude King')),
  stickerwatermark: async (m, sock) =>
    R(
      m,
      '💧 Watermark text: ' +
        (A(m) || '@' + nameOf(m.sender)) +
        '\nWatermarked sticker ke liye .tssticker use karo.',
    ),
  stickermerge: async (m, sock) =>
    R(
      m,
      '🧩 Merge: abhi ek waqt me ek image → .sticker. Do images ko milane ke liye pehle dono banake .stickermerge me bhejo (coming).',
    ),
  stickergrid: async (m, sock) => R(m, '🔲 Grid preview: pack ke stickers ki list   .packlist'),
  stickerpreview: async (m, sock) => {
    const p = A(m) || 'MyPack';
    const l = (await kvGet(UK(m) + ':packs')) || {};
    if (!l[p]) return R(m, '⚠️ Pack nahi mila. .packlist dekho.');
    return R(
      m,
      '👁️ Pack "' + p + '" preview:\n' + l[p].stickers.map((s, i) => i + 1 + '. ' + s).join('\n'),
    );
  },
  stickerdelete: async (m, sock) => {
    await kvSet(UK(m) + ':laststicker', null);
    return R(m, '🗑️ Last generated sticker reference clear.');
  },
  // ---- MEDIA INFO ----
  mediainfo2: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ Kisi media ka reply karo.');
    const k = Object.keys(q.msg)[0];
    const c = q.msg[k] || {};
    return R(
      m,
      'ℹ️ Media info:\n\nType: ' +
        k +
        '\nSize: ' +
        (c.fileLength ? Math.round(c.fileLength / 1024) + ' KB' : '?') +
        '\nMIME: ' +
        (c.mimetype || '?') +
        (c.seconds ? '\nDuration: ' + c.seconds + 's' : ''),
    );
  },
  mediasize: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ Media ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    return R(
      m,
      '📏 Size: ' +
        (c.fileLength
          ? c.fileLength > 1048576
            ? (c.fileLength / 1048576).toFixed(2) + ' MB'
            : Math.round(c.fileLength / 1024) + ' KB'
          : '?'),
    );
  },
  mediaformat: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ Media ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    return R(m, '🎞️ Format: ' + (c.mimetype || '?'));
  },
  mediaduration: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ Audio/video ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    return R(
      m,
      '⏱️ Duration: ' + (c.seconds ? c.seconds + 's' : '(text/image ka duration nahi hota)'),
    );
  },
  mediaresolution: async (m, sock) =>
    R(
      m,
      '📐 Resolution media file ke metadata me hota hy   .mediainfo2 se details dekho (WhatsApp resolution header nahi bhejta).',
    ),
  mediarename: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ .mediarename <new-name>');
    const l = (await kvGet(UK(m) + ':media')) || [];
    l.push({ name: t, at: Date.now() });
    await kvSet(UK(m) + ':media', l.slice(-20));
    return R(m, '✏️ "' + t + '" saved to media list.');
  },
  mediacopy: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ Media ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    return R(
      m,
      '📋 Media metadata:\n' +
        JSON.stringify(
          { mimetype: c.mimetype, fileLength: c.fileLength, page: c.pageCount || undefined },
          null,
          2,
        ),
    );
  },
  mediaquote: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ Media ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    return R(
      m,
      '↩️ Media: ' +
        (c.mimetype || 'unknown') +
        ' (' +
        Math.round((c.fileLength || 0) / 1024) +
        ' KB)',
    );
  },
  mediacaption: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Caption text do.');
    return R(m, '💬 Caption ready: "' + t + '"\nMedia bhejte waqt caption field me ye likho.');
  },
  mediaextract: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ Media ka reply karo.');
    const k = Object.keys(q.msg)[0];
    const c = q.msg[k] || {};
    return R(
      m,
      '🧪 Extracted metadata:\n' +
        JSON.stringify(
          {
            type: k,
            mimetype: c.mimetype,
            fileLength: c.fileLength,
            seconds: c.seconds,
            ptt: c.ptt,
            width: c.width,
            height: c.height,
          },
          null,
          2,
        ),
    );
  },
  mediapreview: async (m, sock) =>
    R(
      m,
      '👁️ Preview: image ka reply karo aur wo directly chat me dikh jati hy. Document ke liye .filepreview try karo.',
    ),
  mediaarchive: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ Media ka reply karo.');
    const k = Object.keys(q.msg)[0];
    const c = q.msg[k] || {};
    await kvPush(UK(m) + ':mediaarch', { type: k, mime: c.mimetype, size: c.fileLength }, 50);
    return R(m, '🗄️ Media metadata archive ho gaya. .medialist se dekho.');
  },
  medialist: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':mediaarch')) || [];
    return R(
      m,
      '📋 Media archive (' +
        l.length +
        '):\n' +
        (l.length
          ? l.map((e, i) => i + 1 + '. ' + e.type + ' ' + (e.mime || '')).join('\n')
          : '(empty)'),
    );
  },
  mediaclear: async (m, sock) => {
    await kvSet(UK(m) + ':mediaarch', []);
    return R(m, '🗑️ Media archive clear.');
  },
  mediahelp: async (m, sock) => listCmds(m, (c) => /media|sticker/.test(c.name), 'Media Commands'),
  // ---- FILES & DOCUMENTS ----
  fileinfo: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ File/document ka reply karo.');
    const k = Object.keys(q.msg).find((x) => x.includes('document')) || Object.keys(q.msg)[0];
    const c = q.msg[k] || {};
    return R(
      m,
      '📄 File info:\n\nName: ' +
        (c.fileName || '(none)') +
        '\nMIME: ' +
        (c.mimetype || '?') +
        '\nSize: ' +
        (c.fileLength ? Math.round(c.fileLength / 1024) + ' KB' : '?'),
    );
  },
  filesize: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ File ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    const b = c.fileLength || 0;
    return R(
      m,
      '📏 ' +
        (b > 1048576
          ? (b / 1048576).toFixed(2) + ' MB'
          : Math.max(0, Math.round(b / 1024)) + ' KB'),
    );
  },
  filetype: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ File ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    return R(m, '🏷️ MIME: ' + (c.mimetype || '?'));
  },
  filename: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ File ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    return R(m, '📛 ' + (c.fileName || '(file name set nahi)'));
  },
  filerename: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ .filerename <new-name.ext>');
    const l = (await kvGet(UK(m) + ':files')) || [];
    l.push({ name: t, at: Date.now() });
    await kvSet(UK(m) + ':files', l.slice(-30));
    return R(m, '✏️ "' + t + '" file list me save.');
  },
  filecopy: async (m, sock) =>
    R(
      m,
      '📑 Copy: media ka reply karo aur forward karo   WhatsApp forward hi proper copy hy. Bot-side copy ke liye .filebackup try karo.',
    ),
  filelist: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':files')) || [];
    return R(
      m,
      '📁 Bot files (' +
        l.length +
        '):\n' +
        (l.length ? l.map((f, i) => i + 1 + '. ' + f.name).join('\n') : '(empty)'),
    );
  },
  filedelete: async (m, sock) => {
    const n = num(A(m));
    const l = (await kvGet(UK(m) + ':files')) || [];
    if (!n || n < 1 || n > l.length) return R(m, '⚠️ File number do (1-' + l.length + ').');
    const rem = l.splice(n - 1, 1);
    await kvSet(UK(m) + ':files', l);
    return R(m, '🗑️ Deleted: ' + rem[0].name);
  },
  fileclear: async (m, sock) => {
    await kvSet(UK(m) + ':files', []);
    return R(m, '🗑️ File list clear.');
  },
  filepreview: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ Document ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    return R(
      m,
      '👁️ Preview (metadata):\n' +
        (c.fileName || 'file') +
        '\n' +
        (c.mimetype || '') +
        '\n' +
        Math.round((c.fileLength || 0) / 1024) +
        ' KB',
    );
  },
  filetext: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text file ka reply karo ya text do.');
    return R(m, '📄 File text:\n\n' + t.slice(0, 1500));
  },
  filelines: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text ka reply karo.');
    return R(m, '🔢 Lines: ' + t.split('\n').length);
  },
  filewords: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text ka reply karo.');
    return R(m, '🔢 Words: ' + t.split(/\s+/).filter(Boolean).length);
  },
  filechars: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text ka reply karo.');
    return R(m, '🔢 Characters: ' + t.length);
  },
  filehead: async (m, sock) => {
    const t = qtext(m) || A(m);
    const n = num(A(m).split(' ')[0]) || 5;
    if (!t) return R(m, '⚠️ Text ka reply karo.');
    return R(m, '⬆️ First ' + n + ' lines:\n' + t.split('\n').slice(0, n).join('\n'));
  },
  filetail: async (m, sock) => {
    const t = qtext(m) || A(m);
    const n = num(A(m).split(' ')[0]) || 5;
    if (!t) return R(m, '⚠️ Text ka reply karo.');
    return R(m, '⬇️ Last ' + n + ' lines:\n' + t.split('\n').slice(-n).join('\n'));
  },
  filemerge: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text do.');
    await kvPush(UK(m) + ':merge', { text: t }, 50);
    const l = (await kvGet(UK(m) + ':merge')) || [];
    return R(m, '🔗 Merge list: ' + l.length + ' parts. (.filejoin se join hoga)');
  },
  filecompare: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Pehli file ka text do.');
    await kvSet(UK(m) + ':cmp', t);
    return R(
      m,
      '1️⃣ Pehli text saved. Ab doosri file ka reply kar ke dobara .filecompare   diff mil jayega.',
    );
  },
  filebackup: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text/file content do.');
    await kvPush(UK(m) + ':fbackup', { text: t, at: Date.now() }, 20);
    return R(
      m,
      '💾 Backup saved (' + ((await kvGet(UK(m) + ':fbackup')) || []).length + ' total).',
    );
  },
  filerestore: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':fbackup')) || [];
    if (!l.length) return R(m, 'ℹ️ Koi backup nahi.');
    return R(m, '♻️ Latest backup:\n\n' + l[l.length - 1].text.slice(0, 1200));
  },
  filezip: async (m, sock) =>
    R(m, '🗜️ ZIP: bot sirf text-files bana sakta hy (.filetxt). Binary ZIP abhi supported nahi.'),
  fileunzip: async (m, sock) =>
    R(
      m,
      '📂 Unzip: ZIP file bot sandbox tak nahi pohanchti   .filelist dekho ya file ko phone par kholo.',
    ),
  filelistzip: async (m, sock) => R(m, '📋 ZIP listing support nahi   .fileunzip dekho.'),
  filepdfinfo: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ PDF ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    return R(
      m,
      '📕 PDF info:\nSize: ' +
        Math.round((c.fileLength || 0) / 1024) +
        ' KB\nMIME: ' +
        (c.mimetype || '?') +
        '\n(Pages count WhatsApp metadata me nahi hota)',
    );
  },
  filedocinfo: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ Document ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    return R(
      m,
      '📘 Doc info:\nName: ' +
        (c.fileName || '?') +
        '\nMIME: ' +
        (c.mimetype || '?') +
        '\nSize: ' +
        Math.round((c.fileLength || 0) / 1024) +
        ' KB',
    );
  },
  filecsvinfo: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ CSV text ka reply karo.');
    const rows = t.trim().split('\n');
    return R(
      m,
      '📊 CSV: ' + rows.length + ' rows, ' + (rows[0] || '').split(',').length + ' columns',
    );
  },
  filejsoninfo: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ JSON ka reply karo.');
    try {
      const j = JSON.parse(t);
      const keys = typeof j === 'object' ? Object.keys(j) : [];
      return R(
        m,
        '🧾 JSON: valid ✅\nTop-level keys (' + keys.length + '): ' + keys.slice(0, 15).join(', '),
      );
    } catch (e) {
      return R(m, '❌ Invalid JSON: ' + e.message.slice(0, 80));
    }
  },
  filetxt: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do.');
    const buf = Buffer.from(t, 'utf8');
    await sock.sendMessage(m.chat, {
      document: buf,
      mimetype: 'text/plain',
      fileName: 'saqi-file-' + Date.now() + '.txt',
    });
    return { sent: true };
  },
  filecsv: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Rows do (comma-separated lines).');
    const buf = Buffer.from(t, 'utf8');
    await sock.sendMessage(m.chat, {
      document: buf,
      mimetype: 'text/csv',
      fileName: 'saqi-' + Date.now() + '.csv',
    });
    return { sent: true };
  },
  filejson: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ key=value lines do.');
    const j = {};
    t.split('\n').forEach((r) => {
      const p = r.split('=');
      if (p.length >= 2) j[p[0].trim()] = p.slice(1).join('=').trim();
    });
    const buf = Buffer.from(JSON.stringify(j, null, 2));
    await sock.sendMessage(m.chat, {
      document: buf,
      mimetype: 'application/json',
      fileName: 'saqi-' + Date.now() + '.json',
    });
    return { sent: true };
  },
  filemd: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Markdown text do.');
    const buf = Buffer.from(t, 'utf8');
    await sock.sendMessage(m.chat, {
      document: buf,
      mimetype: 'text/markdown',
      fileName: 'saqi-' + Date.now() + '.md',
    });
    return { sent: true };
  },
  filehtml: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do.');
    const html =
      '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>' + t + '</body></html>';
    const buf = Buffer.from(html);
    await sock.sendMessage(m.chat, {
      document: buf,
      mimetype: 'text/html',
      fileName: 'saqi-' + Date.now() + '.html',
    });
    return { sent: true };
  },
  filebase64: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text/file ka reply karo.');
    const b64 = Buffer.from(t, 'utf8').toString('base64');
    return R(m, '🔐 Base64:\n' + b64.slice(0, 1500));
  },
  base64file: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Base64 text do.');
    try {
      const buf = Buffer.from(t, 'base64');
      await sock.sendMessage(m.chat, {
        document: buf,
        mimetype: 'application/octet-stream',
        fileName: 'decoded-' + Date.now() + '.bin',
      });
      return { sent: true };
    } catch (e) {
      return R(m, '❌ Invalid base64.');
    }
  },
  filechecksum: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text/file ka reply karo.');
    const h = crypto.createHash('sha256').update(t).digest('hex');
    return R(m, '🔒 SHA-256:\n' + h);
  },
  filehash: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(
      m,
      '🔒 Hashes:\nMD5: ' +
        crypto.createHash('md5').update(t).digest('hex') +
        '\nSHA1: ' +
        crypto.createHash('sha1').update(t).digest('hex'),
    );
  },
  filemime: async (m, sock) => {
    const q = m.quoted;
    if (!q || !q.msg) return R(m, '⚠️ File ka reply karo.');
    const c = q.msg[Object.keys(q.msg)[0]] || {};
    return R(m, '🏷️ ' + (c.mimetype || '?'));
  },
  filepath: async (m, sock) =>
    R(
      m,
      '📂 Bot files /tmp me bante hyn aur seedha chat me document ban ke jate hyn   koi public path nahi.',
    ),
  filecreated: async (m, sock) =>
    R(
      m,
      '📅 Bot session start: ' +
        new Date(Math.floor(Date.now() / 1) - process.uptime() * 1000).toDateString(),
    ),
  filemodified: async (m, sock) =>
    R(m, '🕒 Bot uptime: ' + Math.floor(process.uptime() / 60) + ' min'),
  fileempty: async (m, sock) => {
    const t = qtext(m);
    if (t === '') return R(m, '⚠️ Text file ka reply karo.');
    return R(m, t.trim() ? '📄 File NOT empty (' + t.length + ' chars).' : '📄 File EMPTY hy.');
  },
  fileencoding: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text do.');
    const ascii = /^[\x00-\x7F]*$/.test(t);
    return R(
      m,
      '🔤 Encoding: ' + (ascii ? 'ASCII (7-bit) compatible' : 'UTF-8 (non-ASCII chars present)'),
    );
  },
  fileclean: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(
      m,
      '🧹 Cleaned:\n' +
        t
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .join('\n'),
    );
  },
  filewrap: async (m, sock) => {
    const w = num(A(m).split(' ')[0]) || 40;
    const t = qtext(m) || A(m).split(' ').slice(1).join(' ');
    if (!t) return R(m, '⚠️ .filewrap <width> <text>');
    const words = t.split(' ');
    const lines = [];
    let cur = '';
    words.forEach((x) => {
      if ((cur + ' ' + x).trim().length > w) {
        lines.push(cur.trim());
        cur = x;
      } else cur += ' ' + x;
    });
    if (cur.trim()) lines.push(cur.trim());
    return R(m, '📦 Wrapped (' + w + ' chars):\n' + lines.join('\n'));
  },
  filejoin: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':merge')) || [];
    if (!l.length) return R(m, 'ℹ️ Pehle .filemerge se parts add karo.');
    const joined = l.map((p) => p.text).join('\n');
    await kvSet(UK(m) + ':merge', []);
    return R(m, '🔗 Joined (' + l.length + ' parts):\n\n' + joined.slice(0, 2000));
  },
  filesplit: async (m, sock) => {
    const n = num(A(m).split(' ')[0]) || 2;
    const t = qtext(m) || A(m).split(' ').slice(1).join(' ');
    if (!t) return R(m, '⚠️ .filesplit <parts> <text>');
    const size = Math.ceil(t.length / n);
    const parts = [];
    for (let i = 0; i < t.length; i += size) parts.push(t.slice(i, i + size));
    return R(
      m,
      '✂️ ' +
        parts.length +
        ' parts:\n\n' +
        parts
          .map((p, i) => '  Part ' + (i + 1) + '  \n' + p)
          .join('\n')
          .slice(0, 2000),
    );
  },
  filechunks: async (m, sock) => {
    const t = qtext(m) || A(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(m, '🧮 1000-char chunks: ' + Math.ceil(t.length / 1000));
  },
  filehelp: async (m, sock) => listCmds(m, (c) => /file/.test(c.name), 'File Commands'),
};

const R4 = {
  // handlers part 4: bot config + search + everyday tools

  // ---- BOT CONFIG ----
  setreplymode: async (m, sock) => {
    const v = low(A(m));
    if (!['quote', 'text'].includes(v)) return R(m, '⚠️ .setreplymode quote/text');
    await kvSet('x2cfg:' + nameOf(m.sender) + ':replymode', v);
    return R(m, '✅ Reply mode: ' + v);
  },
  replymode: async (m, sock) => {
    const v = await kvGet('x2cfg:' + nameOf(m.sender) + ':replymode', 'text');
    return R(m, 'ℹ️ Reply mode: ' + v);
  },
  setreactmode: async (m, sock) => {
    const v = low(A(m));
    if (!['on', 'off', 'random'].includes(v)) return R(m, '⚠️ .setreactmode on/off/random');
    await kvSet('x2cfg:' + nameOf(m.sender) + ':reactmode', v);
    return R(m, '✅ Reaction mode: ' + v);
  },
  reactmode: async (m, sock) => {
    const v = await kvGet('x2cfg:' + nameOf(m.sender) + ':reactmode', 'off');
    return R(m, 'ℹ️ Reaction mode: ' + v);
  },
  setreadmode: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('autoread');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ autoread toggle nahi mila.');
  },
  readmode: async (m, sock) =>
    R(
      m,
      'ℹ️ Blue-tick (read) ka control .autoread on/off se hota hy   wo toggle message reads ko switch karta hy.',
    ),
  setpresence: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('online');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ online toggle nahi mila.');
  },
  presence: async (m, sock) =>
    R(m, 'ℹ️ Presence (online/grey tick) ka control .online on/off se hota hy.'),
  setstatusmsg: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Text do.');
    try {
      await sock.updateProfileStatus(t);
      return R(m, '✅ Bot bio/status update: ' + t);
    } catch (e) {
      return R(m, '⚠️ Update nahi hua: ' + e.message);
    }
  },
  statusmsg: async (m, sock) =>
    R(
      m,
      'ℹ️ Bot ka current status change karne ke liye .setstatusmsg <text>   current bio WhatsApp profile par nazar aata hy.',
    ),
  ownerlist: async (m, sock) => {
    const l = (await kvGet('x2extraowners')) || [];
    return R(
      m,
      '👑 Owners:\n• Config owners: ' +
        (config.OWNER_NUMBERS || []).join(', ') +
        '\n• Extra owners: ' +
        (l.length ? l.join(', ') : '(none)'),
    );
  },
  addowner: async (m, sock) => {
    const n = A(m).replace(/\D/g, '');
    if (!n) return R(m, '⚠️ Number do: .addowner 923xxxxxxxxx');
    const l = (await kvGet('x2extraowners')) || [];
    if (!l.includes(n)) l.push(n);
    await kvSet('x2extraowners', l);
    return R(m, '✅ Owner add: +' + n + '\n(Note: command-level list   restart-safe)');
  },
  removeowner: async (m, sock) => {
    const n = A(m).replace(/\D/g, '');
    const l = ((await kvGet('x2extraowners')) || []).filter((x) => x !== n);
    await kvSet('x2extraowners', l);
    return R(m, '🗑️ Owner removed: +' + n);
  },
  setprefix3: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('setprefix');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ setprefix nahi mila.');
  },
  prefixinfo: async (m, sock) =>
    R(m, 'ℹ️ Active prefix: ' + (config.PREFIX || '.') + '\n(.setprefix se change karo)'),
  resetprefix2: async (m, sock) => {
    config.PREFIX = '.';
    return R(m, '♻️ Prefix reset: .');
  },
  setlanguage2: async (m, sock) => {
    const v = low(A(m));
    if (!v) return R(m, '⚠️ .setlanguage2 urdu/english');
    await kvSet('x2cfg:lang', v);
    return R(m, '✅ Language: ' + v);
  },
  langinfo: async (m, sock) => {
    const v = await kvGet('x2cfg:lang', 'roman-urdu');
    return R(m, 'ℹ️ Interface language: ' + v);
  },
  settimezone2: async (m, sock) => {
    const v = A(m);
    try {
      new Intl.DateTimeFormat('en', { timeZone: v });
      await kvSet('x2cfg:tz', v);
      return R(
        m,
        '✅ Timezone: ' +
          v +
          '\nAb: ' +
          new Intl.DateTimeFormat('en-GB', { timeZone: v, timeStyle: 'short' }).format(new Date()),
      );
    } catch (e) {
      return R(m, '⚠️ Invalid timezone (e.g. Asia/Karachi).');
    }
  },
  tzinfo: async (m, sock) => {
    const v = await kvGet('x2cfg:tz', 'UTC');
    return R(m, 'ℹ️ Timezone: ' + v + '\nAb: ' + fmtIn(v));
  },
  setbotdp: async (m, sock) => {
    const q = m.quoted;
    if (!q || !(q.msg && q.msg.image)) return R(m, '⚠️ Image ka reply karo phir .setbotdp');
    try {
      await sock.updateProfilePicture(sock.user.id, q.msg.image);
      return R(m, '✅ Bot DP update ho gayi!');
    } catch (e) {
      return R(m, '⚠️ DP update nahi hui: ' + e.message.slice(0, 60));
    }
  },
  getbotdp: async (m, sock) => {
    try {
      const u = await sock.profilePictureUrl(sock.user.id, 'image');
      await sock.sendMessage(m.chat, { image: { url: u }, caption: '🖼️ Bot DP' });
      return { sent: true };
    } catch (e) {
      return R(m, '⚠️ DP nahi mili.');
    }
  },
  setbotbio: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Text do.');
    try {
      await sock.updateProfileStatus(t);
      return R(m, '✅ Bot bio update: ' + t);
    } catch (e) {
      return R(m, '⚠️ ' + e.message.slice(0, 60));
    }
  },
  getbotbio: async (m, sock) => {
    try {
      const s = await sock.fetchStatus(sock.user.id);
      return R(m, '📖 Bot bio: ' + ((s && s[0] && s[0].status) || '(empty)'));
    } catch (e) {
      return R(m, '⚠️ Bio nahi mili.');
    }
  },
  setbotdesc: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Text do.');
    await kvSet('x2cfg:botdesc', t);
    return R(m, '✅ Bot description set: ' + t);
  },
  getbotdesc: async (m, sock) => {
    const t = await kvGet('x2cfg:botdesc');
    return R(m, 'ℹ️ Bot description: ' + (t || '(set nahi)'));
  },
  getfooter: async (m, sock) => {
    const t = await kvGet('x2cfg:footer');
    return R(m, '🦶 Footer: ' + (t || '(default   Powered by Attitude King)'));
  },
  clearfooter: async (m, sock) => {
    await kvSet('x2cfg:footer', null);
    return R(m, '🗑️ Footer default par.');
  },
  setprefixhelp: async (m, sock) =>
    R(
      m,
      '🔧 Prefix help:\n.setprefix <symbol>   change\n.prefixinfo   current\n.resetprefix2   default (.)',
    ),
  config: async (m, sock) => {
    const tz = await kvGet('x2cfg:tz', 'UTC');
    const lang = await kvGet('x2cfg:lang', 'roman-urdu');
    return R(
      m,
      '⚙️ *Config Summary*\n\n🤖 ' +
        (config.BOT_NAME || 'SAQI-MD') +
        ' v' +
        (config.BOT_VERSION || '5') +
        '\n_prefix: ' +
        (config.PREFIX || '.') +
        '\n🌍 TZ: ' +
        tz +
        '\n🗣️ Lang: ' +
        lang +
        '\n📋 Commands: ' +
        ((global.__SAQI_CMDS_ALL && global.__SAQI_CMDS_ALL.size) || '?'),
    );
  },
  configcheck: async (m, sock) => {
    const ok = {
      mongo: !!process.env.MONGODB_URI || 'env-based',
      gemini: !!process.env.GEMINI_API_KEY,
      prefix: !!config.PREFIX,
      version: config.BOT_VERSION || '?',
    };
    return R(
      m,
      '🩺 Config check:\n' +
        Object.entries(ok)
          .map(([k, v]) => '• ' + k + ': ' + v)
          .join('\n'),
    );
  },
  configreset: async (m, sock) => {
    await kvSet('x2cfg:' + nameOf(m.sender) + ':replymode', null);
    await kvSet('x2cfg:' + nameOf(m.sender) + ':reactmode', null);
    await kvSet('x2cfg:tz', 'UTC');
    await kvSet('x2cfg:lang', 'roman-urdu');
    return R(m, '♻️ Safe preferences default par reset.');
  },
  featurelist: async (m, sock) => {
    const all = regList()
      .filter((c) => c.category)
      .reduce((a, c) => {
        a[c.category] = (a[c.category] || 0) + 1;
        return a;
      }, {});
    return R(
      m,
      '🧩 Features (categories):\n' +
        Object.entries(all)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => '• ' + k + ': ' + v + ' commands')
          .join('\n'),
    );
  },
  featureinfo: async (m, sock) => {
    const f = low(A(m));
    if (!f) return R(m, '⚠️ Feature/category naam do.');
    const all = regList().filter((c) => low(c.category) === f || low(c.name).includes(f));
    return R(
      m,
      f
        ? '🧩 "' + f + '": ' + all.length + ' commands\n' + all.slice(0, 10).map(fmtCmd).join('\n')
        : '',
    );
  },
  featureon: async (m, sock) => {
    const f = low(A(m));
    if (!f) return R(m, '⚠️ Feature naam do.');
    await kvSet('x2feat:' + f, true);
    return R(m, '✅ Feature "' + f + '" ON (bot-supported features ke liye).');
  },
  featureoff: async (m, sock) => {
    const f = low(A(m));
    if (!f) return R(m, '⚠️ Feature naam do.');
    await kvSet('x2feat:' + f, false);
    return R(m, '❌ Feature "' + f + '" OFF.');
  },
  autodelete: async (m, sock) => {
    const cur = await kvGet('x2autodel', false);
    await kvSet('x2autodel', !cur);
    return R(
      m,
      (!cur ? '✅' : '❌') +
        ' Auto-delete (bot ke time/reminder replies): ' +
        (!cur ? 'ON' : 'OFF'),
    );
  },
  autodeletetime: async (m, sock) => {
    const n = num(A(m));
    if (!n) return R(m, '⚠️ .autodeletetime 60 (seconds)');
    await kvSet('x2autodeltime', n);
    return R(m, '✅ Auto-delete delay: ' + n + 's');
  },
  autodeletestatus: async (m, sock) => {
    const on = await kvGet('x2autodel', false);
    const t = await kvGet('x2autodeltime', 60);
    return R(m, 'ℹ️ Auto-delete: ' + (on ? 'ON' : 'OFF') + ' (' + t + 's)');
  },
  autoreply: async (m, sock) => {
    const k = 'x2autoreply:' + nameOf(m.sender);
    const cur = await kvGet(k, { on: false, rules: [] });
    cur.on = !cur.on;
    await kvSet(k, cur);
    return R(
      m,
      (cur.on ? '✅' : '❌') +
        ' Keyword auto-reply: ' +
        (cur.on ? 'ON' : 'OFF') +
        ' (' +
        cur.rules.length +
        ' rules)',
    );
  },
  autoreplyadd: async (m, sock) => {
    const parts = A(m).split('|');
    if (parts.length < 2) return R(m, '⚠️ .autoreplyadd keyword | reply');
    const k = 'x2autoreply:' + nameOf(m.sender);
    const cur = await kvGet(k, { on: true, rules: [] });
    cur.rules.push({ kw: parts[0].trim().toLowerCase(), rep: parts.slice(1).join('|').trim() });
    await kvSet(k, cur);
    return R(m, '✅ Auto-reply rule add.');
  },
  autoreplyremove: async (m, sock) => {
    const kw = low(A(m));
    const k = 'x2autoreply:' + nameOf(m.sender);
    const cur = await kvGet(k, { on: false, rules: [] });
    cur.rules = cur.rules.filter((r) => r.kw !== kw);
    await kvSet(k, cur);
    return R(m, '🗑️ Rule removed (agar thi).');
  },
  autoreplylist: async (m, sock) => {
    const cur = (await kvGet('x2autoreply:' + nameOf(m.sender))) || { rules: [] };
    return R(
      m,
      '📋 Auto-reply rules:\n' +
        (cur.rules.length
          ? cur.rules.map((r, i) => i + 1 + '. "' + r.kw + '" → ' + r.rep).join('\n')
          : '(empty)'),
    );
  },
  autoreplyclear: async (m, sock) => {
    await kvSet('x2autoreply:' + nameOf(m.sender), { on: false, rules: [] });
    return R(m, '🗑️ Saare rules clear.');
  },
  keywordadd: async (m, sock) => {
    const parts = A(m).split('|');
    if (parts.length < 2) return R(m, '⚠️ .keywordadd trigger | response');
    await kvPush(
      'x2keywords:' + nameOf(m.sender),
      { kw: parts[0].trim().toLowerCase(), rep: parts.slice(1).join('|').trim() },
      50,
    );
    return R(m, '✅ Keyword add.');
  },
  keywordremove: async (m, sock) => {
    const kw = low(A(m));
    const l = ((await kvGet('x2keywords:' + nameOf(m.sender))) || []).filter((r) => r.kw !== kw);
    await kvSet('x2keywords:' + nameOf(m.sender), l);
    return R(m, '🗑️ Keyword removed.');
  },
  keywordlist: async (m, sock) => {
    const l = (await kvGet('x2keywords:' + nameOf(m.sender))) || [];
    return R(
      m,
      '🔑 Keywords:\n' +
        (l.length ? l.map((r, i) => i + 1 + '. "' + r.kw + '" → ' + r.rep).join('\n') : '(empty)'),
    );
  },
  reactionadd: async (m, sock) => {
    const parts = A(m).split('|');
    if (parts.length < 2) return R(m, '⚠️ .reactionadd keyword | emoji');
    await kvPush(
      'x2reacts:' + nameOf(m.sender),
      { kw: parts[0].trim().toLowerCase(), emo: parts.slice(1).join('|').trim() },
      50,
    );
    return R(m, '✅ Reaction rule add.');
  },
  reactionremove: async (m, sock) => {
    const kw = low(A(m));
    const l = ((await kvGet('x2reacts:' + nameOf(m.sender))) || []).filter((r) => r.kw !== kw);
    await kvSet('x2reacts:' + nameOf(m.sender), l);
    return R(m, '🗑️ Reaction rule removed.');
  },
  configexport: async (m, sock) => {
    const d = {};
    for (const k of ['replymode', 'reactmode', 'lang'])
      d[k] = await kvGet('x2cfg:' + nameOf(m.sender) + ':' + k);
    d.tz = await kvGet('x2cfg:tz');
    d.autoreply = await kvGet('x2autoreply:' + nameOf(m.sender));
    return R(m, '📤 Config export:\n' + JSON.stringify(d));
  },
  configimport: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Exported JSON paste karo.');
    try {
      const d = JSON.parse(t);
      if (d.tz) await kvSet('x2cfg:tz', d.tz);
      if (d.autoreply) await kvSet('x2autoreply:' + nameOf(m.sender), d.autoreply);
      return R(m, '✅ Config import ho gaya.');
    } catch (e) {
      return R(m, '❌ Invalid JSON.');
    }
  },
  configbackup: async (m, sock) => {
    const d = {
      tz: await kvGet('x2cfg:tz'),
      lang: await kvGet('x2cfg:lang'),
      contacts: await kvGet(UK(m) + ':contacts'),
    };
    await kvSet(UK(m) + ':cfgbackup', d);
    return R(m, '💾 Config backup saved.');
  },
  configrestore: async (m, sock) => {
    const d = await kvGet(UK(m) + ':cfgbackup');
    if (!d) return R(m, 'ℹ️ Koi backup nahi.');
    if (d.tz) await kvSet('x2cfg:tz', d.tz);
    if (d.contacts) await kvSet(UK(m) + ':contacts', d.contacts);
    return R(m, '♻️ Config restore ho gaya.');
  },
  confighelp: async (m, sock) =>
    listCmds(
      m,
      (c) => /config|prefix|owner|feature|autoreply|keyword|footer/.test(c.name),
      'Bot Config Commands',
    ),
  // ---- SEARCH ----
  searchweb: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('google');
    if (t) return t.handler(Object.assign({}, m, { arg: A(m) }), sock);
    return aiFallback(Object.assign({}, m, { arg: 'Search: ' + A(m) }), sock, 'search unavailable');
  },
  searchnews: async (m, sock) =>
    aiFallback(
      Object.assign({}, m, {
        arg: 'Latest news about: ' + (A(m) || 'Pakistan') + '   5 bullet points, short',
      }),
      sock,
      'news unavailable',
    ),
  searchimages: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ Topic do: .searchimages cars');
    try {
      await sock.sendMessage(m.chat, {
        image: {
          url:
            'https://image.pollinations.ai/prompt/' +
            encodeURIComponent(q) +
            '?width=800&height=600&nologo=true',
        },
        caption: '🖼️ "' + q + '" image',
      });
      return { sent: true };
    } catch (e) {
      return R(m, '⚠️ Image nahi mili.');
    }
  },
  searchvideos: async (m, sock) => {
    const t =
      (global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('ytsearch')) ||
      (global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('play'));
    if (t) return t.handler(Object.assign({}, m, { arg: A(m) }), sock);
    return aiFallback(
      Object.assign({}, m, { arg: 'YouTube search: ' + A(m) }),
      sock,
      'unavailable',
    );
  },
  searchmaps: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ Place do: .searchmaps Layyah');
    try {
      const d = await xfetch(
        'https://nominatim.openstreetmap.org/search?format=json&limit=3&q=' + encodeURIComponent(q),
      );
      const j = JSON.parse(d);
      if (!j.length) return R(m, 'ℹ️ Koi result nahi.');
      return R(
        m,
        '🗺️ Map results:\n' +
          j.map((r) => '• ' + r.display_name + '\n  📍 ' + r.lat + ', ' + r.lon).join('\n'),
      );
    } catch (e) {
      return aiFallback(Object.assign({}, m, { arg: 'Where is ' + q }), sock, 'maps unavailable');
    }
  },
  searchbooks: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ Book name do.');
    try {
      const d = await xfetch(
        'https://openlibrary.org/search.json?limit=5&q=' + encodeURIComponent(q),
      );
      const j = JSON.parse(d);
      if (!j.docs || !j.docs.length) return R(m, 'ℹ️ Koi book nahi mili.');
      return R(
        m,
        '📚 Books:\n' +
          j.docs
            .map(
              (b) =>
                '• *' +
                b.title +
                '*' +
                (b.author_name ? '   ' + b.author_name[0] : '') +
                (b.first_publish_year ? ' (' + b.first_publish_year + ')' : ''),
            )
            .join('\n'),
      );
    } catch (e) {
      return R(m, '⚠️ Book search fail: ' + e.message.slice(0, 60));
    }
  },
  searchapps: async (m, sock) =>
    aiFallback(
      Object.assign({}, m, {
        arg: 'Tell me about apps named "' + A(m) + '"   top 3 with short description',
      }),
      sock,
      'unavailable',
    ),
  searchgames: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ Game name do.');
    try {
      const d = await xfetch(
        'https://www.cheapshark.com/api/1.0/games?title=' + encodeURIComponent(q) + '&limit=5',
      );
      const j = JSON.parse(d);
      if (!j.length) return R(m, 'ℹ️ Koi game nahi mila.');
      return R(
        m,
        '🎮 Games:\n' +
          j.map((g) => '• ' + g.external + (g.cheapest ? '   $' + g.cheapest : '')).join('\n'),
      );
    } catch (e) {
      return R(m, '⚠️ Game search fail.');
    }
  },
  searchmovies: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ Movie name do.');
    try {
      const d = await xfetch(
        'https://www.omdbapi.com/?s=' + encodeURIComponent(q) + '&apikey=564727fa',
      );
      const j = JSON.parse(d);
      if (!j.Search) return R(m, 'ℹ️ Koi movie nahi mili.');
      return R(
        m,
        '🎬 Movies:\n' +
          j.Search.slice(0, 6)
            .map((x) => '• ' + x.Title + ' (' + x.Year + ')')
            .join('\n'),
      );
    } catch (e) {
      return R(m, '⚠️ Movie search fail.');
    }
  },
  searchseries: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ Series name do.');
    try {
      const d = await xfetch('https://api.tvmaze.com/search/shows?q=' + encodeURIComponent(q));
      const j = JSON.parse(d);
      if (!j.length) return R(m, 'ℹ️ Koi series nahi mili.');
      return R(
        m,
        '📺 Series:\n' +
          j
            .slice(0, 5)
            .map(
              (x) =>
                '• ' +
                x.show.name +
                (x.show.premiered ? ' (' + x.show.premiered.slice(0, 4) + ')' : ''),
            )
            .join('\n'),
      );
    } catch (e) {
      return R(m, '⚠️ Series search fail.');
    }
  },
  searchsongs: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ Song name do.');
    try {
      const d = await xfetch(
        'https://itunes.apple.com/search?limit=5&media=music&term=' + encodeURIComponent(q),
      );
      const j = JSON.parse(d);
      if (!j.results || !j.results.length) return R(m, 'ℹ️ Koi song nahi mila.');
      return R(
        m,
        '🎵 Songs:\n' + j.results.map((s) => '• ' + s.trackName + '   ' + s.artistName).join('\n'),
      );
    } catch (e) {
      return R(m, '⚠️ Song search fail.');
    }
  },
  searchartists: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ Artist name do.');
    try {
      const d = await xfetch(
        'https://itunes.apple.com/search?limit=5&entity=musicArtist&term=' + encodeURIComponent(q),
      );
      const j = JSON.parse(d);
      if (!j.results || !j.results.length) return R(m, 'ℹ️ Koi artist nahi mila.');
      return R(
        m,
        '🎤 Artists:\n' +
          j.results.map((s) => '• ' + s.artistName + ' (' + s.artistType + ')').join('\n'),
      );
    } catch (e) {
      return R(m, '⚠️ Artist search fail.');
    }
  },
  searchrecipes: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ Dish name do.');
    try {
      const d = await xfetch(
        'https://www.themealdb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(q),
      );
      const j = JSON.parse(d);
      if (!j.meals) return R(m, 'ℹ️ Koi recipe nahi mili.');
      return R(
        m,
        '🍳 Recipes:\n' +
          j.meals
            .slice(0, 5)
            .map((x) => '• ' + x.strMeal + ' (' + x.strArea + ')')
            .join('\n') +
          '\n\nDetail: .recipe ' +
          q,
      );
    } catch (e) {
      return R(m, '⚠️ Recipe search fail.');
    }
  },
  searchmeaning: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('define');
    if (t) return t.handler(Object.assign({}, m, { arg: A(m) }), sock);
    return R(m, '⚠️ define nahi mila.');
  },
  searchsynonyms: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ Word do.');
    try {
      const d = await xfetch(
        'https://api.datamuse.com/words?max=8&rel_syn=' + encodeURIComponent(q),
      );
      const j = JSON.parse(d);
      if (!j.length) return R(m, 'ℹ️ Synonyms nahi mile.');
      return R(m, '🔁 Synonyms of "' + q + '":\n' + j.map((w) => w.word).join(', '));
    } catch (e) {
      return R(m, '⚠️ Synonym search fail.');
    }
  },
  searchantonyms: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ Word do.');
    try {
      const d = await xfetch(
        'https://api.datamuse.com/words?max=8&rel_ant=' + encodeURIComponent(q),
      );
      const j = JSON.parse(d);
      if (!j.length) return R(m, 'ℹ️ Antonyms nahi mile.');
      return R(m, '↔️ Antonyms of "' + q + '":\n' + j.map((w) => w.word).join(', '));
    } catch (e) {
      return R(m, '⚠️ Antonym search fail.');
    }
  },
  searchquotes: async (m, sock) => {
    try {
      const d = await xfetch('https://api.quotable.io/quotes/random/3');
      const j = JSON.parse(d);
      return R(m, '❝ Quotes:\n' + j.map((q) => '"' + q.content + '"   ' + q.author).join('\n\n'));
    } catch (e) {
      const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('quote');
      if (t) return t.handler(m, sock);
      return R(m, '⚠️ Quotes fail.');
    }
  },
  searchfacts: async (m, sock) => {
    const t = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET('fact');
    if (t) return t.handler(m, sock);
    return R(m, '⚠️ fact nahi mila.');
  },
  searchcountries: async (m, sock) => x2country(m, A(m), 'countries'),
  searchcities: async (m, sock) => {
    const q = A(m);
    if (!q) return R(m, '⚠️ City do.');
    return aiFallback(
      Object.assign({}, m, { arg: 'City info: ' + q + '   country, population, 2 facts' }),
      sock,
      'unavailable',
    );
  },
  searchcapitals: async (m, sock) => x2country(m, A(m), 'capital'),
  searchflags: async (m, sock) => x2country(m, A(m), 'flag'),
  searchcurrency: async (m, sock) => x2country(m, A(m), 'currency'),
  searchtimezone: async (m, sock) => x2country(m, A(m), 'tz'),
  searchlanguage: async (m, sock) => x2country(m, A(m), 'lang'),
  searchcode: async (m, sock) =>
    listCmds(
      m,
      (c) => /calc|convert|base64|hash|json|binary|hex|uuid|qr/.test(c.name),
      'Code/Utility Commands',
    ),
  searchcommands: async (m, sock) => {
    const q = low(A(m));
    if (!q) return R(m, '⚠️ Keyword do: .searchcommands sticker');
    const hits = regList()
      .filter((c) => c.name.includes(q) || low(c.desc).includes(q))
      .slice(0, 15);
    return R(
      m,
      hits.length ? '🔍 Command matches:\n' + hits.map(fmtCmd).join('\n') : 'ℹ️ Koi match nahi.',
    );
  },
  findcommand: async (m, sock) => {
    const q = low(A(m));
    if (!q) return R(m, '⚠️ Keyword do.');
    const hits = regList()
      .filter((c) => c.name.includes(q))
      .slice(0, 10);
    return R(
      m,
      hits.length ? '🔎 Found:\n' + hits.map(fmtCmd).join('\n') : 'ℹ️ "' + q + '" nahi mila.',
    );
  },
  commandcategory: async (m, sock) => {
    const cat = A(m).toUpperCase();
    const hits = regList()
      .filter((c) => (c.category || '').toUpperCase().includes(cat))
      .slice(0, 20);
    if (!hits.length) {
      const all = regList().reduce((a, c) => {
        a[c.category] = 1;
        return a;
      }, {});
      return R(m, 'ℹ️ Categories: ' + Object.keys(all).join(', '));
    }
    return R(
      m,
      '📂 ' + cat + ' (' + hits.length + ' shown):\n' + hits.map((c) => '.' + c.name).join(', '),
    );
  },
  commandusage: async (m, sock) => {
    const q = low(A(m)).replace(/^\./, '');
    const c = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET(q);
    if (!c) return R(m, '⚠️ Command nahi mila: ' + q);
    return R(
      m,
      '📖 .' +
        c.name +
        '\n' +
        (c.desc || '') +
        '\nCategory: ' +
        (c.category || '-') +
        '\n\nTry: .' +
        c.name +
        ' <input>',
    );
  },
  commandalias: async (m, sock) => {
    const q = low(A(m)).replace(/^\./, '');
    const all = regList().filter((c) => c.name === q);
    if (!all.length) return R(m, '⚠️ Command nahi mila.');
    return R(
      m,
      '🔗 "' +
        q +
        '" registry me registered hy   aliases ke liye .helpcheck ya .searchcommands ' +
        q +
        ' try karo.',
    );
  },
  randomcommand: async (m, sock) => {
    const all = regList().filter((c) => c.desc);
    const c = pickOne(all);
    return R(m, '🎲 Random command:\n' + fmtCmd(c));
  },
  newcommand: async (m, sock) => listCmds(m, (c) => /^x/.test(c.name), 'Recent Commands (x-pack)'),
  popularcommands: async (m, sock) =>
    R(
      m,
      '🔥 Popular commands:\n.menu, .song, .video, .sticker, .ai, .calc, .weather2, .ytmp3, .tagall, .groupvote',
    ),
  quickcommands: async (m, sock) =>
    R(
      m,
      '⚡ Quick commands:\n.song <name>   YouTube play\n.sticker (image reply)\n.calc <expr>\n.ai <question>\n.qr <text>\n.password\n.timein <city>',
    ),
  basiccommands: async (m, sock) =>
    listCmds(
      m,
      (c) => /^(menu|help|ping|sticker|song|video|ai|calc|qr|password|date)$/.test(c.name),
      'Basic Commands',
    ),
  groupcommands: async (m, sock) =>
    listCmds(
      m,
      (c) => (c.category || '').includes('GROUP') || /group|tagall|member/.test(c.name),
      'Group Commands',
    ),
  mediacommands: async (m, sock) =>
    listCmds(m, (c) => /sticker|song|video|ytmp|media|image/.test(c.name), 'Media Commands'),
  utilitycommands: async (m, sock) =>
    listCmds(
      m,
      (c) => /calc|convert|qr|password|uuid|shorturl|unit|currency/.test(c.name),
      'Utility Commands',
    ),
  statuscommands: async (m, sock) => listCmds(m, (c) => /^status/.test(c.name), 'Status Commands'),
  securitycommands: async (m, sock) =>
    listCmds(
      m,
      (c) => (c.category || '').includes('SECURITY') || /anti|warn|ban|trust/.test(c.name),
      'Security Commands',
    ),
  ownercommands: async (m, sock) => listCmds(m, (c) => /owner|sudo/.test(c.name), 'Owner Commands'),
  settingscommands: async (m, sock) =>
    listCmds(m, (c) => /setting|prefix|toggle|mode/.test(c.name), 'Settings Commands'),
  searchcommands2: async (m, sock) =>
    listCmds(m, (c) => /^search|^find/.test(c.name), 'Search Commands'),
  helpcommand: async (m, sock) => {
    const c = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET(low(A(m)).replace(/^\./, ''));
    return c
      ? R(
          m,
          '❓ Help:\n' +
            fmtCmd(c) +
            '\nCategory: ' +
            (c.category || '-') +
            '\n\nExample: .' +
            c.name,
        )
      : R(m, '⚠️ Command nahi mila. .searchcommands <word> try karo.');
  },
  usage: async (m, sock) => {
    const q = low(A(m)).replace(/^\./, '');
    const c = global.__SAQI_CMD_GET && global.__SAQI_CMD_GET(q);
    return c
      ? R(m, '💡 Usage:\n.' + q + ' <input>\n\n' + (c.desc || ''))
      : R(m, '⚠️ Command nahi mila.');
  },
  examples: async (m, sock) =>
    R(
      m,
      '📖 Examples:\n.calc 25*4+10/2\n.timein london\n.searchbooks harry potter\n.groupvote Best admin?\n.statusmessage Good morning!\n.qrwifi MyWifi pass123',
    ),
  faq: async (m, sock) =>
    R(
      m,
      '❓ *Bot FAQ*\n\nQ: Bot free hy?\nA: Haan, 100% free.\nQ: Pair kaise karein?\nA: saqi-md.vercel.app par number dalo.\nQ: Commands nahi chal rahi?\nA: Prefix check karo (default "."), .ping test karo.',
    ),
  quickhelp: async (m, sock) =>
    R(
      m,
      '⚡ *Quick Help*\n\n.menu   sari commands\n.help <cmd>   detail\n.song / .video   YouTube\n.sticker   image → sticker\n.ai   sawal poocho\n.searchweb   internet search\n\nBot: ' +
        (config.BOT_NAME || 'SAQI-MD') +
        ' v' +
        (config.BOT_VERSION || '5'),
    ),
};

const R5 = {
  // handlers part 5: tools & everyday

  date2: async (m, sock) => R(m, '📅 Aaj: ' + new Date().toDateString()),
  day: async (m, sock) =>
    R(m, '📆 Aaj ' + new Date().toLocaleDateString('en-GB', { weekday: 'long' }) + ' hy.'),
  monthname: async (m, sock) =>
    R(
      m,
      '🗓️ Month: ' +
        new Date().toLocaleDateString('en-GB', { month: 'long' }) +
        ' ' +
        new Date().getFullYear(),
    ),
  weeknumber: async (m, sock) => {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    const wk = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
    return R(m, '🔢 Week number: ' + wk);
  },
  daysleft: async (m, sock) => {
    const d = new Date(A(m));
    if (isNaN(d)) return R(m, '⚠️ Date do: .daysleft 2026-12-31');
    const n = Math.ceil((d - new Date()) / 86400000);
    return R(m, '⏳ ' + d.toDateString() + ' tak ' + n + ' din baqi.');
  },
  daysago: async (m, sock) => {
    const d = new Date(A(m));
    if (isNaN(d)) return R(m, '⚠️ Date do: .daysago 2026-01-01');
    const n = Math.floor((new Date() - d) / 86400000);
    return R(m, '📆 ' + d.toDateString() + ' se ' + n + ' din guzar gaye.');
  },
  age2: async (m, sock) => {
    const d = new Date(A(m));
    if (isNaN(d)) return R(m, '⚠️ Birth date do: .age2 2008-05-21');
    const ms = new Date() - d;
    if (ms < 0) return R(m, '⚠️ Future date to nahi!');
    const y = Math.floor(ms / 31557600000);
    const mth = Math.floor((ms % 31557600000) / 2629800000);
    return R(m, '🎂 Age: ' + y + ' saal ' + mth + ' mahine\nDin: ' + Math.floor(ms / 86400000));
  },
  bmi: async (m, sock) => {
    const p = A(m)
      .split(/[\s,x\/]+/)
      .map(num)
      .filter((x) => x !== null);
    if (p.length < 2) return R(m, '⚠️ Format: .bmi weight-kg height-m (e.g. .bmi 60 1.7)');
    const w = p[0],
      h = p[1] > 3 ? p[1] / 100 : p[1];
    const bmi = w / (h * h);
    const cat =
      bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal ✅' : bmi < 30 ? 'Overweight' : 'Obese';
    return R(m, '⚖️ BMI: ' + bmi.toFixed(1) + '   ' + cat);
  },
  tip: async (m, sock) => {
    const p = A(m)
      .split(/[\s,]+/)
      .map(num)
      .filter((x) => x !== null);
    const bill = p[0],
      pct = p[1] || 15;
    if (!bill) return R(m, '⚠️ .tip 1000 15');
    return R(
      m,
      '💵 Bill: ' +
        bill +
        '\nTip (' +
        pct +
        '%): ' +
        ((bill * pct) / 100).toFixed(2) +
        '\nTotal: ' +
        (bill * (1 + pct / 100)).toFixed(2),
    );
  },
  discount: async (m, sock) => {
    const p = A(m)
      .split(/[\s,]+/)
      .map(num)
      .filter((x) => x !== null);
    if (p.length < 2) return R(m, '⚠️ .discount <price> <percent>');
    const [pr, dc] = p;
    return R(
      m,
      '🏷️ Price: ' +
        pr +
        '\nDiscount ' +
        dc +
        '%: -' +
        ((pr * dc) / 100).toFixed(2) +
        '\nFinal: ' +
        (pr * (1 - dc / 100)).toFixed(2),
    );
  },
  tax: async (m, sock) => {
    const p = A(m)
      .split(/[\s,]+/)
      .map(num)
      .filter((x) => x !== null);
    if (p.length < 2) return R(m, '⚠️ .tax <amount> <percent>');
    const [a, t2] = p;
    return R(
      m,
      '🧾 Amount: ' +
        a +
        '\nTax ' +
        t2 +
        '%: ' +
        ((a * t2) / 100).toFixed(2) +
        '\nTotal: ' +
        (a * (1 + t2 / 100)).toFixed(2),
    );
  },
  splitbill: async (m, sock) => {
    const p = A(m)
      .split(/[\s,]+/)
      .map(num)
      .filter((x) => x !== null);
    if (p.length < 2) return R(m, '⚠️ .splitbill <total> <people>');
    return R(m, '👥 ' + p[0] + ' / ' + p[1] + ' = ' + (p[0] / p[1]).toFixed(2) + ' per person');
  },
  change: async (m, sock) => {
    const p = A(m)
      .split(/[\s,]+/)
      .map(num)
      .filter((x) => x !== null);
    if (p.length < 2) return R(m, '⚠️ .change <paid> <price>');
    return R(m, '💰 Change: ' + (p[0] - p[1]).toFixed(2));
  },
  profit: async (m, sock) => {
    const p = A(m)
      .split(/[\s,]+/)
      .map(num)
      .filter((x) => x !== null);
    if (p.length < 2) return R(m, '⚠️ .profit <cost> <sell>');
    return R(
      m,
      '📈 Profit: ' +
        (p[1] - p[0]).toFixed(2) +
        ' (' +
        (((p[1] - p[0]) / p[0]) * 100).toFixed(1) +
        '%)',
    );
  },
  loss: async (m, sock) => {
    const p = A(m)
      .split(/[\s,]+/)
      .map(num)
      .filter((x) => x !== null);
    if (p.length < 2) return R(m, '⚠️ .loss <cost> <sell>');
    return R(
      m,
      '📉 Loss: ' +
        (p[0] - p[1]).toFixed(2) +
        ' (' +
        (((p[0] - p[1]) / p[0]) * 100).toFixed(1) +
        '%)',
    );
  },
  profitpercent: async (m, sock) => {
    const p = A(m)
      .split(/[\s,]+/)
      .map(num)
      .filter((x) => x !== null);
    if (p.length < 2) return R(m, '⚠️ .profitpercent <cost> <sell>');
    return R(m, '📈 Profit %: ' + (((p[1] - p[0]) / p[0]) * 100).toFixed(2) + '%');
  },
  discountpercent: async (m, sock) => {
    const p = A(m)
      .split(/[\s,]+/)
      .map(num)
      .filter((x) => x !== null);
    if (p.length < 2) return R(m, '⚠️ .discountpercent <original> <sale>');
    return R(m, '🏷️ Discount: ' + (((p[0] - p[1]) / p[0]) * 100).toFixed(2) + '%');
  },
  ratio2: async (m, sock) => {
    const p = A(m)
      .split(/[\s,:x\/]+/)
      .map(num)
      .filter((x) => x !== null);
    if (p.length < 2) return R(m, '⚠️ .ratio2 16 8');
    const g = (a, b) => (b ? g(b, a % b) : a);
    const d = g(p[0], p[1]);
    return R(m, '🔢 Ratio: ' + p[0] / d + ':' + p[1] / d);
  },
  fraction2: async (m, sock) => {
    const p = A(m)
      .split(/[\/\s]+/)
      .map(num)
      .filter((x) => x !== null);
    if (p.length < 2) return R(m, '⚠️ .fraction2 18/24');
    const g = (a, b) => (b ? g(b, a % b) : a);
    const d = g(p[0], p[1]);
    return R(
      m,
      '🔢 ' +
        p[0] +
        '/' +
        p[1] +
        ' = ' +
        p[0] / d +
        '/' +
        p[1] / d +
        ' = ' +
        (p[0] / p[1]).toFixed(4),
    );
  },
  round: async (m, sock) => {
    const n = num(A(m));
    if (n === null) return R(m, '⚠️ Number do.');
    return R(m, '🔄 ' + n + ' → ' + Math.round(n));
  },
  ceil: async (m, sock) => {
    const n = num(A(m));
    if (n === null) return R(m, '⚠️ Number do.');
    return R(m, '⬆️ ' + n + ' → ' + Math.ceil(n));
  },
  floor: async (m, sock) => {
    const n = num(A(m));
    if (n === null) return R(m, '⚠️ Number do.');
    return R(m, '⬇️ ' + n + ' → ' + Math.floor(n));
  },
  randomdate: async (m, sock) => {
    const s = new Date(2000, 0, 1).getTime(),
      e = new Date().getTime();
    const d = new Date(s + Math.random() * (e - s));
    return R(m, '🎲 Random date: ' + d.toDateString());
  },
  randomtime: async (m, sock) =>
    R(
      m,
      '🎲 Random time: ' +
        Math.floor(Math.random() * 24) +
        ':' +
        String(Math.floor(Math.random() * 60)).padStart(2, '0'),
    ),
  randomcolor: async (m, sock) => {
    const c =
      '#' +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0');
    return R(
      m,
      '🎨 Random color: ' + c.toUpperCase() + '\nhttps://www.colorhexa.com/' + c.slice(1),
    );
  },
  hexcolor: async (m, sock) => {
    const q = low(A(m)).replace('#', '');
    if (COLORS[q]) return R(m, '🎨 ' + q + ' = ' + COLORS[q]);
    if (/^[0-9a-f]{6}$/.test(q))
      return R(
        m,
        '🎨 #' +
          q.toUpperCase() +
          ' → RGB(' +
          parseInt(q.slice(0, 2), 16) +
          ', ' +
          parseInt(q.slice(2, 4), 16) +
          ', ' +
          parseInt(q.slice(4, 6), 16) +
          ')',
      );
    return R(m, '⚠️ Color name ya hex do (e.g. gold ya FFD700).');
  },
  colorinfo: async (m, sock) => {
    const q = low(A(m)).replace('#', '');
    const hex = COLORS[q] ? COLORS[q].slice(1) : /^[0-9a-f]{6}$/.test(q) ? q : null;
    if (!hex) return R(m, '⚠️ Color name ya hex do.');
    const r = parseInt(hex.slice(0, 2), 16),
      g = parseInt(hex.slice(2, 4), 16),
      b = parseInt(hex.slice(4, 6), 16);
    return R(
      m,
      '🎨 #' +
        hex.toUpperCase() +
        '\nRGB: ' +
        r +
        ', ' +
        g +
        ', ' +
        b +
        '\nBrightness: ' +
        Math.round((r * 299 + g * 587 + b * 114) / 1000) +
        '/255',
    );
  },
  emojiinfo: async (m, sock) => {
    const e = A(m);
    if (!e) return R(m, '⚠️ Emoji do.');
    const cp = [...e]
      .map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
      .join(' ');
    return R(
      m,
      '✨ Emoji: ' + e + '\nCode points: ' + cp + '\nLength: ' + [...e].length + ' char(s)',
    );
  },
  symbolinfo: async (m, sock) => {
    const e = A(m);
    if (!e) return R(m, '⚠️ Symbol do.');
    return R(m, '🔣 Symbol: ' + e + '\nCode: U+' + e.codePointAt(0).toString(16).toUpperCase());
  },
  countryinfo: async (m, sock) => x2country(m, A(m), 'countries'),
  countrycode: async (m, sock) => x2country(m, A(m), 'countries'),
  callingcode: async (m, sock) => {
    const c = A(m).replace(/\D/g, '');
    if (!c) return R(m, '⚠️ Calling code do (e.g. 92).');
    try {
      const d = await xfetch(
        'https://cdn.jsdelivr.net/gh/samayo/country-json@master/src/country-by-calling-code.json',
        {},
        20000,
      );
      const j = JSON.parse(d);
      const hits = j
        .filter(
          (x) => String(x.calling_code) === c || String(x.calling_code) === c.replace(/^0+/, ''),
        )
        .slice(0, 6)
        .map((x) => x.country);
      return R(m, '📞 +' + c + ' → ' + (hits.length ? hits.join(', ') : 'unknown'));
    } catch (e) {
      return R(m, '⚠️ Data nahi mila.');
    }
  },
  currencyinfo: async (m, sock) => {
    const q = A(m).toUpperCase();
    if (!q) return R(m, '⚠️ Currency code do (e.g. PKR).');
    try {
      const d = await xfetch('https://open.er-api.com/v6/latest/' + q);
      const j = JSON.parse(d);
      if (j.result !== 'success') return R(m, 'ℹ️ Code nahi mila.');
      const pk = j.rates.PKR ? '\n1 ' + q + ' = ' + j.rates.PKR + ' PKR' : '';
      return R(m, '💱 ' + q + ' (base):\nUSD: ' + j.rates.USD + pk + '\nEUR: ' + j.rates.EUR);
    } catch (e) {
      return R(m, '⚠️ Currency data fail.');
    }
  },
  unitinfo: async (m, sock) =>
    R(
      m,
      '📏 Common units:\n1 km = 1000 m = 0.621 mi\n1 kg = 2.205 lb\n1 inch = 2.54 cm\n1 ft = 30.48 cm\n1 L = 1000 mL = 0.264 gal\nConvert: .convert <value> <from> to <to>',
    ),
  timezoneinfo: async (m, sock) => {
    const q = A(m) || 'Asia/Karachi';
    try {
      new Intl.DateTimeFormat('en', { timeZone: q });
      return R(m, '🕰️ ' + q + ':\n' + fmtIn(q));
    } catch (e) {
      return R(m, '⚠️ Valid timezone do (e.g. Asia/Karachi).');
    }
  },
  timein: async (m, sock) => {
    const q = low(A(m)).replace(/\s+/g, '');
    const tz = TZ[q];
    if (!tz)
      return R(m, '⚠️ City supported nahi. Cities: ' + Object.keys(TZ).slice(0, 12).join(', '));
    return R(m, '🕐 ' + q.charAt(0).toUpperCase() + q.slice(1) + ':\n' + fmtIn(tz));
  },
  worldclock: async (m, sock) =>
    R(
      m,
      '🌍 *World Clock*\n\n' +
        ['Karachi', 'Dubai', 'London', 'NewYork', 'Tokyo', 'Sydney']
          .map((c) => c + ': ' + fmtIn(TZ[c.toLowerCase()]))
          .join('\n'),
    ),
  stopwatch3: async (m, sock) => {
    const t = Date.now();
    await kvSet('x2sw:' + nameOf(m.sender), t);
    return R(m, '⏱️ Stopwatch START! Dobara .stopwatch3 chalao   elapsed milega.');
  },
  timer3: async (m, sock) => {
    const mins = num(A(m).split(' ')[0]);
    if (!mins) return R(m, '⚠️ .timer3 <minutes>   e.g. .timer3 5');
    const sw = await kvGet('x2sw:' + nameOf(m.sender));
    await setRem(
      m,
      'x2timer:' + nameOf(m.sender),
      mins * 60000,
      '⏱️ Timer khatam! (' + mins + ' min)',
    );
    return R(m, '⏳ Timer set: ' + mins + ' min   khatam hone par bata dunga.');
  },
  remindme: async (m, sock) => {
    const mins = num(A(m).split(' ')[0]);
    const text = A(m).split(' ').slice(1).join(' ');
    if (!mins || !text) return R(m, '⚠️ .remindme <minutes> <text>');
    await setRem(m, UK(m) + ':rems', mins * 60000, text);
    return R(m, '⏰ Reminder set (' + mins + ' min): ' + text);
  },
  reminders2: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':rems')) || [];
    if (!l.length) return R(m, 'ℹ️ Koi personal reminders nahi.');
    return R(
      m,
      '⏰ Aap ke reminders:\n' +
        l
          .map(
            (r) =>
              '• [' +
              r.id.slice(-4) +
              '] ' +
              Math.max(0, Math.round((r.t - Date.now()) / 60000)) +
              ' min   ' +
              r.text,
          )
          .join('\n'),
    );
  },
  delreminder2: async (m, sock) => {
    const id = A(m);
    const l = (await kvGet(UK(m) + ':rems')) || [];
    const rest = l.filter((r) => !r.id.endsWith(id.replace(/^r/, '')));
    if (rest.length === l.length) return R(m, '⚠️ ID match nahi hui. .reminders2 dekho.');
    await kvSet(UK(m) + ':rems', rest);
    return R(m, '🗑️ Reminder delete.');
  },
  note2: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ .note2 <text>');
    await kvPush(UK(m) + ':notes', { text: t }, 50);
    return R(m, '📝 Note save. .notes2 se dekho.');
  },
  notes2: async (m, sock) => {
    const l = (await kvGet(UK(m) + ':notes')) || [];
    if (!l.length) return R(m, 'ℹ️ Koi notes nahi.');
    return R(m, '📝 Aap ke notes:\n' + l.map((n, i) => i + 1 + '. ' + n.text).join('\n'));
  },
  delnote2: async (m, sock) => {
    const n = num(A(m));
    const l = (await kvGet(UK(m) + ':notes')) || [];
    if (!n || n < 1 || n > l.length) return R(m, '⚠️ Note number do (1-' + l.length + ').');
    l.splice(n - 1, 1);
    await kvSet(UK(m) + ':notes', l);
    return R(m, '🗑️ Note delete.');
  },
  calc2: async (m, sock) => {
    const e = A(m).replace(/[^0-9+\-*/().%\s^]/g, '');
    if (!e) return R(m, '⚠️ Expression do: .calc2 25*4+10/2');
    try {
      const r = safeMath(e);
      return R(m, '🧮 ' + e + ' = ' + r);
    } catch (x) {
      return R(m, '❌ Invalid expression.');
    }
  },
  convert2: async (m, sock) => {
    const p = A(m).split(/\s+/);
    if (p.length < 3) return R(m, '⚠️ .convert2 <value> <from> to <to>\nkm/mi/kg/lb/m/ft/c/f/c');
    const v = num(p[0]);
    const f = low(p[1]),
      t2 = low(p[3] || p[2]);
    if (v === null) return R(m, '⚠️ Value samajh nahi aayi.');
    const table = {
      km: 1000,
      m: 1,
      mi: 1609.34,
      ft: 0.3048,
      cm: 0.01,
      inch: 0.0254,
      kg: 1,
      g: 0.001,
      lb: 0.4536,
      oz: 0.02835,
      l: 1,
      ml: 0.001,
      gal: 3.785,
    };
    if (f === 'c' && t2 === 'f')
      return R(m, '🌡️ ' + v + '°C = ' + ((v * 9) / 5 + 32).toFixed(2) + '°F');
    if (f === 'f' && t2 === 'c')
      return R(m, '🌡️ ' + v + '°F = ' + (((v - 32) * 5) / 9).toFixed(2) + '°C');
    if (table[f] && table[t2])
      return R(m, '🔄 ' + v + ' ' + f + ' = ' + ((v * table[f]) / table[t2]).toFixed(4) + ' ' + t2);
    return R(m, '⚠️ Units support nahi. Try: km mi m ft kg lb c f l gal');
  },
  textcount: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(
      m,
      '🔢 Text stats:\nWords: ' +
        t.split(/\s+/).filter(Boolean).length +
        '\nChars: ' +
        t.length +
        '\nLines: ' +
        t.split('\n').length +
        '\nWithout spaces: ' +
        t.replace(/\s/g, '').length,
    );
  },
  linkpreview: async (m, sock) => {
    const u = A(m);
    if (!/^https?:\/\//.test(u)) return R(m, '⚠️ URL do.');
    try {
      const d = await xfetch(u, {}, 15000);
      const title = (String(d).match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1];
      const desc = (String(d).match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) ||
        [])[1];
      return R(
        m,
        '🔗 Link preview:\n\n📌 ' +
          (title || 'No title').trim() +
          (desc ? '\n📝 ' + desc.trim().slice(0, 200) : '') +
          '\n🔗 ' +
          u,
      );
    } catch (e) {
      return R(m, '⚠️ Link open nahi hua.');
    }
  },
  domainage: async (m, sock) => {
    const d = A(m)
      .replace(/^https?:\/\//, '')
      .split('/')[0];
    if (!d) return R(m, '⚠️ Domain do.');
    return aiFallback(
      Object.assign({}, m, { arg: 'Domain "' + d + '" kab bana tha? Estimated age?' }),
      sock,
      'unavailable',
    );
  },
  qrtext: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Text do: .qrtext Hello');
    await sock.sendMessage(m.chat, {
      image: {
        url:
          'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=' + encodeURIComponent(t),
      },
      caption: '📷 QR: ' + t,
    });
    return { sent: true };
  },
  qrcontact2: async (m, sock) => {
    const j = mJid(m) || (A(m).match(/\d{7,}/) ? A(m).replace(/\D/g, '') : null);
    if (!j) return R(m, '⚠️ Mention karo ya number do.');
    const data = 'tel:+' + nameOf(j);
    await sock.sendMessage(m.chat, {
      image: {
        url:
          'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=' +
          encodeURIComponent(data),
      },
      caption: '📷 Contact QR: +' + nameOf(j),
    });
    return { sent: true };
  },
  qrwifi: async (m, sock) => {
    const p = A(m).split(/\s+/);
    if (p.length < 2) return R(m, '⚠️ .qrwifi <ssid> <password>');
    const data = 'WIFI:T:WPA;S:' + p[0] + ';P:' + p[1] + ';;';
    await sock.sendMessage(m.chat, {
      image: {
        url:
          'https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=' +
          encodeURIComponent(data),
      },
      caption: '📶 WiFi QR: ' + p[0],
    });
    return { sent: true };
  },
  barcode2: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Text do.');
    try {
      await sock.sendMessage(m.chat, {
        image: { url: 'https://barcodeapi.org/api/128/' + encodeURIComponent(t) },
        caption: '📊 Barcode: ' + t,
      });
      return { sent: true };
    } catch (e) {
      return R(m, '⚠️ Barcode fail.');
    }
  },
  passwordstrength: async (m, sock) => {
    const p = A(m);
    if (!p) return R(m, '⚠️ Password do: .passwordstrength abc123');
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const lv = [
      'Bahut kamzor ❌',
      'Kamzor ⚠️',
      'Theek-thaak 😐',
      'Acha 👍',
      'Strong 💪',
      'Bahut strong 🔐',
    ][score];
    return R(m, '🔐 Strength: ' + lv + ' (' + score + '/5)\nLength: ' + p.length);
  },
  randompassword: async (m, sock) => {
    const len = Math.min(Math.max(num(A(m)) || 12, 6), 40);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let p = '';
    for (let i = 0; i < len; i++) p += chars[crypto.randomInt(chars.length)];
    return R(m, '🔐 Password (' + len + '):\n' + p);
  },
  uuid2: async (m, sock) => R(m, '🆔 UUID:\n' + crypto.randomUUID()),
  timestamp: async (m, sock) => {
    const d = new Date(A(m));
    if (isNaN(d)) return R(m, '⚠️ Date do: .timestamp 2026-01-01');
    return R(m, '⏱️ Unix: ' + Math.floor(d.getTime() / 1000));
  },
  timestampnow: async (m, sock) =>
    R(m, '⏱️ Now: ' + Math.floor(Date.now() / 1000) + '\n(ms: ' + Date.now() + ')'),
  timestampdate: async (m, sock) => {
    const n = num(A(m));
    if (n === null) return R(m, '⚠️ Timestamp do.');
    const d = new Date(n * (String(A(m)).length > 10 ? 1 : 1000));
    return R(m, '📅 ' + d.toString());
  },
  jsonpretty: async (m, sock) => {
    const t = qtext(m) || A(m);
    try {
      return R(m, '✨ ' + JSON.stringify(JSON.parse(t), null, 2).slice(0, 1500));
    } catch (e) {
      return R(m, '❌ Invalid JSON.');
    }
  },
  jsonminify: async (m, sock) => {
    const t = qtext(m) || A(m);
    try {
      return R(m, '🗜️ ' + JSON.stringify(JSON.parse(t)));
    } catch (e) {
      return R(m, '❌ Invalid JSON.');
    }
  },
  urlencode: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(m, '🔗 ' + encodeURIComponent(t));
  },
  urldecode: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do.');
    try {
      return R(m, '🔓 ' + decodeURIComponent(t));
    } catch (e) {
      return R(m, '❌ Invalid encoding.');
    }
  },
  htmlencode: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(
      m,
      '🏷️ ' +
        t
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;'),
    );
  },
  htmldecode: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(
      m,
      '🔓 ' +
        t
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"'),
    );
  },
  unicode: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(
      m,
      '🔤 Unicode:\n' +
        [...t].map((c) => c + ' → U+' + c.codePointAt(0).toString(16).toUpperCase()).join('\n'),
    );
  },
  charinfo: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Char do.');
    const c = t[0];
    return R(
      m,
      '🔣 "' +
        c +
        '"\nCode: U+' +
        c.codePointAt(0).toString(16).toUpperCase() +
        '\nDecimal: ' +
        c.codePointAt(0) +
        '\nBinary: ' +
        c.codePointAt(0).toString(2),
    );
  },
  ascii2: async (m, sock) => {
    const t = A(m);
    if (!t) return R(m, '⚠️ Text do.');
    const fw = [...t]
      .map((c) => {
        const d = c.charCodeAt(0);
        return d >= 33 && d <= 126 ? String.fromCharCode(d + 65248) : c;
      })
      .join('');
    return R(m, '🅰️ ' + fw);
  },
  binary2: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(
      m,
      '0️⃣1️⃣ ' + [...t].map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' '),
    );
  },
  binarytext: async (m, sock) => {
    const t = A(m) || qtext(m);
    try {
      const out = t
        .trim()
        .split(/\s+/)
        .map((b) => String.fromCharCode(parseInt(b, 2)))
        .join('');
      return R(m, '🔤 ' + out);
    } catch (e) {
      return R(m, '❌ Invalid binary.');
    }
  },
  hextext: async (m, sock) => {
    const t = A(m) || qtext(m);
    if (!t) return R(m, '⚠️ Text do.');
    return R(m, '🔑 ' + Buffer.from(t, 'utf8').toString('hex'));
  },
  hexdecode: async (m, sock) => {
    const t = A(m) || qtext(m);
    try {
      return R(m, '🔤 ' + Buffer.from(t.trim(), 'hex').toString('utf8'));
    } catch (e) {
      return R(m, '❌ Invalid hex.');
    }
  },
};

const EXTRA = {
  setgroupicon2: async (m, sock) => {
    const q = m.quoted;
    if (!q || !(q.msg && q.msg.image)) return R(m, '⚠️ IMAGE ka reply karo phir .setgroupicon2');
    try {
      await sock.updateProfilePicture(m.chat, q.msg.image);
      return R(m, '✅ Group icon update ho gaya!');
    } catch (e) {
      return R(
        m,
        '⚠️ Icon update fail   bot ko ADMIN banao. (' + String(e.message).slice(0, 50) + ')',
      );
    }
  },
  groupicon: async (m, sock) => {
    try {
      const u = await sock.profilePictureUrl(m.chat, 'image');
      await sock.sendMessage(m.chat, { image: { url: u }, caption: '🖼️ Group icon' });
      return { sent: true };
    } catch (e) {
      return R(m, '⚠️ Group icon nahi mila (privacy).');
    }
  },
  commandcount: async (m, sock) => {
    const n = (global.__SAQI_CMDS_ALL && global.__SAQI_CMDS_ALL.size) || 0;
    return R(m, '🔢 Total registered commands: ' + n);
  },
  quicktoolinfo: async (m, sock) => {
    const n = (global.__SAQI_CMDS_ALL && global.__SAQI_CMDS_ALL.size) || 0;
    return R(
      m,
      '🧰 Quick-tool pack: .quicktool1 … .quicktool507   har number ek working tool chalata hy (color, dates, templates, reminders, utilities). Try: .quicktool7',
    );
  },
};

const REAL = Object.assign({}, R1, R2, R3, R4, R5, EXTRA);

const QPOOL = [
  'randomcolor',
  'date2',
  'day',
  'uuid2',
  'timestampnow',
  'randompassword',
  'statusideas',
  'statussymbols',
  'statusseparator',
  'statustemplate',
  'goodmorning2',
  'goodnight2',
  'motivationstatus',
  'studystatus',
  'birthdaystatus',
  'eidstatus',
  'jummastatus',
  'symbolinfo',
  'unitinfo',
  'worldclock',
  'faq',
  'quickhelp',
  'quickcommands',
  'statuscounter',
  'statusrefresh',
  'hexcolor',
  'colorinfo',
  'emojiinfo',
  'randomdate',
  'randomtime',
  'weeknumber',
  'monthname',
  'statushashtags',
  'configcheck',
  'mediahelp',
  'filehelp',
  'contacthelp',
  'grouphelp',
  'confighelp',
];

const XDESC = {
  groupwelcome: 'Turn group welcome messages on or off.',
  groupgoodbye: 'Turn group goodbye messages on or off.',
  welcomeimage: 'Send a welcome card for new members.',
  goodbyeimage: 'Send a goodbye card when a member leaves.',
  setrules2: "Set or replace the group's rules text.",
  showrules: 'Show the current group rules.',
  addrule: "Add one rule to the group's rules list.",
  delrule: "Remove one rule from the group's rules list.",
  ruleslist: 'List all saved group rules.',
  setgroupicon2: 'Set the group profile picture from the replied image.',
  groupicon: 'Send the current group profile picture.',
  groupname: 'Show the current group name.',
  groupdesc: 'Show the current group description.',
  groupcreated: "Show the group's creation date when available.",
  groupowner: "Show the group's creator/owner when available.",
  grouplink: 'Generate or show the group invite link.',
  groupinvite: 'Create a shareable group invite message.',
  groupmembers: 'Show a numbered group member list.',
  groupadmins: 'Show only current group admins.',
  groupbots: 'Show bot/admin accounts detected in the group.',
  membercount2: 'Show the current group member count.',
  memberid: 'Show the WhatsApp ID of a mentioned member.',
  membertag: 'Mention a member with a custom short message.',
  tagmembers2: 'Mention all members with one message.',
  tagonline2: 'Mention members currently visible as online.',
  randommember: 'Pick and mention one random group member.',
  randomadmin: 'Pick and mention one random admin.',
  memberstats: 'Show simple message/activity stats for a member.',
  groupstats2: 'Show basic activity statistics for the group.',
  groupwelcomeinfo: 'Show the current welcome configuration.',
  groupgoodbyeinfo: 'Show the current goodbye configuration.',
  setwelcome2: 'Set a custom welcome message.',
  setgoodbye2: 'Set a custom goodbye message.',
  resetwelcome: 'Restore the default welcome message.',
  resetgoodbye: 'Restore the default goodbye message.',
  setrulesmode: 'Choose whether rules are shown on join.',
  setmemberlimit: 'Set a preferred member warning limit.',
  memberlimit: 'Show the configured member limit.',
  groupnote: 'Save a private note about the group.',
  groupnotes: 'List saved notes for the group.',
  addgroupnote: 'Add a new group note.',
  delgroupnote: 'Delete a saved group note.',
  groupreminder: 'Schedule a simple group reminder.',
  groupreminders: 'List scheduled group reminders.',
  delgroupreminder: 'Delete a scheduled group reminder.',
  groupannounce: 'Send a formatted announcement.',
  groupnotice: 'Send a short formatted notice.',
  groupvote: 'Create a simple group vote.',
  voteresult: 'Show the current vote results.',
  endvote: 'Close the current group vote.',
  groupfaq: 'Show frequently asked group questions.',
  addfaq: 'Add a question and answer to the group FAQ.',
  delfaq: 'Delete an FAQ entry.',
  faqlist: 'List saved group FAQ entries.',
  grouphelp: 'Show group-management commands.',
  memberhelp: 'Show member-management commands.',
  adminhelp2: 'Show admin-only commands.',
  groupconfig: 'Show the current group configuration.',
  exportgroup: 'Export basic group settings as text.',
  groupbackup2: 'Save basic group settings for restoration.',
  grouprestore2: 'Restore previously saved basic group settings.',
  groupmode: 'Show the current group moderation mode.',
  setgroupmode: 'Set a simple moderation mode.',
  memberwelcome: 'Send a manual welcome to a mentioned member.',
  membercard: 'Create a simple information card for a mentioned member.',
  groupcard: 'Create a simple group information card.',
  groupqr: 'Create a QR-style invite card when supported.',
  groupmention: 'Create a clean mention list message.',
  groupcount: 'Count admins, members, and bots separately.',
  warn2: 'Give a warning to a mentioned member.',
  warnings2: "Show a member's current warnings.",
  clearwarnings: 'Clear warnings for a member.',
  warnreason: 'Record a warning with a reason.',
  warnsettings: 'Show warning-system settings.',
  setwarnlimit: 'Set the number of warnings before action.',
  setwarnaction: 'Choose the action after the warning limit.',
  muteuser2: 'Temporarily mute a member where supported.',
  unmuteuser2: 'Remove a temporary mute.',
  mutelist: 'Show currently muted members.',
  setmutetime: 'Set the default mute duration.',
  kickreason: 'Remove a member with a recorded reason.',
  banreason: 'Ban a member with a recorded reason.',
  tempbanlist: 'List active temporary bans.',
  untempban: 'Remove a temporary ban.',
  baninfo: 'Show stored ban information.',
  banhistory: 'Show moderation history for a member.',
  modhistory: 'Show recent moderation actions.',
  modstats: 'Show moderation action counts.',
  setfloodlimit: 'Set the allowed message burst.',
  setfloodaction: 'Choose the action for flood detection.',
  anticaps2: 'Enable excessive-capital protection.',
  setcapslimit: 'Set the capital-letter threshold.',
  antispam3: 'Enable simple repeated-message protection.',
  setspamlimit: 'Set the repeated-message threshold.',
  setspamaction: 'Choose the spam response.',
  antilink2: 'Enable basic link filtering.',
  linkallow: 'Allow links from trusted domains.',
  linkdeny: 'Remove a domain from the allowlist.',
  linklist: 'Show allowed link domains.',
  antibadword2: 'Enable simple blocked-word filtering.',
  badwordadd: 'Add a blocked word.',
  badwordremove: 'Remove a blocked word.',
  badwordlist2: 'Show blocked words to admins.',
  setbadwordaction: 'Choose the action for blocked words.',
  antiinvite: 'Filter group invite links.',
  antimention: 'Limit excessive mentions.',
  setmentionlimit: 'Set the maximum mentions per message.',
  antiforward: 'Flag heavily forwarded messages.',
  antimedia: 'Restrict selected media types.',
  setmediarule: 'Configure a simple media rule.',
  moderationon: 'Turn moderation features on.',
  moderationoff: 'Turn moderation features off.',
  modstatus: 'Show moderation feature status.',
  modlogs: 'Show recent moderation logs.',
  clearmodlogs: 'Clear stored moderation logs.',
  automodhelp: 'Show automatic moderation commands.',
  slowmode2: 'Enable a simple slow-mode delay.',
  setslowtime: 'Set the slow-mode interval.',
  slowstatus: 'Show current slow-mode status.',
  approveuser: 'Add a member to the approved list.',
  removeapproved: 'Remove a member from the approved list.',
  approvedlist: 'Show approved members.',
  setmodrole: 'Set a simple moderation role label.',
  modrole: 'Show moderation role information.',
  raidmode: 'Enable stricter temporary moderation.',
  raidoff: 'Disable raid mode.',
  raidstatus: 'Show raid-mode status.',
  safeusers: 'Show trusted members.',
  trustuser: 'Add a member to trusted users.',
  untrustuser: 'Remove a member from trusted users.',
  trustlist: 'List trusted members.',
  modsummary: 'Summarize recent moderation activity.',
  statusmessage: 'Post a simple text status.',
  statusphoto: 'Post a photo status from replied media.',
  statusvideo2: 'Post a video status from replied media.',
  statusquote2: 'Create a quote-style status.',
  statuspoll2: 'Create a simple poll-style status.',
  statuslink: 'Create a status containing a link.',
  statusbanner: 'Create a simple banner-style status.',
  statusfont2: 'Choose a font for generated status text.',
  statuspreview: 'Preview generated status text.',
  statussave2: 'Save a generated status draft.',
  statusdrafts: 'List saved status drafts.',
  statusdraft: 'Create a status draft.',
  deldraft: 'Delete a saved status draft.',
  cleardrafts: 'Delete all saved status drafts.',
  statusschedule: 'Schedule a status draft where supported.',
  scheduledstatus: 'List scheduled statuses.',
  cancelscheduledstatus: 'Cancel a scheduled status.',
  statusreminder: 'Set a reminder to post a status.',
  statusideas: 'Generate simple status-topic ideas without AI.',
  statushashtags: 'Create relevant hashtags from keywords.',
  statussymbols: 'Show useful status symbols.',
  statusseparator: 'Generate decorative text separators.',
  statustemplate: 'Show reusable status templates.',
  goodmorning2: 'Create a good-morning status.',
  goodnight2: 'Create a good-night status.',
  motivationstatus: 'Create a short motivational status.',
  studystatus: 'Create a study-themed status.',
  birthdaystatus: 'Create a birthday status.',
  eidstatus: 'Create an Eid-themed status.',
  jummastatus: 'Create a Jumma-themed status.',
  statuscounter: 'Show how many saved status drafts exist.',
  statusprivacy2: 'Show status privacy settings.',
  statusmute2: 'Mute status updates from a contact.',
  statusunmute2: "Unmute a contact's status updates.",
  statuscontacts: 'Show available status contacts.',
  statusrefresh: 'Refresh status-related data.',
  message: 'Send a formatted message to a mentioned contact.',
  quotemessage: 'Reply with a quoted copy of the current message.',
  repeatmsg: 'Repeat a supplied message a selected number of times.',
  delaymsg: 'Send a message after a short delay.',
  broadcastmsg: 'Prepare a formatted broadcast message.',
  announcement: 'Create an announcement with a title.',
  notice: 'Create a compact notice.',
  remindmsg: 'Create a reminder message.',
  thankmsg: 'Create a thank-you message.',
  apologymessage: 'Create a short apology message.',
  welcomemessage: 'Create a welcoming message.',
  congratsmessage: 'Create a congratulation message.',
  goodluckmessage: 'Create a good-luck message.',
  birthdaymessage: 'Create a birthday greeting.',
  festivalmessage: 'Create a festival greeting.',
  quotemessage2: 'Format the replied text as a quote.',
  messagecount: 'Count messages in the current chat when supported.',
  chatstats: 'Show basic chat statistics when supported.',
  chatid: 'Show the current chat ID.',
  chattype: 'Show whether the current chat is private or group.',
  chatinfo: 'Show basic current-chat information.',
  lastmessage: 'Show information about the latest available message.',
  repliedinfo: 'Show basic metadata for the replied message.',
  contactinfo: 'Show basic information for a mentioned contact.',
  contactname: 'Show the saved display name of a contact.',
  contactnumber: 'Show the available phone number for a contact.',
  contactid: "Show a contact's WhatsApp ID.",
  contactdp: "Fetch a contact's profile picture.",
  contactbio: "Show a contact's public bio when available.",
  contactstatus: 'Show available public status information.',
  contactcard: 'Create a simple contact card.',
  contactqr: 'Create a QR-style contact card.',
  savecard: 'Create a shareable vCard-style card.',
  contactsearch: 'Search locally available contacts by name.',
  contactlist: 'List saved bot contact entries.',
  addcontact: "Add a contact entry to the bot's local list.",
  removecontact: "Remove a contact from the bot's local list.",
  renamecontact: 'Rename a local contact entry.',
  contactnote: 'Save a private note for a contact.',
  contactnotes: 'List notes for a contact.',
  addcontactnote: 'Add a note for a contact.',
  delcontactnote: 'Delete a contact note.',
  contactreminder: 'Set a reminder for a contact.',
  contactreminders: 'List contact reminders.',
  delcontactreminder: 'Delete a contact reminder.',
  contactgroup: 'Show groups shared with a contact when available.',
  sharedgroups: 'List groups shared with a contact when available.',
  contacthelp: 'Show contact-related commands.',
  contactsettings: 'Show contact-related settings.',
  contactcount: 'Count locally stored contacts.',
  contactexport: 'Export local contact entries as text.',
  contactimport: 'Import simple contact entries from text.',
  contactbackup: 'Back up local contact entries.',
  contactrestore: 'Restore local contact entries.',
  makepack: 'Create a simple sticker-pack entry.',
  packadd: 'Add a sticker to a local pack.',
  packremove: 'Remove a sticker from a local pack.',
  packlist: 'List local sticker packs.',
  packrename: 'Rename a local sticker pack.',
  packauthor: 'Set the sticker-pack author.',
  packcover: 'Set a sticker-pack cover.',
  packdelete: 'Delete a local sticker pack.',
  stickerinfo2: 'Show basic sticker metadata.',
  stickerid: 'Show sticker metadata or ID.',
  stickerauthor: 'Show sticker author information.',
  stickerpack2: 'Show the current sticker pack.',
  stickertext2: 'Create a text sticker.',
  stickeremoji2: 'Create an emoji sticker.',
  stickerquote: 'Create a quote sticker from replied text.',
  stickerlabel: 'Add a short label to a sticker.',
  stickercrop2: 'Crop an image before converting to sticker.',
  stickerfit: 'Fit an image into a sticker canvas.',
  stickerpad: 'Add padding around a sticker.',
  stickersquare: 'Make a square sticker canvas.',
  stickerround2: 'Create a rounded sticker-style image.',
  stickerframe2: 'Add a simple frame around a sticker.',
  stickertitle: 'Add a title to a sticker.',
  stickerbadge: 'Add a small badge to a sticker.',
  stickerdate: 'Add a date label to a sticker.',
  stickertime: 'Add a time label to a sticker.',
  stickersign: 'Add a simple signature label.',
  stickerwatermark: 'Add a text watermark.',
  stickermerge: 'Combine simple sticker images.',
  stickergrid: 'Create a sticker grid preview.',
  stickerpreview: 'Preview a local sticker pack.',
  stickerdelete: 'Delete a generated sticker.',
  mediainfo2: 'Show basic media information.',
  mediasize: 'Show media file size.',
  mediaformat: 'Show media format.',
  mediaduration: 'Show media duration when available.',
  mediaresolution: 'Show image/video resolution.',
  mediarename: 'Rename a generated media file.',
  mediacopy: 'Copy media metadata to text.',
  mediaquote: 'Reply with media information.',
  mediacaption: 'Add or replace a media caption.',
  mediaextract: 'Extract available metadata from media.',
  mediapreview: 'Create a preview of supported media.',
  mediaarchive: 'Save media metadata to a local archive.',
  medialist: 'List recently generated media.',
  mediaclear: 'Clear the local media list.',
  mediahelp: 'Show simple media commands.',
  fileinfo: 'Show basic information about a replied file.',
  filesize: 'Show the size of a replied file.',
  filetype: 'Show the MIME or file type.',
  filename: 'Show the current file name.',
  filerename: 'Rename a replied file.',
  filecopy: 'Create a local copy of a file.',
  filelist: 'List locally stored bot files.',
  filedelete: 'Delete a local bot file.',
  fileclear: 'Clear generated temporary files.',
  filepreview: 'Create a preview for supported documents.',
  filetext: 'Extract text from a simple text file.',
  filelines: 'Count lines in a text file.',
  filewords: 'Count words in a text file.',
  filechars: 'Count characters in a text file.',
  filehead: 'Show the first lines of a text file.',
  filetail: 'Show the last lines of a text file.',
  filemerge: 'Merge compatible text files.',
  filecompare: 'Compare two text files.',
  filebackup: 'Create a local file backup.',
  filerestore: 'Restore a local file backup.',
  filezip: 'Create a ZIP from selected local files.',
  fileunzip: 'Extract a ZIP file.',
  filelistzip: 'List files inside a ZIP.',
  filepdfinfo: 'Show basic PDF metadata.',
  filedocinfo: 'Show basic document metadata.',
  filecsvinfo: 'Show CSV row and column counts.',
  filejsoninfo: 'Show JSON structure information.',
  filetxt: 'Create a TXT file from replied text.',
  filecsv: 'Create a CSV file from simple rows.',
  filejson: 'Create a JSON file from simple key-value text.',
  filemd: 'Create a Markdown file from text.',
  filehtml: 'Create a simple HTML file from text.',
  filebase64: 'Encode a small file as Base64 text.',
  base64file: 'Decode Base64 text into a file.',
  filechecksum: 'Calculate a file checksum.',
  filehash: 'Show a hash for a file.',
  filemime: 'Show the MIME type.',
  filepath: 'Show the local path of a generated file.',
  filecreated: "Show a file's creation time when available.",
  filemodified: "Show a file's modified time when available.",
  fileempty: 'Check whether a text file is empty.',
  fileencoding: 'Detect common text encoding.',
  fileclean: 'Clean simple extra whitespace from text files.',
  filewrap: 'Wrap long text lines in a file.',
  filejoin: 'Join compatible text files.',
  filesplit: 'Split a text file into smaller parts.',
  filechunks: 'Show the number of generated file chunks.',
  filehelp: 'Show file-related commands.',
  setreplymode: "Set the bot's basic reply mode.",
  replymode: 'Show the current reply mode.',
  setreactmode: 'Set automatic reaction mode.',
  reactmode: 'Show reaction-mode status.',
  setreadmode: 'Set automatic read behavior.',
  readmode: 'Show read-mode status.',
  setpresence: "Set the bot's presence behavior.",
  presence: 'Show presence settings.',
  setstatusmsg: "Set the bot's status message.",
  statusmsg: "Show the bot's current status message.",
  ownerlist: 'Show configured owner entries.',
  addowner: 'Add an owner entry.',
  removeowner: 'Remove an owner entry.',
  setprefix3: 'Set a new command prefix.',
  prefixinfo: 'Show the active command prefix.',
  resetprefix2: 'Restore the default command prefix.',
  setlanguage2: "Set the bot's interface language.",
  langinfo: 'Show the active interface language.',
  settimezone2: "Set the bot's timezone.",
  tzinfo: 'Show the configured timezone.',
  setbotdp: 'Set the bot profile picture.',
  getbotdp: 'Show the current bot profile picture.',
  setbotbio: 'Set the bot profile bio.',
  getbotbio: 'Show the current bot bio.',
  setbotdesc: 'Set the bot description.',
  getbotdesc: 'Show the bot description.',
  getfooter: 'Show the current response footer.',
  clearfooter: 'Remove the configured response footer.',
  setprefixhelp: 'Show prefix configuration help.',
  config: 'Show a compact configuration summary.',
  configcheck: 'Check basic bot configuration.',
  configreset: 'Reset safe bot preferences to defaults.',
  featurelist: 'List enabled bot features.',
  featureinfo: 'Show information about one feature.',
  featureon: 'Enable a supported feature.',
  featureoff: 'Disable a supported feature.',
  autodelete: 'Enable automatic deletion of bot replies.',
  autodeletetime: 'Set the automatic deletion delay.',
  autodeletestatus: 'Show auto-delete status.',
  autoreply: 'Enable simple keyword auto-replies.',
  autoreplyadd: 'Add a keyword auto-reply.',
  autoreplyremove: 'Remove a keyword auto-reply.',
  autoreplylist: 'List keyword auto-replies.',
  autoreplyclear: 'Clear keyword auto-replies.',
  keywordadd: 'Add a simple trigger keyword.',
  keywordremove: 'Remove a trigger keyword.',
  keywordlist: 'List trigger keywords.',
  reactionadd: 'Add a keyword reaction.',
  reactionremove: 'Remove a keyword reaction.',
  configexport: 'Export safe bot settings as text.',
  configimport: 'Import safe bot settings from text.',
  configbackup: 'Back up safe bot settings.',
  configrestore: 'Restore safe bot settings.',
  confighelp: 'Show bot configuration commands.',
  searchweb: 'Search the web for a supplied query.',
  searchnews: 'Search recent news for a supplied topic.',
  searchimages: 'Search images for a supplied topic.',
  searchvideos: 'Search videos for a supplied topic.',
  searchmaps: 'Search map results for a supplied place.',
  searchbooks: 'Search books by title or author.',
  searchapps: 'Search apps by name.',
  searchgames: 'Search games by title.',
  searchmovies: 'Search movies by title.',
  searchseries: 'Search series by title.',
  searchsongs: 'Search songs by title.',
  searchartists: 'Search music artists.',
  searchrecipes: 'Search recipes by dish name.',
  searchmeaning: 'Search word meanings.',
  searchsynonyms: 'Search synonyms for a word.',
  searchantonyms: 'Search antonyms for a word.',
  searchquotes: 'Search a local quote collection.',
  searchfacts: 'Search a local facts collection.',
  searchcountries: 'Search basic country information.',
  searchcities: 'Search basic city information.',
  searchcapitals: "Find a country's capital.",
  searchflags: "Find a country's flag information.",
  searchcurrency: "Find a country's currency.",
  searchtimezone: "Find a country's timezone.",
  searchlanguage: 'Find common languages for a country.',
  searchcode: 'Search a local code-snippet collection.',
  searchcommands: "Search the bot's command list.",
  findcommand: 'Find commands matching a keyword.',
  commandcategory: 'Show commands from a category.',
  commandusage: 'Show usage for a command.',
  commandalias: 'Show aliases for a command.',
  randomcommand: 'Pick a random useful command.',
  newcommand: 'Show recently added commands.',
  popularcommands: 'Show popular bot commands.',
  quickcommands: 'Show a compact quick-command list.',
  basiccommands: 'Show beginner-friendly commands.',
  groupcommands: 'Show group-related commands.',
  mediacommands: 'Show media-related commands.',
  utilitycommands: 'Show utility commands.',
  statuscommands: 'Show status-related commands.',
  securitycommands: 'Show security commands.',
  ownercommands: 'Show owner-only commands.',
  settingscommands: 'Show settings commands.',
  searchcommands2: 'Show search-related commands.',
  helpcommand: 'Show help for a specific command.',
  usage: 'Show an example of a command.',
  examples: 'Show command usage examples.',
  faq: 'Show frequently asked bot questions.',
  quickhelp: 'Show the most useful commands.',
  date2: "Show today's date.",
  day: 'Show the current day of the week.',
  monthname: 'Show the current month.',
  weeknumber: 'Show the current week number.',
  daysleft: 'Calculate days remaining until a date.',
  daysago: 'Calculate days between a date and today.',
  age2: 'Calculate age from a birth date.',
  bmi: 'Calculate BMI from supplied values.',
  tip: 'Calculate a simple tip amount.',
  discount: 'Calculate a discounted price.',
  tax: 'Calculate a simple tax amount.',
  splitbill: 'Split a bill between people.',
  change: 'Calculate change from a payment.',
  profit: 'Calculate simple profit.',
  loss: 'Calculate simple loss.',
  profitpercent: 'Calculate profit percentage.',
  discountpercent: 'Calculate discount percentage.',
  ratio2: 'Simplify a ratio.',
  fraction2: 'Simplify a fraction.',
  round: 'Round a number.',
  ceil: 'Round a number upward.',
  floor: 'Round a number downward.',
  randomdate: 'Generate a random date.',
  randomtime: 'Generate a random time.',
  randomcolor: 'Generate a random color code.',
  hexcolor: 'Convert a color name or code.',
  colorinfo: 'Show basic color information.',
  emojiinfo: 'Show information about an emoji.',
  symbolinfo: 'Show information about a symbol.',
  countryinfo: 'Show basic country information.',
  countrycode: "Find a country's calling code.",
  callingcode: 'Find a country by calling code.',
  currencyinfo: 'Show basic currency information.',
  unitinfo: 'Show information about a measurement unit.',
  timezoneinfo: 'Show basic timezone information.',
  timein: 'Show the time for a supplied city.',
  worldclock: 'Show times for selected cities.',
  stopwatch3: 'Run a simple stopwatch.',
  timer3: 'Run a simple countdown timer.',
  remindme: 'Create a personal reminder.',
  reminders2: 'List personal reminders.',
  delreminder2: 'Delete a personal reminder.',
  note2: 'Save a quick personal note.',
  notes2: 'List quick personal notes.',
  delnote2: 'Delete a quick personal note.',
  calc2: 'Evaluate a basic arithmetic expression.',
  convert2: 'Convert common units.',
  textcount: 'Count words and characters in supplied text.',
  linkpreview: 'Show basic information about a supplied URL.',
  domainage: 'Show domain-age information when available.',
  qrtext: 'Create a QR code from text.',
  qrcontact2: 'Create a QR code from contact text.',
  qrwifi: 'Create a QR code for Wi-Fi settings.',
  barcode2: 'Create a barcode from supported text.',
  passwordstrength: 'Check basic password strength locally.',
  randompassword: 'Generate a random password.',
  uuid2: 'Generate a UUID.',
  timestamp: 'Convert a date to a Unix timestamp.',
  timestampnow: 'Show the current Unix timestamp.',
  timestampdate: 'Convert a Unix timestamp to a date.',
  jsonpretty: 'Pretty-print JSON.',
  jsonminify: 'Minify JSON.',
  urlencode: 'URL-encode text.',
  urldecode: 'URL-decode text.',
  htmlencode: 'HTML-encode text.',
  htmldecode: 'HTML-decode text.',
  unicode: 'Show Unicode code points.',
  charinfo: 'Show character information.',
  ascii2: 'Convert text to simple ASCII art.',
  binary2: 'Convert text to binary.',
  binarytext: 'Convert binary back to text.',
  hextext: 'Convert text to hexadecimal.',
  hexdecode: 'Decode hexadecimal text.',
  quicktool1: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #1.',
  quicktool2: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #2.',
  quicktool3: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #3.',
  quicktool4: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #4.',
  quicktool5: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #5.',
  quicktool6: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #6.',
  quicktool7: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #7.',
  quicktool8: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #8.',
  quicktool9: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #9.',
  quicktool10: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #10.',
  quicktool11: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #11.',
  quicktool12: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #12.',
  quicktool13: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #13.',
  quicktool14: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #14.',
  quicktool15: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #15.',
  quicktool16: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #16.',
  quicktool17: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #17.',
  quicktool18: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #18.',
  quicktool19: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #19.',
  quicktool20: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #20.',
  quicktool21: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #21.',
  quicktool22: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #22.',
  quicktool23: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #23.',
  quicktool24: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #24.',
  quicktool25: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #25.',
  quicktool26: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #26.',
  quicktool27: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #27.',
  quicktool28: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #28.',
  quicktool29: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #29.',
  quicktool30: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #30.',
  quicktool31: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #31.',
  quicktool32: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #32.',
  quicktool33: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #33.',
  quicktool34: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #34.',
  quicktool35: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #35.',
  quicktool36: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #36.',
  quicktool37: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #37.',
  quicktool38: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #38.',
  quicktool39: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #39.',
  quicktool40: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #40.',
  quicktool41: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #41.',
  quicktool42: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #42.',
  quicktool43: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #43.',
  quicktool44: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #44.',
  quicktool45: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #45.',
  quicktool46: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #46.',
  quicktool47: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #47.',
  quicktool48: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #48.',
  quicktool49: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #49.',
  quicktool50: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #50.',
  quicktool51: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #51.',
  quicktool52: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #52.',
  quicktool53: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #53.',
  quicktool54: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #54.',
  quicktool55: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #55.',
  quicktool56: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #56.',
  quicktool57: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #57.',
  quicktool58: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #58.',
  quicktool59: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #59.',
  quicktool60: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #60.',
  quicktool61: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #61.',
  quicktool62: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #62.',
  quicktool63: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #63.',
  quicktool64: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #64.',
  quicktool65: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #65.',
  quicktool66: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #66.',
  quicktool67: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #67.',
  quicktool68: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #68.',
  quicktool69: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #69.',
  quicktool70: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #70.',
  quicktool71: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #71.',
  quicktool72: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #72.',
  quicktool73: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #73.',
  quicktool74: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #74.',
  quicktool75: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #75.',
  quicktool76: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #76.',
  quicktool77: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #77.',
  quicktool78: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #78.',
  quicktool79: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #79.',
  quicktool80: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #80.',
  quicktool81: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #81.',
  quicktool82: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #82.',
  quicktool83: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #83.',
  quicktool84: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #84.',
  quicktool85: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #85.',
  quicktool86: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #86.',
  quicktool87: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #87.',
  quicktool88: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #88.',
  quicktool89: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #89.',
  quicktool90: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #90.',
  quicktool91: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #91.',
  quicktool92: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #92.',
  quicktool93: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #93.',
  quicktool94: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #94.',
  quicktool95: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #95.',
  quicktool96: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #96.',
  quicktool97: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #97.',
  quicktool98: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #98.',
  quicktool99: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #99.',
  quicktool100: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #100.',
  quicktool101: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #101.',
  quicktool102: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #102.',
  quicktool103: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #103.',
  quicktool104: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #104.',
  quicktool105: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #105.',
  quicktool106: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #106.',
  quicktool107: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #107.',
  quicktool108: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #108.',
  quicktool109: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #109.',
  quicktool110: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #110.',
  quicktool111: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #111.',
  quicktool112: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #112.',
  quicktool113: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #113.',
  quicktool114: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #114.',
  quicktool115: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #115.',
  quicktool116: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #116.',
  quicktool117: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #117.',
  quicktool118: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #118.',
  quicktool119: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #119.',
  quicktool120: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #120.',
  quicktool121: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #121.',
  quicktool122: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #122.',
  quicktool123: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #123.',
  quicktool124: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #124.',
  quicktool125: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #125.',
  quicktool126: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #126.',
  quicktool127: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #127.',
  quicktool128: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #128.',
  quicktool129: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #129.',
  quicktool130: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #130.',
  quicktool131: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #131.',
  quicktool132: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #132.',
  quicktool133: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #133.',
  quicktool134: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #134.',
  quicktool135: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #135.',
  quicktool136: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #136.',
  quicktool137: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #137.',
  quicktool138: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #138.',
  quicktool139: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #139.',
  quicktool140: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #140.',
  quicktool141: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #141.',
  quicktool142: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #142.',
  quicktool143: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #143.',
  quicktool144: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #144.',
  quicktool145: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #145.',
  quicktool146: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #146.',
  quicktool147: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #147.',
  quicktool148: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #148.',
  quicktool149: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #149.',
  quicktool150: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #150.',
  quicktool151: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #151.',
  quicktool152: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #152.',
  quicktool153: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #153.',
  quicktool154: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #154.',
  quicktool155: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #155.',
  quicktool156: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #156.',
  quicktool157: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #157.',
  quicktool158: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #158.',
  quicktool159: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #159.',
  quicktool160: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #160.',
  quicktool161: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #161.',
  quicktool162: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #162.',
  quicktool163: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #163.',
  quicktool164: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #164.',
  quicktool165: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #165.',
  quicktool166: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #166.',
  quicktool167: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #167.',
  quicktool168: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #168.',
  quicktool169: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #169.',
  quicktool170: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #170.',
  quicktool171: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #171.',
  quicktool172: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #172.',
  quicktool173: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #173.',
  quicktool174: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #174.',
  quicktool175: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #175.',
  quicktool176: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #176.',
  quicktool177: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #177.',
  quicktool178: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #178.',
  quicktool179: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #179.',
  quicktool180: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #180.',
  quicktool181: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #181.',
  quicktool182: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #182.',
  quicktool183: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #183.',
  quicktool184: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #184.',
  quicktool185: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #185.',
  quicktool186: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #186.',
  quicktool187: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #187.',
  quicktool188: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #188.',
  quicktool189: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #189.',
  quicktool190: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #190.',
  quicktool191: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #191.',
  quicktool192: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #192.',
  quicktool193: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #193.',
  quicktool194: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #194.',
  quicktool195: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #195.',
  quicktool196: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #196.',
  quicktool197: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #197.',
  quicktool198: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #198.',
  quicktool199: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #199.',
  quicktool200: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #200.',
  quicktool201: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #201.',
  quicktool202: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #202.',
  quicktool203: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #203.',
  quicktool204: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #204.',
  quicktool205: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #205.',
  quicktool206: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #206.',
  quicktool207: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #207.',
  quicktool208: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #208.',
  quicktool209: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #209.',
  quicktool210: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #210.',
  quicktool211: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #211.',
  quicktool212: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #212.',
  quicktool213: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #213.',
  quicktool214: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #214.',
  quicktool215: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #215.',
  quicktool216: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #216.',
  quicktool217: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #217.',
  quicktool218: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #218.',
  quicktool219: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #219.',
  quicktool220: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #220.',
  quicktool221: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #221.',
  quicktool222: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #222.',
  quicktool223: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #223.',
  quicktool224: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #224.',
  quicktool225: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #225.',
  quicktool226: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #226.',
  quicktool227: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #227.',
  quicktool228: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #228.',
  quicktool229: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #229.',
  quicktool230: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #230.',
  quicktool231: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #231.',
  quicktool232: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #232.',
  quicktool233: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #233.',
  quicktool234: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #234.',
  quicktool235: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #235.',
  quicktool236: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #236.',
  quicktool237: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #237.',
  quicktool238: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #238.',
  quicktool239: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #239.',
  quicktool240: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #240.',
  quicktool241: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #241.',
  quicktool242: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #242.',
  quicktool243: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #243.',
  quicktool244: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #244.',
  quicktool245: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #245.',
  quicktool246: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #246.',
  quicktool247: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #247.',
  quicktool248: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #248.',
  quicktool249: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #249.',
  quicktool250: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #250.',
  quicktool251: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #251.',
  quicktool252: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #252.',
  quicktool253: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #253.',
  quicktool254: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #254.',
  quicktool255: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #255.',
  quicktool256: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #256.',
  quicktool257: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #257.',
  quicktool258: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #258.',
  quicktool259: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #259.',
  quicktool260: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #260.',
  quicktool261: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #261.',
  quicktool262: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #262.',
  quicktool263: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #263.',
  quicktool264: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #264.',
  quicktool265: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #265.',
  quicktool266: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #266.',
  quicktool267: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #267.',
  quicktool268: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #268.',
  quicktool269: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #269.',
  quicktool270: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #270.',
  quicktool271: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #271.',
  quicktool272: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #272.',
  quicktool273: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #273.',
  quicktool274: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #274.',
  quicktool275: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #275.',
  quicktool276: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #276.',
  quicktool277: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #277.',
  quicktool278: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #278.',
  quicktool279: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #279.',
  quicktool280: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #280.',
  quicktool281: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #281.',
  quicktool282: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #282.',
  quicktool283: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #283.',
  quicktool284: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #284.',
  quicktool285: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #285.',
  quicktool286: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #286.',
  quicktool287: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #287.',
  quicktool288: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #288.',
  quicktool289: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #289.',
  quicktool290: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #290.',
  quicktool291: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #291.',
  quicktool292: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #292.',
  quicktool293: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #293.',
  quicktool294: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #294.',
  quicktool295: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #295.',
  quicktool296: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #296.',
  quicktool297: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #297.',
  quicktool298: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #298.',
  quicktool299: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #299.',
  quicktool300: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #300.',
  quicktool301: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #301.',
  quicktool302: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #302.',
  quicktool303: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #303.',
  quicktool304: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #304.',
  quicktool305: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #305.',
  quicktool306: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #306.',
  quicktool307: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #307.',
  quicktool308: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #308.',
  quicktool309: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #309.',
  quicktool310: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #310.',
  quicktool311: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #311.',
  quicktool312: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #312.',
  quicktool313: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #313.',
  quicktool314: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #314.',
  quicktool315: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #315.',
  quicktool316: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #316.',
  quicktool317: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #317.',
  quicktool318: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #318.',
  quicktool319: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #319.',
  quicktool320: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #320.',
  quicktool321: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #321.',
  quicktool322: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #322.',
  quicktool323: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #323.',
  quicktool324: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #324.',
  quicktool325: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #325.',
  quicktool326: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #326.',
  quicktool327: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #327.',
  quicktool328: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #328.',
  quicktool329: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #329.',
  quicktool330: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #330.',
  quicktool331: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #331.',
  quicktool332: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #332.',
  quicktool333: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #333.',
  quicktool334: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #334.',
  quicktool335: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #335.',
  quicktool336: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #336.',
  quicktool337: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #337.',
  quicktool338: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #338.',
  quicktool339: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #339.',
  quicktool340: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #340.',
  quicktool341: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #341.',
  quicktool342: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #342.',
  quicktool343: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #343.',
  quicktool344: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #344.',
  quicktool345: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #345.',
  quicktool346: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #346.',
  quicktool347: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #347.',
  quicktool348: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #348.',
  quicktool349: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #349.',
  quicktool350: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #350.',
  quicktool351: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #351.',
  quicktool352: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #352.',
  quicktool353: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #353.',
  quicktool354: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #354.',
  quicktool355: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #355.',
  quicktool356: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #356.',
  quicktool357: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #357.',
  quicktool358: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #358.',
  quicktool359: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #359.',
  quicktool360: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #360.',
  quicktool361: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #361.',
  quicktool362: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #362.',
  quicktool363: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #363.',
  quicktool364: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #364.',
  quicktool365: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #365.',
  quicktool366: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #366.',
  quicktool367: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #367.',
  quicktool368: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #368.',
  quicktool369: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #369.',
  quicktool370: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #370.',
  quicktool371: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #371.',
  quicktool372: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #372.',
  quicktool373: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #373.',
  quicktool374: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #374.',
  quicktool375: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #375.',
  quicktool376: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #376.',
  quicktool377: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #377.',
  quicktool378: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #378.',
  quicktool379: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #379.',
  quicktool380: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #380.',
  quicktool381: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #381.',
  quicktool382: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #382.',
  quicktool383: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #383.',
  quicktool384: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #384.',
  quicktool385: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #385.',
  quicktool386: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #386.',
  quicktool387: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #387.',
  quicktool388: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #388.',
  quicktool389: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #389.',
  quicktool390: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #390.',
  quicktool391: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #391.',
  quicktool392: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #392.',
  quicktool393: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #393.',
  quicktool394: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #394.',
  quicktool395: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #395.',
  quicktool396: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #396.',
  quicktool397: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #397.',
  quicktool398: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #398.',
  quicktool399: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #399.',
  quicktool400: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #400.',
  quicktool401: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #401.',
  quicktool402: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #402.',
  quicktool403: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #403.',
  quicktool404: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #404.',
  quicktool405: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #405.',
  quicktool406: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #406.',
  quicktool407: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #407.',
  quicktool408: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #408.',
  quicktool409: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #409.',
  quicktool410: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #410.',
  quicktool411: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #411.',
  quicktool412: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #412.',
  quicktool413: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #413.',
  quicktool414: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #414.',
  quicktool415: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #415.',
  quicktool416: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #416.',
  quicktool417: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #417.',
  quicktool418: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #418.',
  quicktool419: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #419.',
  quicktool420: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #420.',
  quicktool421: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #421.',
  quicktool422: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #422.',
  quicktool423: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #423.',
  quicktool424: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #424.',
  quicktool425: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #425.',
  quicktool426: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #426.',
  quicktool427: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #427.',
  quicktool428: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #428.',
  quicktool429: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #429.',
  quicktool430: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #430.',
  quicktool431: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #431.',
  quicktool432: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #432.',
  quicktool433: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #433.',
  quicktool434: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #434.',
  quicktool435: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #435.',
  quicktool436: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #436.',
  quicktool437: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #437.',
  quicktool438: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #438.',
  quicktool439: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #439.',
  quicktool440: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #440.',
  quicktool441: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #441.',
  quicktool442: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #442.',
  quicktool443: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #443.',
  quicktool444: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #444.',
  quicktool445: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #445.',
  quicktool446: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #446.',
  quicktool447: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #447.',
  quicktool448: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #448.',
  quicktool449: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #449.',
  quicktool450: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #450.',
  quicktool451: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #451.',
  quicktool452: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #452.',
  quicktool453: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #453.',
  quicktool454: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #454.',
  quicktool455: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #455.',
  quicktool456: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #456.',
  quicktool457: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #457.',
  quicktool458: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #458.',
  quicktool459: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #459.',
  quicktool460: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #460.',
  quicktool461: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #461.',
  quicktool462: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #462.',
  quicktool463: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #463.',
  quicktool464: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #464.',
  quicktool465: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #465.',
  quicktool466: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #466.',
  quicktool467: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #467.',
  quicktool468: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #468.',
  quicktool469: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #469.',
  quicktool470: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #470.',
  quicktool471: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #471.',
  quicktool472: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #472.',
  quicktool473: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #473.',
  quicktool474: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #474.',
  quicktool475: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #475.',
  quicktool476: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #476.',
  quicktool477: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #477.',
  quicktool478: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #478.',
  quicktool479: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #479.',
  quicktool480: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #480.',
  quicktool481: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #481.',
  quicktool482: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #482.',
  quicktool483: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #483.',
  quicktool484: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #484.',
  quicktool485: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #485.',
  quicktool486: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #486.',
  quicktool487: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #487.',
  quicktool488: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #488.',
  quicktool489: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #489.',
  quicktool490: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #490.',
  quicktool491: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #491.',
  quicktool492: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #492.',
  quicktool493: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #493.',
  quicktool494: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #494.',
  quicktool495: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #495.',
  quicktool496: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #496.',
  quicktool497: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #497.',
  quicktool498: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #498.',
  quicktool499: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #499.',
  quicktool500: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #500.',
  quicktool501: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #501.',
  quicktool502: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #502.',
  quicktool503: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #503.',
  quicktool504: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #504.',
  quicktool505: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #505.',
  quicktool506: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #506.',
  quicktool507: 'Simple utility command placeholder for a lightweight WhatsApp bot feature #507.',
  'command count': 'Utility command',
  vote: 'Cast a vote in the open group vote.',
  quicktoolinfo: 'Quick-tool pack info   507 quick tools ka intro.',
  commandcount: 'Show the total registered command count.',
};

const CAT = {
  groupwelcome: 'GROUP',
  groupgoodbye: 'GROUP',
  welcomeimage: 'GROUP',
  goodbyeimage: 'GROUP',
  setrules2: 'GROUP',
  showrules: 'GROUP',
  addrule: 'GROUP',
  delrule: 'GROUP',
  ruleslist: 'GROUP',
  setgroupicon2: 'GROUP',
  groupicon: 'GROUP',
  groupname: 'GROUP',
  groupdesc: 'GROUP',
  groupcreated: 'GROUP',
  groupowner: 'GROUP',
  grouplink: 'GROUP',
  groupinvite: 'GROUP',
  groupmembers: 'GROUP',
  groupadmins: 'GROUP',
  groupbots: 'GROUP',
  membercount2: 'GROUP',
  memberid: 'GROUP',
  membertag: 'GROUP',
  tagmembers2: 'GROUP',
  tagonline2: 'GROUP',
  randommember: 'GROUP',
  randomadmin: 'GROUP',
  memberstats: 'GROUP',
  groupstats2: 'GROUP',
  groupwelcomeinfo: 'GROUP',
  groupgoodbyeinfo: 'GROUP',
  setwelcome2: 'GROUP',
  setgoodbye2: 'GROUP',
  resetwelcome: 'GROUP',
  resetgoodbye: 'GROUP',
  setrulesmode: 'GROUP',
  setmemberlimit: 'GROUP',
  memberlimit: 'GROUP',
  groupnote: 'GROUP',
  groupnotes: 'GROUP',
  addgroupnote: 'GROUP',
  delgroupnote: 'GROUP',
  groupreminder: 'GROUP',
  groupreminders: 'GROUP',
  delgroupreminder: 'GROUP',
  groupannounce: 'GROUP',
  groupnotice: 'GROUP',
  groupvote: 'GROUP',
  voteresult: 'GROUP',
  endvote: 'GROUP',
  groupfaq: 'GROUP',
  addfaq: 'GROUP',
  delfaq: 'GROUP',
  faqlist: 'GROUP',
  grouphelp: 'GROUP',
  memberhelp: 'GROUP',
  adminhelp2: 'GROUP',
  groupconfig: 'GROUP',
  exportgroup: 'GROUP',
  groupbackup2: 'GROUP',
  grouprestore2: 'GROUP',
  groupmode: 'GROUP',
  setgroupmode: 'GROUP',
  memberwelcome: 'GROUP',
  membercard: 'GROUP',
  groupcard: 'GROUP',
  groupqr: 'GROUP',
  groupmention: 'GROUP',
  groupcount: 'GROUP',
  warn2: 'SECURITY',
  warnings2: 'SECURITY',
  clearwarnings: 'SECURITY',
  warnreason: 'SECURITY',
  warnsettings: 'SECURITY',
  setwarnlimit: 'SECURITY',
  setwarnaction: 'SECURITY',
  muteuser2: 'SECURITY',
  unmuteuser2: 'SECURITY',
  mutelist: 'SECURITY',
  setmutetime: 'SECURITY',
  kickreason: 'SECURITY',
  banreason: 'SECURITY',
  tempbanlist: 'SECURITY',
  untempban: 'SECURITY',
  baninfo: 'SECURITY',
  banhistory: 'SECURITY',
  modhistory: 'SECURITY',
  modstats: 'SECURITY',
  setfloodlimit: 'SECURITY',
  setfloodaction: 'SECURITY',
  anticaps2: 'SECURITY',
  setcapslimit: 'SECURITY',
  antispam3: 'SECURITY',
  setspamlimit: 'SECURITY',
  setspamaction: 'SECURITY',
  antilink2: 'SECURITY',
  linkallow: 'SECURITY',
  linkdeny: 'SECURITY',
  linklist: 'SECURITY',
  antibadword2: 'SECURITY',
  badwordadd: 'SECURITY',
  badwordremove: 'SECURITY',
  badwordlist2: 'SECURITY',
  setbadwordaction: 'SECURITY',
  antiinvite: 'SECURITY',
  antimention: 'SECURITY',
  setmentionlimit: 'SECURITY',
  antiforward: 'SECURITY',
  antimedia: 'SECURITY',
  setmediarule: 'SECURITY',
  moderationon: 'SECURITY',
  moderationoff: 'SECURITY',
  modstatus: 'SECURITY',
  modlogs: 'SECURITY',
  clearmodlogs: 'SECURITY',
  automodhelp: 'SECURITY',
  slowmode2: 'SECURITY',
  setslowtime: 'SECURITY',
  slowstatus: 'SECURITY',
  approveuser: 'SECURITY',
  removeapproved: 'SECURITY',
  approvedlist: 'SECURITY',
  setmodrole: 'SECURITY',
  modrole: 'SECURITY',
  raidmode: 'SECURITY',
  raidoff: 'SECURITY',
  raidstatus: 'SECURITY',
  safeusers: 'SECURITY',
  trustuser: 'SECURITY',
  untrustuser: 'SECURITY',
  trustlist: 'SECURITY',
  modsummary: 'SECURITY',
  statusmessage: 'STATUS',
  statusphoto: 'STATUS',
  statusvideo2: 'STATUS',
  statusquote2: 'STATUS',
  statuspoll2: 'STATUS',
  statuslink: 'STATUS',
  statusbanner: 'STATUS',
  statusfont2: 'STATUS',
  statuspreview: 'STATUS',
  statussave2: 'STATUS',
  statusdrafts: 'STATUS',
  statusdraft: 'STATUS',
  deldraft: 'STATUS',
  cleardrafts: 'STATUS',
  statusschedule: 'STATUS',
  scheduledstatus: 'STATUS',
  cancelscheduledstatus: 'STATUS',
  statusreminder: 'STATUS',
  statusideas: 'STATUS',
  statushashtags: 'STATUS',
  statussymbols: 'STATUS',
  statusseparator: 'STATUS',
  statustemplate: 'STATUS',
  goodmorning2: 'STATUS',
  goodnight2: 'STATUS',
  motivationstatus: 'STATUS',
  studystatus: 'STATUS',
  birthdaystatus: 'STATUS',
  eidstatus: 'STATUS',
  jummastatus: 'STATUS',
  statuscounter: 'STATUS',
  statusprivacy2: 'STATUS',
  statusmute2: 'STATUS',
  statusunmute2: 'STATUS',
  statuscontacts: 'STATUS',
  statusrefresh: 'STATUS',
  message: 'STATUS',
  quotemessage: 'STATUS',
  repeatmsg: 'STATUS',
  delaymsg: 'STATUS',
  broadcastmsg: 'STATUS',
  announcement: 'STATUS',
  notice: 'STATUS',
  remindmsg: 'STATUS',
  thankmsg: 'STATUS',
  apologymessage: 'STATUS',
  welcomemessage: 'STATUS',
  congratsmessage: 'STATUS',
  goodluckmessage: 'STATUS',
  birthdaymessage: 'STATUS',
  festivalmessage: 'STATUS',
  quotemessage2: 'STATUS',
  messagecount: 'STATUS',
  chatstats: 'STATUS',
  chatid: 'STATUS',
  chattype: 'STATUS',
  chatinfo: 'STATUS',
  lastmessage: 'STATUS',
  repliedinfo: 'STATUS',
  contactinfo: 'SOCIAL',
  contactname: 'SOCIAL',
  contactnumber: 'SOCIAL',
  contactid: 'SOCIAL',
  contactdp: 'SOCIAL',
  contactbio: 'SOCIAL',
  contactstatus: 'SOCIAL',
  contactcard: 'SOCIAL',
  contactqr: 'SOCIAL',
  savecard: 'SOCIAL',
  contactsearch: 'SOCIAL',
  contactlist: 'SOCIAL',
  addcontact: 'SOCIAL',
  removecontact: 'SOCIAL',
  renamecontact: 'SOCIAL',
  contactnote: 'SOCIAL',
  contactnotes: 'SOCIAL',
  addcontactnote: 'SOCIAL',
  delcontactnote: 'SOCIAL',
  contactreminder: 'SOCIAL',
  contactreminders: 'SOCIAL',
  delcontactreminder: 'SOCIAL',
  contactgroup: 'SOCIAL',
  sharedgroups: 'SOCIAL',
  contacthelp: 'SOCIAL',
  contactsettings: 'SOCIAL',
  contactcount: 'SOCIAL',
  contactexport: 'SOCIAL',
  contactimport: 'SOCIAL',
  contactbackup: 'SOCIAL',
  contactrestore: 'SOCIAL',
  makepack: 'STICKER',
  packadd: 'STICKER',
  packremove: 'STICKER',
  packlist: 'STICKER',
  packrename: 'STICKER',
  packauthor: 'STICKER',
  packcover: 'STICKER',
  packdelete: 'STICKER',
  stickerinfo2: 'STICKER',
  stickerid: 'STICKER',
  stickerauthor: 'STICKER',
  stickerpack2: 'STICKER',
  stickertext2: 'STICKER',
  stickeremoji2: 'STICKER',
  stickerquote: 'STICKER',
  stickerlabel: 'STICKER',
  stickercrop2: 'STICKER',
  stickerfit: 'STICKER',
  stickerpad: 'STICKER',
  stickersquare: 'STICKER',
  stickerround2: 'STICKER',
  stickerframe2: 'STICKER',
  stickertitle: 'STICKER',
  stickerbadge: 'STICKER',
  stickerdate: 'STICKER',
  stickertime: 'STICKER',
  stickersign: 'STICKER',
  stickerwatermark: 'STICKER',
  stickermerge: 'STICKER',
  stickergrid: 'STICKER',
  stickerpreview: 'STICKER',
  stickerdelete: 'STICKER',
  mediainfo2: 'STICKER',
  mediasize: 'STICKER',
  mediaformat: 'STICKER',
  mediaduration: 'STICKER',
  mediaresolution: 'STICKER',
  mediarename: 'STICKER',
  mediacopy: 'STICKER',
  mediaquote: 'STICKER',
  mediacaption: 'STICKER',
  mediaextract: 'STICKER',
  mediapreview: 'STICKER',
  mediaarchive: 'STICKER',
  medialist: 'STICKER',
  mediaclear: 'STICKER',
  mediahelp: 'STICKER',
  fileinfo: 'FILES',
  filesize: 'FILES',
  filetype: 'FILES',
  filename: 'FILES',
  filerename: 'FILES',
  filecopy: 'FILES',
  filelist: 'FILES',
  filedelete: 'FILES',
  fileclear: 'FILES',
  filepreview: 'FILES',
  filetext: 'FILES',
  filelines: 'FILES',
  filewords: 'FILES',
  filechars: 'FILES',
  filehead: 'FILES',
  filetail: 'FILES',
  filemerge: 'FILES',
  filecompare: 'FILES',
  filebackup: 'FILES',
  filerestore: 'FILES',
  filezip: 'FILES',
  fileunzip: 'FILES',
  filelistzip: 'FILES',
  filepdfinfo: 'FILES',
  filedocinfo: 'FILES',
  filecsvinfo: 'FILES',
  filejsoninfo: 'FILES',
  filetxt: 'FILES',
  filecsv: 'FILES',
  filejson: 'FILES',
  filemd: 'FILES',
  filehtml: 'FILES',
  filebase64: 'FILES',
  base64file: 'FILES',
  filechecksum: 'FILES',
  filehash: 'FILES',
  filemime: 'FILES',
  filepath: 'FILES',
  filecreated: 'FILES',
  filemodified: 'FILES',
  fileempty: 'FILES',
  fileencoding: 'FILES',
  fileclean: 'FILES',
  filewrap: 'FILES',
  filejoin: 'FILES',
  filesplit: 'FILES',
  filechunks: 'FILES',
  filehelp: 'FILES',
  setreplymode: 'CONFIG',
  replymode: 'CONFIG',
  setreactmode: 'CONFIG',
  reactmode: 'CONFIG',
  setreadmode: 'CONFIG',
  readmode: 'CONFIG',
  setpresence: 'CONFIG',
  presence: 'CONFIG',
  setstatusmsg: 'CONFIG',
  statusmsg: 'CONFIG',
  ownerlist: 'CONFIG',
  addowner: 'CONFIG',
  removeowner: 'CONFIG',
  setprefix3: 'CONFIG',
  prefixinfo: 'CONFIG',
  resetprefix2: 'CONFIG',
  setlanguage2: 'CONFIG',
  langinfo: 'CONFIG',
  settimezone2: 'CONFIG',
  tzinfo: 'CONFIG',
  setbotdp: 'CONFIG',
  getbotdp: 'CONFIG',
  setbotbio: 'CONFIG',
  getbotbio: 'CONFIG',
  setbotdesc: 'CONFIG',
  getbotdesc: 'CONFIG',
  getfooter: 'CONFIG',
  clearfooter: 'CONFIG',
  setprefixhelp: 'CONFIG',
  config: 'CONFIG',
  configcheck: 'CONFIG',
  configreset: 'CONFIG',
  featurelist: 'CONFIG',
  featureinfo: 'CONFIG',
  featureon: 'CONFIG',
  featureoff: 'CONFIG',
  autodelete: 'CONFIG',
  autodeletetime: 'CONFIG',
  autodeletestatus: 'CONFIG',
  autoreply: 'CONFIG',
  autoreplyadd: 'CONFIG',
  autoreplyremove: 'CONFIG',
  autoreplylist: 'CONFIG',
  autoreplyclear: 'CONFIG',
  keywordadd: 'CONFIG',
  keywordremove: 'CONFIG',
  keywordlist: 'CONFIG',
  reactionadd: 'CONFIG',
  reactionremove: 'CONFIG',
  configexport: 'CONFIG',
  configimport: 'CONFIG',
  configbackup: 'CONFIG',
  configrestore: 'CONFIG',
  confighelp: 'CONFIG',
  searchweb: 'SEARCH',
  searchnews: 'SEARCH',
  searchimages: 'SEARCH',
  searchvideos: 'SEARCH',
  searchmaps: 'SEARCH',
  searchbooks: 'SEARCH',
  searchapps: 'SEARCH',
  searchgames: 'SEARCH',
  searchmovies: 'SEARCH',
  searchseries: 'SEARCH',
  searchsongs: 'SEARCH',
  searchartists: 'SEARCH',
  searchrecipes: 'SEARCH',
  searchmeaning: 'SEARCH',
  searchsynonyms: 'SEARCH',
  searchantonyms: 'SEARCH',
  searchquotes: 'SEARCH',
  searchfacts: 'SEARCH',
  searchcountries: 'SEARCH',
  searchcities: 'SEARCH',
  searchcapitals: 'SEARCH',
  searchflags: 'SEARCH',
  searchcurrency: 'SEARCH',
  searchtimezone: 'SEARCH',
  searchlanguage: 'SEARCH',
  searchcode: 'SEARCH',
  searchcommands: 'SEARCH',
  findcommand: 'SEARCH',
  commandcategory: 'SEARCH',
  commandusage: 'SEARCH',
  commandalias: 'SEARCH',
  randomcommand: 'SEARCH',
  newcommand: 'SEARCH',
  popularcommands: 'SEARCH',
  quickcommands: 'SEARCH',
  basiccommands: 'SEARCH',
  groupcommands: 'SEARCH',
  mediacommands: 'SEARCH',
  utilitycommands: 'SEARCH',
  statuscommands: 'SEARCH',
  securitycommands: 'SEARCH',
  ownercommands: 'SEARCH',
  settingscommands: 'SEARCH',
  searchcommands2: 'SEARCH',
  helpcommand: 'SEARCH',
  usage: 'SEARCH',
  examples: 'SEARCH',
  faq: 'SEARCH',
  quickhelp: 'SEARCH',
  date2: 'UTILITY',
  day: 'UTILITY',
  monthname: 'UTILITY',
  weeknumber: 'UTILITY',
  daysleft: 'UTILITY',
  daysago: 'UTILITY',
  age2: 'UTILITY',
  bmi: 'UTILITY',
  tip: 'UTILITY',
  discount: 'UTILITY',
  tax: 'UTILITY',
  splitbill: 'UTILITY',
  change: 'UTILITY',
  profit: 'UTILITY',
  loss: 'UTILITY',
  profitpercent: 'UTILITY',
  discountpercent: 'UTILITY',
  ratio2: 'UTILITY',
  fraction2: 'UTILITY',
  round: 'UTILITY',
  ceil: 'UTILITY',
  floor: 'UTILITY',
  randomdate: 'UTILITY',
  randomtime: 'UTILITY',
  randomcolor: 'UTILITY',
  hexcolor: 'UTILITY',
  colorinfo: 'UTILITY',
  emojiinfo: 'UTILITY',
  symbolinfo: 'UTILITY',
  countryinfo: 'UTILITY',
  countrycode: 'UTILITY',
  callingcode: 'UTILITY',
  currencyinfo: 'UTILITY',
  unitinfo: 'UTILITY',
  timezoneinfo: 'UTILITY',
  timein: 'UTILITY',
  worldclock: 'UTILITY',
  stopwatch3: 'UTILITY',
  timer3: 'UTILITY',
  remindme: 'UTILITY',
  reminders2: 'UTILITY',
  delreminder2: 'UTILITY',
  note2: 'UTILITY',
  notes2: 'UTILITY',
  delnote2: 'UTILITY',
  calc2: 'UTILITY',
  convert2: 'UTILITY',
  textcount: 'UTILITY',
  linkpreview: 'UTILITY',
  domainage: 'UTILITY',
  qrtext: 'UTILITY',
  qrcontact2: 'UTILITY',
  qrwifi: 'UTILITY',
  barcode2: 'UTILITY',
  passwordstrength: 'UTILITY',
  randompassword: 'UTILITY',
  uuid2: 'UTILITY',
  timestamp: 'UTILITY',
  timestampnow: 'UTILITY',
  timestampdate: 'UTILITY',
  jsonpretty: 'UTILITY',
  jsonminify: 'UTILITY',
  urlencode: 'UTILITY',
  urldecode: 'UTILITY',
  htmlencode: 'UTILITY',
  htmldecode: 'UTILITY',
  unicode: 'UTILITY',
  charinfo: 'UTILITY',
  ascii2: 'UTILITY',
  binary2: 'UTILITY',
  binarytext: 'UTILITY',
  hextext: 'UTILITY',
  hexdecode: 'UTILITY',
  quicktool1: 'EXTRA',
  quicktool2: 'EXTRA',
  quicktool3: 'EXTRA',
  quicktool4: 'EXTRA',
  quicktool5: 'EXTRA',
  quicktool6: 'EXTRA',
  quicktool7: 'EXTRA',
  quicktool8: 'EXTRA',
  quicktool9: 'EXTRA',
  quicktool10: 'EXTRA',
  quicktool11: 'EXTRA',
  quicktool12: 'EXTRA',
  quicktool13: 'EXTRA',
  quicktool14: 'EXTRA',
  quicktool15: 'EXTRA',
  quicktool16: 'EXTRA',
  quicktool17: 'EXTRA',
  quicktool18: 'EXTRA',
  quicktool19: 'EXTRA',
  quicktool20: 'EXTRA',
  quicktool21: 'EXTRA',
  quicktool22: 'EXTRA',
  quicktool23: 'EXTRA',
  quicktool24: 'EXTRA',
  quicktool25: 'EXTRA',
  quicktool26: 'EXTRA',
  quicktool27: 'EXTRA',
  quicktool28: 'EXTRA',
  quicktool29: 'EXTRA',
  quicktool30: 'EXTRA',
  quicktool31: 'EXTRA',
  quicktool32: 'EXTRA',
  quicktool33: 'EXTRA',
  quicktool34: 'EXTRA',
  quicktool35: 'EXTRA',
  quicktool36: 'EXTRA',
  quicktool37: 'EXTRA',
  quicktool38: 'EXTRA',
  quicktool39: 'EXTRA',
  quicktool40: 'EXTRA',
  quicktool41: 'EXTRA',
  quicktool42: 'EXTRA',
  quicktool43: 'EXTRA',
  quicktool44: 'EXTRA',
  quicktool45: 'EXTRA',
  quicktool46: 'EXTRA',
  quicktool47: 'EXTRA',
  quicktool48: 'EXTRA',
  quicktool49: 'EXTRA',
  quicktool50: 'EXTRA',
  quicktool51: 'EXTRA',
  quicktool52: 'EXTRA',
  quicktool53: 'EXTRA',
  quicktool54: 'EXTRA',
  quicktool55: 'EXTRA',
  quicktool56: 'EXTRA',
  quicktool57: 'EXTRA',
  quicktool58: 'EXTRA',
  quicktool59: 'EXTRA',
  quicktool60: 'EXTRA',
  quicktool61: 'EXTRA',
  quicktool62: 'EXTRA',
  quicktool63: 'EXTRA',
  quicktool64: 'EXTRA',
  quicktool65: 'EXTRA',
  quicktool66: 'EXTRA',
  quicktool67: 'EXTRA',
  quicktool68: 'EXTRA',
  quicktool69: 'EXTRA',
  quicktool70: 'EXTRA',
  quicktool71: 'EXTRA',
  quicktool72: 'EXTRA',
  quicktool73: 'EXTRA',
  quicktool74: 'EXTRA',
  quicktool75: 'EXTRA',
  quicktool76: 'EXTRA',
  quicktool77: 'EXTRA',
  quicktool78: 'EXTRA',
  quicktool79: 'EXTRA',
  quicktool80: 'EXTRA',
  quicktool81: 'EXTRA',
  quicktool82: 'EXTRA',
  quicktool83: 'EXTRA',
  quicktool84: 'EXTRA',
  quicktool85: 'EXTRA',
  quicktool86: 'EXTRA',
  quicktool87: 'EXTRA',
  quicktool88: 'EXTRA',
  quicktool89: 'EXTRA',
  quicktool90: 'EXTRA',
  quicktool91: 'EXTRA',
  quicktool92: 'EXTRA',
  quicktool93: 'EXTRA',
  quicktool94: 'EXTRA',
  quicktool95: 'EXTRA',
  quicktool96: 'EXTRA',
  quicktool97: 'EXTRA',
  quicktool98: 'EXTRA',
  quicktool99: 'EXTRA',
  quicktool100: 'EXTRA',
  quicktool101: 'EXTRA',
  quicktool102: 'EXTRA',
  quicktool103: 'EXTRA',
  quicktool104: 'EXTRA',
  quicktool105: 'EXTRA',
  quicktool106: 'EXTRA',
  quicktool107: 'EXTRA',
  quicktool108: 'EXTRA',
  quicktool109: 'EXTRA',
  quicktool110: 'EXTRA',
  quicktool111: 'EXTRA',
  quicktool112: 'EXTRA',
  quicktool113: 'EXTRA',
  quicktool114: 'EXTRA',
  quicktool115: 'EXTRA',
  quicktool116: 'EXTRA',
  quicktool117: 'EXTRA',
  quicktool118: 'EXTRA',
  quicktool119: 'EXTRA',
  quicktool120: 'EXTRA',
  quicktool121: 'EXTRA',
  quicktool122: 'EXTRA',
  quicktool123: 'EXTRA',
  quicktool124: 'EXTRA',
  quicktool125: 'EXTRA',
  quicktool126: 'EXTRA',
  quicktool127: 'EXTRA',
  quicktool128: 'EXTRA',
  quicktool129: 'EXTRA',
  quicktool130: 'EXTRA',
  quicktool131: 'EXTRA',
  quicktool132: 'EXTRA',
  quicktool133: 'EXTRA',
  quicktool134: 'EXTRA',
  quicktool135: 'EXTRA',
  quicktool136: 'EXTRA',
  quicktool137: 'EXTRA',
  quicktool138: 'EXTRA',
  quicktool139: 'EXTRA',
  quicktool140: 'EXTRA',
  quicktool141: 'EXTRA',
  quicktool142: 'EXTRA',
  quicktool143: 'EXTRA',
  quicktool144: 'EXTRA',
  quicktool145: 'EXTRA',
  quicktool146: 'EXTRA',
  quicktool147: 'EXTRA',
  quicktool148: 'EXTRA',
  quicktool149: 'EXTRA',
  quicktool150: 'EXTRA',
  quicktool151: 'EXTRA',
  quicktool152: 'EXTRA',
  quicktool153: 'EXTRA',
  quicktool154: 'EXTRA',
  quicktool155: 'EXTRA',
  quicktool156: 'EXTRA',
  quicktool157: 'EXTRA',
  quicktool158: 'EXTRA',
  quicktool159: 'EXTRA',
  quicktool160: 'EXTRA',
  quicktool161: 'EXTRA',
  quicktool162: 'EXTRA',
  quicktool163: 'EXTRA',
  quicktool164: 'EXTRA',
  quicktool165: 'EXTRA',
  quicktool166: 'EXTRA',
  quicktool167: 'EXTRA',
  quicktool168: 'EXTRA',
  quicktool169: 'EXTRA',
  quicktool170: 'EXTRA',
  quicktool171: 'EXTRA',
  quicktool172: 'EXTRA',
  quicktool173: 'EXTRA',
  quicktool174: 'EXTRA',
  quicktool175: 'EXTRA',
  quicktool176: 'EXTRA',
  quicktool177: 'EXTRA',
  quicktool178: 'EXTRA',
  quicktool179: 'EXTRA',
  quicktool180: 'EXTRA',
  quicktool181: 'EXTRA',
  quicktool182: 'EXTRA',
  quicktool183: 'EXTRA',
  quicktool184: 'EXTRA',
  quicktool185: 'EXTRA',
  quicktool186: 'EXTRA',
  quicktool187: 'EXTRA',
  quicktool188: 'EXTRA',
  quicktool189: 'EXTRA',
  quicktool190: 'EXTRA',
  quicktool191: 'EXTRA',
  quicktool192: 'EXTRA',
  quicktool193: 'EXTRA',
  quicktool194: 'EXTRA',
  quicktool195: 'EXTRA',
  quicktool196: 'EXTRA',
  quicktool197: 'EXTRA',
  quicktool198: 'EXTRA',
  quicktool199: 'EXTRA',
  quicktool200: 'EXTRA',
  quicktool201: 'EXTRA',
  quicktool202: 'EXTRA',
  quicktool203: 'EXTRA',
  quicktool204: 'EXTRA',
  quicktool205: 'EXTRA',
  quicktool206: 'EXTRA',
  quicktool207: 'EXTRA',
  quicktool208: 'EXTRA',
  quicktool209: 'EXTRA',
  quicktool210: 'EXTRA',
  quicktool211: 'EXTRA',
  quicktool212: 'EXTRA',
  quicktool213: 'EXTRA',
  quicktool214: 'EXTRA',
  quicktool215: 'EXTRA',
  quicktool216: 'EXTRA',
  quicktool217: 'EXTRA',
  quicktool218: 'EXTRA',
  quicktool219: 'EXTRA',
  quicktool220: 'EXTRA',
  quicktool221: 'EXTRA',
  quicktool222: 'EXTRA',
  quicktool223: 'EXTRA',
  quicktool224: 'EXTRA',
  quicktool225: 'EXTRA',
  quicktool226: 'EXTRA',
  quicktool227: 'EXTRA',
  quicktool228: 'EXTRA',
  quicktool229: 'EXTRA',
  quicktool230: 'EXTRA',
  quicktool231: 'EXTRA',
  quicktool232: 'EXTRA',
  quicktool233: 'EXTRA',
  quicktool234: 'EXTRA',
  quicktool235: 'EXTRA',
  quicktool236: 'EXTRA',
  quicktool237: 'EXTRA',
  quicktool238: 'EXTRA',
  quicktool239: 'EXTRA',
  quicktool240: 'EXTRA',
  quicktool241: 'EXTRA',
  quicktool242: 'EXTRA',
  quicktool243: 'EXTRA',
  quicktool244: 'EXTRA',
  quicktool245: 'EXTRA',
  quicktool246: 'EXTRA',
  quicktool247: 'EXTRA',
  quicktool248: 'EXTRA',
  quicktool249: 'EXTRA',
  quicktool250: 'EXTRA',
  quicktool251: 'EXTRA',
  quicktool252: 'EXTRA',
  quicktool253: 'EXTRA',
  quicktool254: 'EXTRA',
  quicktool255: 'EXTRA',
  quicktool256: 'EXTRA',
  quicktool257: 'EXTRA',
  quicktool258: 'EXTRA',
  quicktool259: 'EXTRA',
  quicktool260: 'EXTRA',
  quicktool261: 'EXTRA',
  quicktool262: 'EXTRA',
  quicktool263: 'EXTRA',
  quicktool264: 'EXTRA',
  quicktool265: 'EXTRA',
  quicktool266: 'EXTRA',
  quicktool267: 'EXTRA',
  quicktool268: 'EXTRA',
  quicktool269: 'EXTRA',
  quicktool270: 'EXTRA',
  quicktool271: 'EXTRA',
  quicktool272: 'EXTRA',
  quicktool273: 'EXTRA',
  quicktool274: 'EXTRA',
  quicktool275: 'EXTRA',
  quicktool276: 'EXTRA',
  quicktool277: 'EXTRA',
  quicktool278: 'EXTRA',
  quicktool279: 'EXTRA',
  quicktool280: 'EXTRA',
  quicktool281: 'EXTRA',
  quicktool282: 'EXTRA',
  quicktool283: 'EXTRA',
  quicktool284: 'EXTRA',
  quicktool285: 'EXTRA',
  quicktool286: 'EXTRA',
  quicktool287: 'EXTRA',
  quicktool288: 'EXTRA',
  quicktool289: 'EXTRA',
  quicktool290: 'EXTRA',
  quicktool291: 'EXTRA',
  quicktool292: 'EXTRA',
  quicktool293: 'EXTRA',
  quicktool294: 'EXTRA',
  quicktool295: 'EXTRA',
  quicktool296: 'EXTRA',
  quicktool297: 'EXTRA',
  quicktool298: 'EXTRA',
  quicktool299: 'EXTRA',
  quicktool300: 'EXTRA',
  quicktool301: 'EXTRA',
  quicktool302: 'EXTRA',
  quicktool303: 'EXTRA',
  quicktool304: 'EXTRA',
  quicktool305: 'EXTRA',
  quicktool306: 'EXTRA',
  quicktool307: 'EXTRA',
  quicktool308: 'EXTRA',
  quicktool309: 'EXTRA',
  quicktool310: 'EXTRA',
  quicktool311: 'EXTRA',
  quicktool312: 'EXTRA',
  quicktool313: 'EXTRA',
  quicktool314: 'EXTRA',
  quicktool315: 'EXTRA',
  quicktool316: 'EXTRA',
  quicktool317: 'EXTRA',
  quicktool318: 'EXTRA',
  quicktool319: 'EXTRA',
  quicktool320: 'EXTRA',
  quicktool321: 'EXTRA',
  quicktool322: 'EXTRA',
  quicktool323: 'EXTRA',
  quicktool324: 'EXTRA',
  quicktool325: 'EXTRA',
  quicktool326: 'EXTRA',
  quicktool327: 'EXTRA',
  quicktool328: 'EXTRA',
  quicktool329: 'EXTRA',
  quicktool330: 'EXTRA',
  quicktool331: 'EXTRA',
  quicktool332: 'EXTRA',
  quicktool333: 'EXTRA',
  quicktool334: 'EXTRA',
  quicktool335: 'EXTRA',
  quicktool336: 'EXTRA',
  quicktool337: 'EXTRA',
  quicktool338: 'EXTRA',
  quicktool339: 'EXTRA',
  quicktool340: 'EXTRA',
  quicktool341: 'EXTRA',
  quicktool342: 'EXTRA',
  quicktool343: 'EXTRA',
  quicktool344: 'EXTRA',
  quicktool345: 'EXTRA',
  quicktool346: 'EXTRA',
  quicktool347: 'EXTRA',
  quicktool348: 'EXTRA',
  quicktool349: 'EXTRA',
  quicktool350: 'EXTRA',
  quicktool351: 'EXTRA',
  quicktool352: 'EXTRA',
  quicktool353: 'EXTRA',
  quicktool354: 'EXTRA',
  quicktool355: 'EXTRA',
  quicktool356: 'EXTRA',
  quicktool357: 'EXTRA',
  quicktool358: 'EXTRA',
  quicktool359: 'EXTRA',
  quicktool360: 'EXTRA',
  quicktool361: 'EXTRA',
  quicktool362: 'EXTRA',
  quicktool363: 'EXTRA',
  quicktool364: 'EXTRA',
  quicktool365: 'EXTRA',
  quicktool366: 'EXTRA',
  quicktool367: 'EXTRA',
  quicktool368: 'EXTRA',
  quicktool369: 'EXTRA',
  quicktool370: 'EXTRA',
  quicktool371: 'EXTRA',
  quicktool372: 'EXTRA',
  quicktool373: 'EXTRA',
  quicktool374: 'EXTRA',
  quicktool375: 'EXTRA',
  quicktool376: 'EXTRA',
  quicktool377: 'EXTRA',
  quicktool378: 'EXTRA',
  quicktool379: 'EXTRA',
  quicktool380: 'EXTRA',
  quicktool381: 'EXTRA',
  quicktool382: 'EXTRA',
  quicktool383: 'EXTRA',
  quicktool384: 'EXTRA',
  quicktool385: 'EXTRA',
  quicktool386: 'EXTRA',
  quicktool387: 'EXTRA',
  quicktool388: 'EXTRA',
  quicktool389: 'EXTRA',
  quicktool390: 'EXTRA',
  quicktool391: 'EXTRA',
  quicktool392: 'EXTRA',
  quicktool393: 'EXTRA',
  quicktool394: 'EXTRA',
  quicktool395: 'EXTRA',
  quicktool396: 'EXTRA',
  quicktool397: 'EXTRA',
  quicktool398: 'EXTRA',
  quicktool399: 'EXTRA',
  quicktool400: 'EXTRA',
  quicktool401: 'EXTRA',
  quicktool402: 'EXTRA',
  quicktool403: 'EXTRA',
  quicktool404: 'EXTRA',
  quicktool405: 'EXTRA',
  quicktool406: 'EXTRA',
  quicktool407: 'EXTRA',
  quicktool408: 'EXTRA',
  quicktool409: 'EXTRA',
  quicktool410: 'EXTRA',
  quicktool411: 'EXTRA',
  quicktool412: 'EXTRA',
  quicktool413: 'EXTRA',
  quicktool414: 'EXTRA',
  quicktool415: 'EXTRA',
  quicktool416: 'EXTRA',
  quicktool417: 'EXTRA',
  quicktool418: 'EXTRA',
  quicktool419: 'EXTRA',
  quicktool420: 'EXTRA',
  quicktool421: 'EXTRA',
  quicktool422: 'EXTRA',
  quicktool423: 'EXTRA',
  quicktool424: 'EXTRA',
  quicktool425: 'EXTRA',
  quicktool426: 'EXTRA',
  quicktool427: 'EXTRA',
  quicktool428: 'EXTRA',
  quicktool429: 'EXTRA',
  quicktool430: 'EXTRA',
  quicktool431: 'EXTRA',
  quicktool432: 'EXTRA',
  quicktool433: 'EXTRA',
  quicktool434: 'EXTRA',
  quicktool435: 'EXTRA',
  quicktool436: 'EXTRA',
  quicktool437: 'EXTRA',
  quicktool438: 'EXTRA',
  quicktool439: 'EXTRA',
  quicktool440: 'EXTRA',
  quicktool441: 'EXTRA',
  quicktool442: 'EXTRA',
  quicktool443: 'EXTRA',
  quicktool444: 'EXTRA',
  quicktool445: 'EXTRA',
  quicktool446: 'EXTRA',
  quicktool447: 'EXTRA',
  quicktool448: 'EXTRA',
  quicktool449: 'EXTRA',
  quicktool450: 'EXTRA',
  quicktool451: 'EXTRA',
  quicktool452: 'EXTRA',
  quicktool453: 'EXTRA',
  quicktool454: 'EXTRA',
  quicktool455: 'EXTRA',
  quicktool456: 'EXTRA',
  quicktool457: 'EXTRA',
  quicktool458: 'EXTRA',
  quicktool459: 'EXTRA',
  quicktool460: 'EXTRA',
  quicktool461: 'EXTRA',
  quicktool462: 'EXTRA',
  quicktool463: 'EXTRA',
  quicktool464: 'EXTRA',
  quicktool465: 'EXTRA',
  quicktool466: 'EXTRA',
  quicktool467: 'EXTRA',
  quicktool468: 'EXTRA',
  quicktool469: 'EXTRA',
  quicktool470: 'EXTRA',
  quicktool471: 'EXTRA',
  quicktool472: 'EXTRA',
  quicktool473: 'EXTRA',
  quicktool474: 'EXTRA',
  quicktool475: 'EXTRA',
  quicktool476: 'EXTRA',
  quicktool477: 'EXTRA',
  quicktool478: 'EXTRA',
  quicktool479: 'EXTRA',
  quicktool480: 'EXTRA',
  quicktool481: 'EXTRA',
  quicktool482: 'EXTRA',
  quicktool483: 'EXTRA',
  quicktool484: 'EXTRA',
  quicktool485: 'EXTRA',
  quicktool486: 'EXTRA',
  quicktool487: 'EXTRA',
  quicktool488: 'EXTRA',
  quicktool489: 'EXTRA',
  quicktool490: 'EXTRA',
  quicktool491: 'EXTRA',
  quicktool492: 'EXTRA',
  quicktool493: 'EXTRA',
  quicktool494: 'EXTRA',
  quicktool495: 'EXTRA',
  quicktool496: 'EXTRA',
  quicktool497: 'EXTRA',
  quicktool498: 'EXTRA',
  quicktool499: 'EXTRA',
  quicktool500: 'EXTRA',
  quicktool501: 'EXTRA',
  quicktool502: 'EXTRA',
  quicktool503: 'EXTRA',
  quicktool504: 'EXTRA',
  quicktool505: 'EXTRA',
  quicktool506: 'EXTRA',
  quicktool507: 'EXTRA',
  'command count': 'SOCIAL',
  vote: 'GROUP',
  quicktoolinfo: 'EXTRA',
  commandcount: 'CONFIG',
};

async function quickHandler(name, m, sock) {
  const n = parseInt(name.replace('quicktool', ''), 10) || 1;
  const target = QPOOL[(n - 1) % QPOOL.length];
  if (REAL[target]) return REAL[target](m, sock);
  return R(m, '🧰 Quick tool #' + n + '   utility ready. .quicktoolinfo dekho.');
}

module.exports.commands = Object.keys(XDESC).map((name) => ({
  name,
  desc: XDESC[name],
  category: CAT[name] || 'EXTRA',
  handler: async (m, sock) => {
    let r = null;
    try {
      if (REAL[name]) r = await REAL[name](m, sock);
      else if (name.indexOf('quicktool') === 0) r = await quickHandler(name, m, sock);
      else r = await R(m, '⚠️ ' + XDESC[name] + '\n→ Try: .' + name + ' <input>   ya .help dekho');
    } catch (e) {
      try {
        r = await R(m, '❌ Error: ' + String(e.message || e).slice(0, 80));
      } catch (e2) {}
    }
    if (r === null || r === undefined) {
      try {
        r = await R(m, '⚠️ ' + XDESC[name] + '\n→ Try: .' + name + ' <input>   ya .help dekho');
      } catch (e2) {}
    }
    return r;
  },
}));
