/* SAQI-MD   error auto-heal: transient errors khud retry, phir bhi fail ho to user ke
 * apne number (yourself) par report bhejo taake bot khud theek ho sake. */
const config = require('../../config');
const mongoose = require('mongoose');

// transient (khud theek ho jane wale) errors   in par retry ka faida hota hy
const TRANSIENT =
  /timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang|fetch failed|network|429|rate.?limit|503|502|504|busy|EAI_AGAIN|ENOTFOUND/i;

function isTransientError(msg) {
  return TRANSIENT.test(String(msg || ''));
}

// error ko Mongo me likho (assistant/owner baad me utha kar fix kare)
async function logError(rec) {
  try {
    if (!config.MONGODB_URI) return;
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    }
    await mongoose.connection.db.collection('bot_errors').insertOne({
      ...rec,
      at: new Date(),
      resolved: false,
    });
  } catch (e) {
    /* logging fail ho to kuch na karo */
  }
}

// user ke apne number (yourself chat) par report
async function reportToSelf(sock, text) {
  const jid = String(sock?.user?.id || '')
    .split(':')[0]
    .split('@')[0];
  if (!jid) return;
  await sock.sendMessage(`${jid}@s.whatsapp.net`, { text }).catch(() => {});
}

module.exports = { isTransientError, logError, reportToSelf };
