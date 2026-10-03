/* SAQI-MD — MongoDB-backed Baileys Auth State
 * Baileys ka useMultiFileAuthState iska file-system version hy — yahan wahi state
 * MongoDB me save hoti hy taake pair hone ke baad restart par dobara pair na karna pade.
 *
 * Usage:
 *   const { state, saveCreds } = await useMongoAuthState(uri, sessionId)
 * Agar MONGODB_URI khali ho to file-system fallback use hota hy (local dev ke liye).
 */
const mongoose = require('mongoose');
const { useMultiFileAuthState, BufferJSON, initAuthCreds } = require('@whiskeysockets/baileys');

const SessionModel = mongoose.models.baileys_sessions ||
  mongoose.model('baileys_sessions', new mongoose.Schema({
    _id: String,
    data: mongoose.Schema.Types.Mixed,
  }, { strict: false }));

async function useMongoAuthState(uri, sessionId = 'saqi-md-session') {
  if (!uri) {
    // ---- file fallback (local dev / bina Mongo) ----
    return useMultiFileAuthState('./session');
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  }

  const read = async (id) => {
    const doc = await SessionModel.findOne({ _id: id }).lean();
    if (!doc) return null;
    return JSON.parse(JSON.stringify(doc.data), BufferJSON.reviver);
  };
  const write = async (id, data) => {
    await SessionModel.updateOne(
      { _id: id },
      { $set: { data: JSON.parse(JSON.stringify(data, BufferJSON.replacer)) } },
      { upsert: true }
    );
  };

  const creds = (await read(`${sessionId}:creds`)) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        async get(type, ids) {
          const doc = (await read(`${sessionId}:keys-${type}`)) || {};
          const out = {};
          for (const k of ids) if (doc[k]) out[k] = doc[k];
          return out;
        },
        async set(data) {
          for (const type of Object.keys(data)) {
            const id = `${sessionId}:keys-${type}`;
            const doc = (await read(id)) || {};
            Object.assign(doc, data[type]);
            await write(id, doc);
          }
        },
        async clear() {
          // Baileys 7 me use nahi hota, safety ke liye
        },
      },
    },
    saveCreds: () => write(`${sessionId}:creds`, creds),
  };
}

module.exports = { useMongoAuthState };
