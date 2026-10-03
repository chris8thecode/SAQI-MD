/* SAQI-MD — OWNER: .restart, .eval, .session, .setprefix
 * Sab sirf OWNER_NUMBERS wale users ke liye (index.js ownerOnly gate karta hy).
 */
const config = require('../config');
const { mono } = require('../lib/functions');

async function restart(m) {
  await m.reply('🔄 *SAQI-MD restart ho raha hy...*');
  setTimeout(() => process.exit(0), 1500); // platform restart-policy process wapis chalayegi
}

async function evalCmd(m, sock) {
  // SECURITY: sirf owner — phir bhi eval khatar hy, is liye limited sandbox nahi hy.
  if (!m.arg) return m.reply(`❌ Code do. Example: ${config.PREFIX}eval 2+2`);
  try {
    // async/await support ke liye AsyncFunction me wrap
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const result = await AsyncFunction('m', 'sock', 'config', `"use strict"; return (${m.arg})`)(m, sock, config)
      .catch(async (e) => {
        // return nahi, execute: multi-line code ke liye
        return await AsyncFunction('m', 'sock', 'config', `"use strict";${m.arg}`)(m, sock, config);
      });
    const out = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    return m.reply(`✅ *Result:*\n${mono(out?.slice(0, 1500))}`);
  } catch (e) {
    return m.reply(`❌ *Eval error:*\n${mono(String(e).slice(0, 800))}`);
  }
}

async function sessionInfo(m) {
  const state = require('mongoose').connection.readyState;
  return m.reply(
    `🗄️ *Session Info*\n\n` +
    `MongoDB: ${['disconnected', 'connected', 'connecting', 'disconnecting'][state]} (${state})\n` +
    `SESSION_ID: ${config.SESSION_ID}\n` +
    `Mode: ${config.MODE}\n` +
    `Owner(s): ${config.OWNER_NUMBERS.join(', ') || 'unset'}`
  );
}

async function setPrefix(m) {
  if (!m.arg || m.arg.length > 2) return m.reply('❌ Ek character do, e.g. .setprefix !');
  config.PREFIX = m.arg;
  require('dotenv').config();
  process.env.PREFIX = m.arg;
  return m.reply(`✅ Prefix ab "${m.arg}" hy (is restart tak valid — permanent ke liye env var set karo).`);
}

module.exports.commands = [
  { name: 'restart', desc: 'Bot process restart', category: 'Owner', ownerOnly: true, handler: restart },
  { name: 'eval', desc: 'JS code execute (owner)', category: 'Owner', ownerOnly: true, handler: evalCmd },
  { name: 'session', desc: 'Session/mongo status', category: 'Owner', ownerOnly: true, handler: sessionInfo },
  { name: 'setprefix', desc: 'Prefix change', category: 'Owner', ownerOnly: true, handler: setPrefix },
];
