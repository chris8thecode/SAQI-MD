/* SAQI-MD — Global Configuration
 * Sab values .env se aati hain (deploy platforms ke Environment Variables me bhi dal sakte ho)
 */
require('dotenv').config();

module.exports = {
  // ---- Bot identity ----
  BOT_NAME: process.env.BOT_NAME || 'SAQI-MD',
  BOT_VERSION: '1.0.0',
  PREFIX: process.env.PREFIX || '.',
  OWNER_NAME: process.env.OWNER_NAME || 'Attitude King',
  OWNER_NUMBERS: (process.env.OWNER_NUMBERS || '').split(',').map(s => s.replace(/[^0-9]/g, '')).filter(Boolean), // e.g. 923106762478,923134182952
  OWNER_EMAIL: process.env.OWNER_EMAIL || '',

  // ---- MongoDB (session persistence) ----
  MONGODB_URI: process.env.MONGODB_URI || '', // mongodb+srv://user:pass@cluster.../?retryWrites=true
  SESSION_ID: process.env.SESSION_ID || 'saqi-md-session', // ek bot instance = ek session id

  // ---- Behaviour ----
  MODE: process.env.MODE || 'public',        // public | private (private = sirf owner)
  TIMEZONE: process.env.TIMEZONE || 'Asia/Karachi',
  AUTO_READ: process.env.AUTO_READ !== 'false',
  AUTO_TYPING: process.env.AUTO_TYPING !== 'false',
  WELCOME: process.env.WELCOME !== 'false',
  GOODBYE: process.env.GOODBYE !== 'false',

  // ---- Worker (index.js) ----
  PORT: process.env.PORT || 3000,            // Koyeb health-check port
  MAX_RECONNECTS: 10,

  // ---- Pairing portal (server.js) ----
  PAIR_SOCKET_TTL_MS: 3 * 60 * 1000,         // pairing socket itni dair zinda rahega (link hone ke liye)

  // ---- AI (optional — .ai commands) ----
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

  isOwner(jid) {
    const num = String(jid || '').split('@')[0].replace(/[^0-9]/g, '');
    return this.OWNER_NUMBERS.includes(num);
  },
};
