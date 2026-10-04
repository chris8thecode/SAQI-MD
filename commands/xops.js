/* SAQI-MD — xops (v5.2.1): blockforeign + clear
 * .blockforeign — ek command se sab foreign numbers (country code +92 ke ilawa) block,
 *                 jo status viewers/posters + chats me mile hyn (collector worker.js me).
 * .clear        — bot khud apni saari chats delete karta hy (apna chat list clean).
 */
const { kvGet, kvSet } = require('../lib/xhelp');
const config = require('../config');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const MY_CC = '92'; // Pakistan

function ownNumber(sock) {
  try { return String(sock.user?.id || '').split('@')[0].split(':')[0]; } catch { return ''; }
}

async function knownNumbers(sock) {
  const own = ownNumber(sock);
  const viewers = (await kvGet('x3seen:' + own + ':viewers', [])) || [];
  const chats = (await kvGet('x3seen:' + own + ':chats', [])) || [];
  const set = new Map(); // num -> jid (sirf real PN jids)
  for (const j of [...viewers, ...chats]) {
    const s = String(j);
    if (!s.endsWith('@s.whatsapp.net')) continue;
    const n = s.split('@')[0].split(':')[0];
    if (!/^\d{7,15}$/.test(n)) continue;
    set.set(n, n + '@s.whatsapp.net');
  }
  set.delete(own);
  return set;
}

async function handler(m, sock) {
  try {
    if (m.command === 'blockforeign') {
      const own = ownNumber(sock);
      const all = await knownNumbers(sock);
      let foreign = [...all.keys()].filter(n => !n.startsWith(MY_CC));
      // jo pehle se blocked hyn unko chhor do
      let blockedSet = new Set();
      try { blockedSet = new Set(((await sock.fetchBlocklist()) || []).map(j => String(j).split('@')[0])); } catch {}
      try { for (const n of ((await kvGet('x3blocked:' + own, [])) || [])) blockedSet.add(String(n)); } catch {}
      foreign = foreign.filter(n => !blockedSet.has(n));
      if (!foreign.length) return m.reply('✅ Koi foreign number nahi mila jo block karna ho.\n(Collector status viewers + chats se numbers jama karta hy — jitna zyada status/chat aayega, utni list bari hogi.)');
      const a = String(m.arg || '').trim().toLowerCase();
      if (a !== 'confirm' && a !== 'yes') {
        return m.reply('🛑 *BLOCKFOREIGN — PREVIEW*\n' +
          '▫️ Known numbers: ' + all.size + '\n' +
          '▫️ Foreign (+' + MY_CC + ' ke ilawa): *' + foreign.length + '*\n' +
          '▫️ Sample: ' + foreign.slice(0, 10).map(n => '+' + n).join(', ') + (foreign.length > 10 ? ' ...' : '') + '\n\n' +
          '⚠️ Ye sab block ho jayenge (tera status unko nahi dikhega, unka bhi nahi).\n' +
          '▸ Confirm: *.blockforeign confirm*');
      }
      let ok = 0, fail = 0;
      const failed = [];
      for (const n of foreign) {
        try { await sock.updateBlockStatus(n + '@s.whatsapp.net', 'block'); ok++; }
        catch {
          try { await sleep(800); await sock.updateBlockStatus(n + '@s.whatsapp.net', 'block'); ok++; }
          catch { fail++; failed.push('+' + n); }
        }
        await sleep(400); // flood se bachne ke liye human-like delay
      }
      const done = (await kvGet('x3blocked:' + own, [])) || [];
      await kvSet('x3blocked:' + own, [...new Set([...done, ...foreign])].slice(-20000));
      return m.reply('🚫 *BLOCKFOREIGN DONE*\n▫️ Blocked: *' + ok + '*\n' + (fail ? '▫️ Fail: ' + fail + ' (' + failed.slice(0, 8).join(', ') + (failed.length > 8 ? '...' : '') + ')\n' : '') + '\n✅ Ab ye numbers tera status nahi dekh sakte, aur unka status/content bhi band.');
    }

    if (m.command === 'clear') {
      const own = ownNumber(sock);
      const chats = (await kvGet('x3seen:' + own + ':chats', [])) || [];
      const uniq = [...new Set([...(chats || []), m.chat])].filter(j => j && j !== 'status@broadcast');
      let ok = 0, fail = 0;
      for (const j of uniq) {
        try { await sock.chatModify({ delete: true }, j); ok++; } catch { fail++; }
        await sleep(300);
      }
      return m.reply('🧹 *CLEAR DONE*\n▫️ Bot ki apni list se *' + ok + '* chats delete (fail: ' + fail + ')\n▫️ Bot ka chat area ab khali hy — messages data bot side se clean.\nℹ️ Ye bot ki chat list hy; tera phone apni list khud manage karta hy.');
    }
  } catch (e) {
    return m.reply('❌ ' + m.command + ' error: ' + (e.message || e));
  }
}

module.exports.commands = [
  { name: 'blockforeign', desc: 'Sab foreign numbers (+92 ke ilawa) block — preview phir .blockforeign confirm', category: 'OWNER', handler },
  { name: 'clear', desc: 'Bot apni saari chats khud clean kar de', category: 'OWNER', handler },
];
