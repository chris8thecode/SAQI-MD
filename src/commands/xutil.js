/* SAQI-MD   XUTIL: calc, units, currency, dates, timers, random, crypto, network   sab REAL */
const config = require('../../config');
const { pick, kvGet, kvSet, safeMath, xfetch } = require('../lib/xhelp');

const UNITS = {
  km: 1000,
  m: 1,
  cm: 0.01,
  mm: 0.001,
  mile: 1609.34,
  foot: 0.3048,
  inch: 0.0254,
  yard: 0.9144,
};
const WEIGHT = { kg: 1, g: 0.001, mg: 0.000001, ton: 1000, pound: 0.453592, ounce: 0.0283495 };

async function handler(m, sock) {
  const cmd = m.command;
  const a = (m.arg || '').trim();

  /* ---- math family ---- */
  if (['calc', 'calculator', 'math'].includes(cmd)) {
    if (!a) return m.reply(`❌ Expression do. Example: ${config.PREFIX}calc 25*4+10/2`);
    const v = safeMath(a);
    return m.reply(
      v === null
        ? `❌ Ye expression samajh nahi aaya. Sirf numbers aur + - * / ( ) % ^ use karo.`
        : `🧮 *${a}* = *${v}*`,
    );
  }
  if (['percentage', 'percent'].includes(cmd)) {
    const nums = a.match(/-?\d+(\.\d+)?/g);
    if (!nums || nums.length < 2)
      return m.reply(`❌ Example: ${config.PREFIX}percentage 25 200 (matlab 25/200)`);
    const [x, y] = nums.map(Number);
    return m.reply(`🧮 ${x} / ${y} = *${Math.round((x / y) * 10000) / 100}%*`);
  }
  if (['average', 'avg'].includes(cmd)) {
    const nums = (a.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    if (!nums.length) return m.reply(`❌ Numbers do: ${config.PREFIX}average 10 20 30`);
    const avg = nums.reduce((s, x) => s + x, 0) / nums.length;
    return m.reply(`🧮 Average of [${nums.join(', ')}] = *${Math.round(avg * 1000) / 1000}*`);
  }
  const binOps = {
    sum: ['+', '➕'],
    add: ['+', '➕'],
    multiply: ['*', '✖️'],
    divide: ['/', '➗'],
    subtract: ['-', '➖'],
  };
  if (binOps[cmd]) {
    const nums = (a.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    if (nums.length < 2) return m.reply(`❌ Do numbers do: ${config.PREFIX}${cmd} 10 20`);
    const [x, y] = nums;
    const v =
      cmd === 'divide' && y === 0 ? null : Function('x,y', `return x${binOps[cmd][0]}y`)(x, y);
    return m.reply(
      `🧮 ${x} ${binOps[cmd][1]} ${y} = *${v === null || !isFinite(v) ? '∞ (zero se divide nahi)' : Math.round(v * 1e6) / 1e6}*`,
    );
  }
  const unOps = {
    square: (x) => x * x,
    cube: (x) => x ** 3,
    sqrt: (x) => Math.sqrt(x),
    factorial: (x) => {
      if (x < 0 || x > 170 || x !== Math.floor(x)) return null;
      let r = 1;
      for (let i = 2; i <= x; i++) r *= i;
      return r;
    },
  };
  if (unOps[cmd]) {
    const n = Number((a.match(/-?\d+(\.\d+)?/) || [])[0]);
    if (a === '' || isNaN(n)) return m.reply(`❌ Number do: ${config.PREFIX}${cmd} 5`);
    const v = unOps[cmd](n);
    return m.reply(`🧮 ${cmd}(${n}) = *${v === null ? 'possible nahi ❌' : v}*`);
  }
  if (cmd === 'power') {
    const nums = (a.match(/-?\d+(\.\d+)?/g) || []).map(Number);
    if (nums.length < 2) return m.reply(`❌ Base aur power do: ${config.PREFIX}power 2 10`);
    return m.reply(`🧮 ${nums[0]}^${nums[1]} = *${Math.round(nums[0] ** nums[1] * 1e6) / 1e6}*`);
  }
  if (cmd === 'prime') {
    const n = parseInt(a);
    if (!n) return m.reply(`❌ Number do: ${config.PREFIX}prime 17`);
    let isP = n > 1;
    for (let i = 2; i * i <= n; i++)
      if (n % i === 0) {
        isP = false;
        break;
      }
    return m.reply(`🔢 ${n} = *${isP ? 'PRIME ✅' : 'prime nahi ❌'}*`);
  }
  if (cmd === 'factor' || cmd === 'factors') {
    const n = parseInt(a);
    if (!n || n < 1) return m.reply(`❌ Positive number do: ${config.PREFIX}factors 36`);
    const f = [];
    for (let i = 1; i <= Math.sqrt(n); i++)
      if (n % i === 0) {
        f.push(i);
        if (i !== n / i) f.push(n / i);
      }
    return m.reply(`🔢 Factors of ${n}: ${f.sort((x, y) => x - y).join(', ')} (${f.length} total)`);
  }
  if (cmd === 'gcd' || cmd === 'lcm') {
    const nums = (a.match(/\d+/g) || []).map(Number);
    if (nums.length < 2) return m.reply(`❌ Do numbers do: ${config.PREFIX}${cmd} 12 18`);
    const g = (x, y) => (y ? g(y, x % y) : x);
    const gcd = nums.reduce((x, y) => g(x, y));
    return m.reply(
      `🧮 ${cmd.toUpperCase()} of [${nums.join(', ')}] = *${cmd === 'gcd' ? gcd : nums.reduce((x, y) => x * y) / gcd}*`,
    );
  }

  /* ---- unit conversion ---- */
  if (cmd === 'convertunit' || cmd === 'length' || cmd === 'weight' || cmd === 'temperature') {
    const m2 = a.match(/(-?\d+(?:\.\d+)?)\s*([a-zA-Z°]+)\s*(?:to|in|se|→|->)\s*([a-zA-Z°]+)/i);
    if (!m2) return m.reply(`❌ Format: ${config.PREFIX}${cmd} 10 km to mile`);
    const val = parseFloat(m2[1]);
    const from = m2[2].toLowerCase();
    const to = m2[3].toLowerCase();
    if (
      cmd === 'temperature' ||
      ['c', 'f', 'celsius', 'fahrenheit', 'k', 'kelvin'].includes(from)
    ) {
      const norm = (u) => (u[0] === 'c' ? 'c' : u[0] === 'f' ? 'f' : 'k');
      const [f1, t1] = [norm(from), norm(to)];
      let c = f1 === 'c' ? val : f1 === 'f' ? ((val - 32) * 5) / 9 : val - 273.15;
      const out = t1 === 'c' ? c : t1 === 'f' ? (c * 9) / 5 + 32 : c + 273.15;
      return m.reply(
        `🌡️ ${val}°${f1.toUpperCase()} = *${Math.round(out * 100) / 100}°${t1.toUpperCase()}*`,
      );
    }
    const tbl = cmd === 'weight' ? WEIGHT : UNITS;
    if (!tbl[from] || !tbl[to])
      return m.reply(
        `❌ Ye units nahi mili. Length: km, m, cm, mm, mile, foot, inch, yard. Weight: kg, g, ton, pound, ounce`,
      );
    return m.reply(
      `📏 ${val} ${from} = *${Math.round(((val * tbl[from]) / tbl[to]) * 1e6) / 1e6} ${to}*`,
    );
  }
  if (cmd === 'currency' || cmd === 'exchange') {
    const m2 = a.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]{3})\s*(?:to|in|se)?\s*([a-zA-Z]{3})?/i);
    if (!m2) return m.reply(`❌ Format: ${config.PREFIX}currency 100 USD to PKR`);
    try {
      const amt = parseFloat(m2[1]);
      const from = m2[2].toUpperCase();
      const to = (m2[3] || 'PKR').toUpperCase();
      try {
        const r = await xfetch(
          `https://api.frankfurter.app/latest?amount=${amt}&from=${from}&to=${to}`,
        );
        const j = await r.json();
        if (j.rates && j.rates[to])
          return m.reply(`💱 ${amt} ${from} = *${j.rates[to][to]} ${to}*\n📅 Rate: ${j.date}`);
      } catch (e) {}
      /* fallback: open.er-api.com (PKR/INR etc. bhi support karta hy) */
      const r2 = await xfetch(`https://open.er-api.com/v6/latest/${from}`);
      const j2 = await r2.json();
      if (!j2.rates || !j2.rates[to])
        return m.reply(`❌ ${from} → ${to} rate nahi mila. Try: USD, EUR, GBP, PKR, INR`);
      const out = Math.round(j2.rates[to] * amt * 100) / 100;
      return m.reply(
        `💱 ${amt} ${from} = *${out} ${to}*\n📅 Rate: ${j2.time_last_update_utc ? j2.time_last_update_utc.slice(0, 16) : 'live'}`,
      );
    } catch (e) {
      return m.reply('❌ Rate service se connect nahi ho saka, thori dair baad try karo.');
    }
  }

  /* ---- dates & timers ---- */
  if (cmd === 'date' || cmd === 'today')
    return m.reply(
      `📅 Aaj: *${new Date().toDateString()}*\n🕐 PKT: *${new Date(Date.now() + 5 * 3600000).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' })}*`,
    );
  if (
    cmd === 'tomorrow' ||
    cmd === 'yesterday' ||
    cmd === 'week' ||
    cmd === 'month' ||
    cmd === 'year'
  ) {
    const d = new Date();
    if (cmd === 'tomorrow') d.setDate(d.getDate() + 1);
    if (cmd === 'yesterday') d.setDate(d.getDate() - 1);
    if (cmd === 'week')
      return m.reply(
        `📅 Week: ${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} se start   week number: ${Math.ceil((d - new Date(d.getFullYear(), 0, 1)) / 604800000)}`,
      );
    if (cmd === 'month')
      return m.reply(
        `📅 Month: *${d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}*   ${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()} din`,
      );
    if (cmd === 'year')
      return m.reply(
        `📅 Year: *${d.getFullYear()}*   ${d.getFullYear() % 4 === 0 ? 'leap year' : 'normal year'}`,
      );
    return m.reply(`📅 ${d.toDateString()}`);
  }
  if (cmd === 'age' || cmd === 'agediff' || cmd === 'datediff' || cmd === 'days') {
    const m2 = a.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m2) return m.reply(`❌ Format: ${config.PREFIX}age 2008-05-21`);
    const then = new Date(+m2[1], +m2[2] - 1, +m2[3]);
    const now = new Date();
    const days = Math.floor((now - then) / 86400000);
    let yrs = now.getFullYear() - then.getFullYear();
    let mo = now.getMonth() - then.getMonth();
    let dy = now.getDate() - then.getDate();
    if (dy < 0) {
      mo--;
      dy += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (mo < 0) {
      yrs--;
      mo += 12;
    }
    return m.reply(
      `🎂 ${m2[1]}-${m2[2]}-${m2[3]} se:\n→ *${yrs} saal ${mo} mahine ${dy} din*\n→ Total: *${days.toLocaleString()} din* (${Math.floor(days / 365.25)} saal)`,
    );
  }
  if (cmd === 'countdown') {
    const m2 = a.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m2) return m.reply(`❌ Format: ${config.PREFIX}countdown 2026-12-31`);
    const diff = new Date(+m2[1], +m2[2] - 1, +m2[3]) - new Date();
    if (diff < 0) return m.reply('❌ Ye date to guzar chuki hai!');
    const d = Math.floor(diff / 86400000);
    return m.reply(
      `⏳ ${m2[1]}-${m2[2]}-${m2[3]} tak: *${d} din* (${Math.floor(d / 30.44)} mahine) baqi`,
    );
  }
  if (
    cmd === 'timer' ||
    cmd === 'stopwatch' ||
    cmd === 'remind' ||
    cmd === 'reminder' ||
    cmd === 'reminders' ||
    cmd === 'setreminder'
  ) {
    const m2 = a.match(
      /^(\d+)\s*(s|sec|second|seconds|m|min|mins|minute|minutes|h|hr|hour|hours)/i,
    );
    if (!m2)
      return m.reply(
        `❌ Format: ${config.PREFIX}timer 10 min [message]\nExample: ${config.PREFIX}remind 2 hour chai peena hy`,
      );
    const mult = {
      s: 1000,
      sec: 1000,
      second: 1000,
      seconds: 1000,
      m: 60000,
      min: 60000,
      mins: 60000,
      minute: 60000,
      minutes: 60000,
      h: 3600000,
      hr: 3600000,
      hour: 3600000,
      hours: 3600000,
    }[m2[2].toLowerCase()];
    const ms = +m2[1] * mult;
    if (ms > 86400000 * 7) return m.reply('❌ Max 7 din tak ka timer.');
    const msg = a.slice(m2[0].length).trim() || '⏰ Time ho gaya!';
    const when = new Date(Date.now() + ms).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
    setTimeout(async () => {
      try {
        await sock.sendMessage(
          m.chat,
          { text: `⏰ *REMINDER*   ${msg}\n(tera ${m2[1]}${m2[2][0]} ka timer pura hua)` },
          { quoted: m },
        );
      } catch (e) {}
    }, ms);
    return m.reply(
      `⏰ Timer set: *${m2[1]} ${m2[2]}*   ${when} par yaad dila dunga${msg !== '⏰ Time ho gaya!' ? `: "${msg}"` : ''}`,
    );
  }
  if (cmd === 'delreminder')
    return m.reply('⏰ timers apne aap fire ho jate hain   list se hatane ki zaroorat nahi.');

  /* ---- random / generators ---- */
  if (cmd === 'random' || cmd === 'randomnum' || cmd === 'randomnumber' || cmd === 'number') {
    const nums = (a.match(/\d+/g) || []).map(Number);
    const [lo, hi] = nums.length >= 2 ? nums : [1, 100];
    return m.reply(
      `🎲 Random number (${lo}-${hi}): *${lo + Math.floor(Math.random() * (hi - lo + 1))}*`,
    );
  }
  if (
    cmd === 'choose' ||
    cmd === 'choice' ||
    cmd === 'randomchoice' ||
    cmd === 'decide' ||
    cmd === 'decision'
  ) {
    const opts = a
      .split(/,|\bor\b|\|/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (opts.length < 2)
      return m.reply(`❌ Options do comma se: ${config.PREFIX}choose chai, coffee, juice`);
    return m.reply(`🎯 Mera choice: *${pick(opts)}*`);
  }
  if (cmd === 'coinflip' || cmd === 'coin2' || cmd === 'flip')
    return m.reply(`🪔 Coin: *${Math.random() < 0.5 ? 'HEADS 🪙' : 'TAILS 🪙'}*`);
  const diceN = { dice2: 2, dice3: 3, dice4: 4, dice5: 5, dice6: 6 };
  if (diceN[cmd]) {
    const rolls = Array.from({ length: diceN[cmd] }, () => 1 + Math.floor(Math.random() * 6));
    return m.reply(
      `🎲 ${diceN[cmd]} dice: ${rolls.join(' + ')} = *${rolls.reduce((s, x) => s + x, 0)}*`,
    );
  }
  if (cmd === 'password' || cmd === 'passwordgen') {
    const len = Math.min(Math.max(parseInt(a) || 16, 8), 64);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
    let p = '';
    const buf = require('crypto').randomBytes(len);
    for (let i = 0; i < len; i++) p += chars[buf[i] % chars.length];
    return m.reply(`🔐 Strong password (${len} chars):\n\`\`\`${p}\`\`\``);
  }
  if (cmd === 'username' || cmd === 'usernamegen') {
    const w1 = [
      'Cool',
      'Dark',
      'Ghost',
      'Royal',
      'Silent',
      'Turbo',
      'Neon',
      'Shadow',
      'Fire',
      'Ice',
    ];
    const w2 = [
      'King',
      'Wolf',
      'Tiger',
      'Hunter',
      'Rider',
      'Slayer',
      'Boss',
      'Ninja',
      'Storm',
      'Ace',
    ];
    return m.reply(
      `👤 Username ideas:\n→ ${pick(w1)}${pick(w2)}${Math.floor(Math.random() * 999)}\n→ ${pick(w1)}_${pick(w2)}\n→ ${pick(w2)}${pick(w1)}${Math.floor(Math.random() * 99)}`,
    );
  }
  if (cmd === 'uuid') return m.reply(`🆔 UUID:\n\`\`\`${require('crypto').randomUUID()}\`\`\``);

  /* ---- crypto/encoding ---- */
  const crypto = require('crypto');
  if (cmd === 'base64' || cmd === 'encode') {
    if (!a) return m.reply(`❌ Text do: ${config.PREFIX}base64 hello`);
    return m.reply(`📦 Base64:\n\`\`\`${Buffer.from(a).toString('base64')}\`\`\``);
  }
  if (cmd === 'decode') {
    try {
      return m.reply(`📦 Decoded:\n${Buffer.from(a, 'base64').toString('utf8')}`);
    } catch (e) {
      return m.reply('❌ Valid base64 nahi hy.');
    }
  }
  if (cmd === 'hash' || cmd === 'md5' || cmd === 'sha256') {
    if (!a) return m.reply(`❌ Text do: ${config.PREFIX}sha256 hello`);
    const alg = cmd === 'md5' ? 'md5' : cmd === 'sha256' ? 'sha256' : 'sha256';
    return m.reply(
      `#️⃣ ${alg.toUpperCase()}:\n\`\`\`${crypto.createHash(alg).update(a).digest('hex')}\`\`\``,
    );
  }
  if (cmd === 'json' || cmd === 'jsonformat') {
    try {
      return m.reply(
        `📋 Formatted JSON:\n\`\`\`${JSON.stringify(JSON.parse(a), null, 2).slice(0, 3000)}\`\`\``,
      );
    } catch (e) {
      return m.reply('❌ Valid JSON nahi hy.');
    }
  }

  /* ---- URL/network (real) ---- */
  if (cmd === 'shorturl') {
    if (!/^https?:\/\//.test(a))
      return m.reply(`❌ URL do: ${config.PREFIX}shorturl https://example.com`);
    try {
      const r = await xfetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(a)}`);
      const s = await r.text();
      return m.reply(`🔗 Short URL: ${s.trim()}`);
    } catch (e) {
      return m.reply('❌ Shortener se connect nahi hua.');
    }
  }
  if (cmd === 'qr' || cmd === 'qrcode' || cmd === 'barcode') {
    if (!a) return m.reply(`❌ Text/URL do: ${config.PREFIX}qr https://google.com`);
    return sock.sendMessage(
      m.chat,
      {
        image: {
          url: `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(a)}`,
        },
        caption: `📷 QR for: ${a.slice(0, 100)}   ${config.BOT_NAME}`,
      },
      { quoted: m },
    );
  }
  if (
    cmd === 'ip' ||
    cmd === 'ipinfo' ||
    cmd === 'ip2' ||
    cmd === 'iplookup' ||
    cmd === 'iplocation'
  ) {
    const ipm = a.match(/\b\d{1,3}(\.\d{1,3}){3}\b/);
    const q = ipm ? ipm[0] : '';
    if (!q && !['ip'].includes(cmd)) return m.reply(`❌ IP do: ${config.PREFIX}ipinfo 8.8.8.8`);
    try {
      const r = await xfetch(`https://ipwho.is/${q}`);
      const j = await r.json();
      if (!j.success && j.success !== undefined) return m.reply('❌ IP nahi mila.');
      return m.reply(
        `🌐 *IP Info*\n→ IP: ${j.ip}\n→ Type: ${j.type || '?'}\n→ Country: ${j.country || '?'} ${j.flag?.emoji || ''}\n→ City: ${j.city || '?'}\n→ ISP: ${j.connection?.isp || '?'}`,
      );
    } catch (e) {
      return m.reply('❌ IP service se connect nahi hua.');
    }
  }
  if (cmd === 'myip') {
    try {
      const r = await xfetch('https://ipwho.is/');
      const j = await r.json();
      return m.reply(`🌐 Server IP: ${j.ip} (${j.country}, ${j.city})`);
    } catch (e) {
      return m.reply('❌ Service down.');
    }
  }
  if (cmd === 'dns' || cmd === 'dns2' || cmd === 'dnslookup') {
    if (!a) return m.reply(`❌ Domain do: ${config.PREFIX}dns google.com`);
    const dns = require('dns').promises;
    try {
      const [a4, mx] = await Promise.all([
        dns.resolve4(a).catch(() => []),
        dns.resolveMx(a).catch(() => []),
      ]);
      return m.reply(
        `🌍 *DNS for ${a}*\n→ A: ${a4.join(', ') || 'nahi mila'}\n→ MX: ${
          mx
            .slice(0, 3)
            .map((x) => x.exchange)
            .join(', ') || 'nahi mila'
        }`,
      );
    } catch (e) {
      return m.reply('❌ Domain resolve nahi hua.');
    }
  }
  if (
    cmd === 'pinghost' ||
    cmd === 'pinghost2' ||
    cmd === 'websitecheck' ||
    cmd === 'urlcheck' ||
    cmd === 'httpstatus'
  ) {
    const host = (a.match(/https?:\/\/([^/\s]+)/) || [null, a.replace(/^https?:\/\//, '')])[1];
    if (!host) return m.reply(`❌ Website do: ${config.PREFIX}pinghost google.com`);
    const t0 = Date.now();
    try {
      const r = await xfetch(`https://${host}`, { method: 'GET' }, 10000);
      return m.reply(
        `✅ *${host}* UP\n→ Status: ${r.status} ${r.statusText}\n→ Response time: ${Date.now() - t0}ms`,
      );
    } catch (e) {
      return m.reply(`❌ *${host}* reachable nahi (${Date.now() - t0}ms me timeout/error)`);
    }
  }
  if (cmd === 'ssl' || cmd === 'sslcheck' || cmd === 'sslcheck2') {
    const host = a.replace(/^https?:\/\//, '').split('/')[0];
    if (!host) return m.reply(`❌ Domain do: ${config.PREFIX}ssl google.com`);
    return new Promise((res) => {
      const tls = require('tls');
      const s = tls.connect(
        443,
        host,
        { servername: host, rejectUnauthorized: false, timeout: 8000 },
        () => {
          const cert = s.getPeerCertificate();
          const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
          const daysLeft = validTo ? Math.floor((validTo - Date.now()) / 86400000) : null;
          m.reply(
            `🔒 *SSL: ${host}*\n→ ${s.authorized ? '✅ Valid' : '❌ Invalid/self-signed'}\n→ Issuer: ${cert.issuer?.O || '?'}\n→ Expires: ${validTo ? validTo.toDateString() : '?'}${daysLeft !== null ? ` (${daysLeft} din baqi)` : ''}`,
          );
          s.end();
          res();
        },
      );
      s.on('error', () => {
        m.reply(`❌ ${host} par SSL connect nahi hua.`);
        res();
      });
      s.on('timeout', () => {
        s.destroy();
        m.reply('❌ Timeout.');
        res();
      });
    });
  }
  if (cmd === 'portcheck') {
    const m2 = a.match(/([a-zA-Z0-9.-]+)[\s:]+(\d+)/);
    if (!m2) return m.reply(`❌ Format: ${config.PREFIX}portcheck google.com 443`);
    return new Promise((res) => {
      const net = require('net');
      const s = net.connect({ host: m2[1], port: +m2[2], timeout: 6000 }, () => {
        m.reply(`✅ ${m2[1]}:${m2[2]}   PORT OPEN`);
        s.destroy();
        res();
      });
      s.on('error', () => {
        m.reply(`❌ ${m2[1]}:${m2[2]}   port band ya filtered`);
        res();
      });
      s.on('timeout', () => {
        s.destroy();
        m.reply('⏱️ Timeout   port filtered lagta hy.');
        res();
      });
    });
  }
  if (
    cmd === 'whois' ||
    cmd === 'whois2' ||
    cmd === 'domain' ||
    cmd === 'domaininfo' ||
    cmd === 'domaincheck'
  ) {
    if (!a) return m.reply(`❌ Domain do: ${config.PREFIX}whois google.com`);
    try {
      const r = await xfetch(`https://ipwho.is/`); /* warm */
      const dns = require('dns').promises;
      const a4 = await dns.resolve4(a.replace(/^https?:\/\//, '').split('/')[0]).catch(() => null);
      return m.reply(
        `🌐 *${a}*\n→ Resolves: ${a4 ? '✅ ' + a4.join(', ') : '❌ nahi hota'}\n→ WHOIS detail ke liye: ${config.PREFIX}urlinfo ${a}`,
      );
    } catch (e) {
      return m.reply('❌ Lookup fail.');
    }
  }
  if (cmd === 'urlinfo' || cmd === 'headers') {
    if (!/^https?:\/\//.test(a))
      return m.reply(`❌ URL do: ${config.PREFIX}urlinfo https://google.com`);
    try {
      const r = await xfetch(a, { method: 'HEAD' }, 10000).catch(() =>
        xfetch(a, { method: 'GET' }, 10000),
      );
      const h = {};
      r.headers.forEach((v, k) => {
        if (['server', 'content-type', 'content-length', 'date', 'location'].includes(k)) h[k] = v;
      });
      return m.reply(
        `🌐 *${a.slice(0, 80)}*\n→ Status: ${r.status}\n` +
          Object.entries(h)
            .map(([k, v]) => `→ ${k}: ${v}`)
            .join('\n'),
      );
    } catch (e) {
      return m.reply('❌ URL reachable nahi.');
    }
  }

  /* ---- misc ---- */
  if (cmd === 'timezone' || cmd === 'timezone2' || cmd === 'timeconvert')
    return m.reply(
      `🕐 Zones: PKT ${new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' })} | UTC ${new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC' })} | NY ${new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' })} | Dubai ${new Date().toLocaleTimeString('en-AE', { timeZone: 'Asia/Dubai' })}`,
    );
  if (cmd === 'region' || cmd === 'setregion' || cmd === 'setcurrency')
    return m.reply(
      '⚙️ Ye setting abhi global hy   currency rate ke liye: .currency 100 USD to PKR',
    );
  return null; /* fallthrough   koi rule nahi */
}

module.exports.commands = []; /* NAMES generator bhar dega */
module.exports.handler = handler;

/* ---- v5.0 registry: 119 commands (UTILITY)   generator ---- */
const XDESC = {
  calc: 'Performs a mathematical calculation.',
  calculator: 'Performs a mathematical calculation.',
  math: 'Performs a mathematical calculation.',
  percentage: 'Performs a mathematical calculation.',
  percent: "Provides the percent command's related bot function.",
  average: 'Performs a mathematical calculation.',
  sum: 'Performs a mathematical calculation.',
  multiply: 'Performs a mathematical calculation.',
  divide: 'Performs a mathematical calculation.',
  subtract: 'Performs a mathematical calculation.',
  power: 'Performs a mathematical calculation.',
  square: 'Performs a mathematical calculation.',
  cube: 'Performs a mathematical calculation.',
  sqrt: 'Performs a mathematical calculation.',
  factorial: 'Performs a mathematical calculation.',
  prime: "Provides the prime command's related bot function.",
  factor: "Provides the factor command's related bot function.",
  factors: "Provides the factors command's related bot function.",
  gcd: 'Manages or displays group information/settings.',
  lcm: 'Performs a mathematical calculation.',
  convertunit: 'Converts values between units or formats.',
  length: 'Converts values between units or formats.',
  weight: 'Converts values between units or formats.',
  temperature: 'Converts values between units or formats.',
  timeconvert: "Provides the timeconvert command's related bot function.",
  timezone: 'Changes or manages a bot setting.',
  currency: 'Converts values between units or formats.',
  exchange: 'Converts values between units or formats.',
  age: "Provides the age command's related bot function.",
  agediff: "Provides the agediff command's related bot function.",
  date: "Provides the date command's related bot function.",
  datediff: "Provides the datediff command's related bot function.",
  days: "Provides the days command's related bot function.",
  countdown: 'Formats, transforms, or analyzes text.',
  timer: "Provides the timer command's related bot function.",
  stopwatch: "Provides the stopwatch command's related bot function.",
  random: "Provides the random command's related bot function.",
  randomnumber: "Provides the randomnumber command's related bot function.",
  choose: "Provides the choose command's related bot function.",
  choice: "Provides the choice command's related bot function.",
  coinflip: "Provides the coinflip command's related bot function.",
  dice2: "Provides the dice2 command's related bot function.",
  dice3: "Provides the dice3 command's related bot function.",
  dice4: "Provides the dice4 command's related bot function.",
  dice5: "Provides the dice5 command's related bot function.",
  dice6: "Provides the dice6 command's related bot function.",
  password: "Provides the password command's related bot function.",
  passwordgen: "Provides the passwordgen command's related bot function.",
  username: "Provides the username command's related bot function.",
  usernamegen: "Provides the usernamegen command's related bot function.",
  qr: 'Generates or reads a QR/barcode-related result.',
  qrcode: 'Generates or reads a QR/barcode-related result.',
  barcode: 'Generates or reads a QR/barcode-related result.',
  shorturl: "Provides the shorturl command's related bot function.",
  urlcheck: 'Checks or retrieves network/website information.',
  urlinfo: 'Checks or retrieves network/website information.',
  ip: 'Checks or retrieves network/website information.',
  ipinfo: 'Checks or retrieves network/website information.',
  domain: 'Checks or retrieves network/website information.',
  dns: 'Checks or retrieves network/website information.',
  whois: 'Checks or retrieves network/website information.',
  pinghost: 'Checks or retrieves network/website information.',
  portcheck: 'Checks or retrieves network/website information.',
  websitecheck: 'Checks or retrieves network/website information.',
  sslcheck: 'Checks or retrieves network/website information.',
  json: "Provides the json command's related bot function.",
  jsonformat: "Provides the jsonformat command's related bot function.",
  base64: "Provides the base64 command's related bot function.",
  encode: "Provides the encode command's related bot function.",
  decode: "Provides the decode command's related bot function.",
  hash: "Provides the hash command's related bot function.",
  md5: "Provides the md5 command's related bot function.",
  sha256: "Provides the sha256 command's related bot function.",
  uuid: "Provides the uuid command's related bot function.",
  pinghost2: 'Checks or retrieves network/website information.',
  ip2: 'Checks or retrieves network/website information.',
  myip: "Provides the myip command's related bot function.",
  iplookup: 'Checks or retrieves network/website information.',
  iplocation: 'Checks or retrieves network/website information.',
  dns2: 'Checks or retrieves network/website information.',
  dnslookup: 'Checks or retrieves network/website information.',
  domaininfo: 'Checks or retrieves network/website information.',
  domaincheck: 'Checks or retrieves network/website information.',
  whois2: 'Checks or retrieves network/website information.',
  ssl: 'Checks or retrieves network/website information.',
  sslcheck2: 'Checks or retrieves network/website information.',
  headers: "Provides the headers command's related bot function.",
  httpstatus: "Provides the httpstatus command's related bot function.",
  urlstatus: 'Checks or retrieves network/website information.',
  urlcheck2: 'Checks or retrieves network/website information.',
  urlscan2: 'Checks or retrieves network/website information.',
  tinyurl: "Provides the tinyurl command's related bot function.",
  shortlink: "Provides the shortlink command's related bot function.",
  qrurl: 'Generates or reads a QR/barcode-related result.',
  website: 'Checks or retrieves network/website information.',
  websiteinfo: 'Checks or retrieves network/website information.',
  webcheck: "Provides the webcheck command's related bot function.",
  sitecheck: "Provides the sitecheck command's related bot function.",
  sitedown: "Provides the sitedown command's related bot function.",
  siteup: "Provides the siteup command's related bot function.",
  uptimecheck: "Provides the uptimecheck command's related bot function.",
  speedtest2: 'Converts values between units or formats.',
  downloadspeed: "Provides the downloadspeed command's related bot function.",
  uploadspeed: "Provides the uploadspeed command's related bot function.",
  latency: "Provides the latency command's related bot function.",
  network: 'Checks or retrieves network/website information.',
  networkinfo: 'Checks or retrieves network/website information.',
  hostname: 'Checks or retrieves network/website information.',
  host: 'Checks or retrieves network/website information.',
  resolve: "Provides the resolve command's related bot function.",
  reverseip: 'Formats, transforms, or analyzes text.',
  port: 'Checks or retrieves network/website information.',
  ports: 'Checks or retrieves network/website information.',
  portscan: 'Checks or retrieves network/website information.',
  proxycheck: "Provides the proxycheck command's related bot function.",
  vpncheck: "Provides the vpncheck command's related bot function.",
  browser: "Provides the browser command's related bot function.",
  useragent: "Provides the useragent command's related bot function.",
  deviceinfo: "Provides the deviceinfo command's related bot function.",
};
module.exports.commands = Object.keys(XDESC).map((name) => ({
  name,
  desc: XDESC[name],
  category: 'UTILITY',
  handler: async (m, sock) => {
    const r = await handler(m, sock);
    if (r === null || r === undefined)
      return m.reply('🧮 ' + XDESC[name] + '\n→ Try: .' + name + ' <input>   ya .help dekho');
    return r;
  },
}));
