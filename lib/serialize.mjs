/* SAQI-MD — Message serialization (smsg)
 * Har incoming WhatsApp message ko ek consistent shape me deta hy:
 *   m.message  -> asal Baileys message object
 *   m.text     -> caption/text (jahan se bhi mile)
 *   m.prefix, m.command, m.args, m.arg, m.query
 *   m.sender, m.chat, m.from, m.isGroup, m.isOwner, m.pushname
 *   m.quoted   -> reply kiya hua message (ya null)
 *   m.download() -> quoted/current media ka Buffer
 *   m.reply(txt), m.replyMedia(buffer, {caption?, asSticker?, asAudio?...})
 */
import { downloadContentFromMessage, jidNormalizedUser, getContentType } from '@whiskeysockets/baileys';
import config from '../config.js';

const WAMediaTypes = {
  imageMessage: 'image',
  videoMessage: 'video',
  audioMessage: 'audio',
  stickerMessage: 'sticker',
  documentMessage: 'document',
};

export function smsg(sock, m) {
  m.sender = jidNormalizedUser(m.key.participant || m.key.remoteJid);
  m.chat = jidNormalizedUser(m.key.remoteJid);
  m.from = m.chat;
  m.isGroup = m.chat.endsWith('@g.us');
  m.isOwner = config.isOwner(m.sender) || (sock.user && jidNormalizedUser(sock.user.id).split('@')[0] === m.sender.split('@')[0]);
  m.pushname = m.pushName || 'User';

  const content = m.message;
  m.mtype = content ? getContentType(content) : null;
  m.message = content;

  // ---- text extraction ----
  const t = content?.conversation || content?.extendedTextMessage?.text ||
            content?.imageMessage?.caption || content?.videoMessage?.caption ||
            content?.documentMessage?.caption || '';
  m.text = (t || '').trim();

  // ---- prefix / command parsing ----
  const prefixes = [config.PREFIX, '!', '/'];
  const used = prefixes.find(p => m.text.startsWith(p));
  m.prefix = used || null;
  m.command = null;
  m.args = [];
  if (used) {
    const parts = m.text.slice(used.length).trim().split(/\s+/);
    m.command = (parts.shift() || '').toLowerCase();
    m.args = parts;
  }
  m.arg = m.args.join(' ');
  m.query = m.arg;

  // ---- quoted message ----
  const ctx = content?.extendedTextMessage?.contextInfo;
  m.quoted = null;
  if (ctx?.quotedMessage) {
    const qType = getContentType(ctx.quotedMessage);
    m.quoted = {
      mtype: qType,
      text: ctx.quotedMessage[qType]?.text || ctx.quotedMessage[qType]?.caption || ctx.quotedMessage.conversation || '',
      message: ctx.quotedMessage,
      sender: jidNormalizedUser(ctx.participant || m.sender),
      key: { remoteJid: m.chat, id: ctx.stanzaId, fromMe: false, participant: ctx.participant },
    };
  }

  // ---- is view-once ----
  const mediaMsg = content?.imageMessage || content?.videoMessage || content?.audioMessage;
  const qMedia = m.quoted?.message?.imageMessage || m.quoted?.message?.videoMessage || m.quoted?.message?.audioMessage;
  m.isViewOnce = !!(mediaMsg?.viewOnce || qMedia?.viewOnce);

  // ---- download helper ----
  m.download = async (target = 'current') => {
    let msgObj, type;
    if (target === 'quoted') {
      if (!m.quoted) throw new Error('Koi quoted message nahi hy');
      msgObj = m.quoted.message;
    } else {
      msgObj = content;
    }
    for (const [k, v] of Object.entries(WAMediaTypes)) {
      if (msgObj?.[k]) { type = v; break; }
    }
    if (!type) throw new Error('Media nahi mila');
    const inner = msgObj.imageMessage || msgObj.videoMessage || msgObj.audioMessage ||
                  msgObj.stickerMessage || msgObj.documentMessage;
    const stream = await downloadContentFromMessage(inner, type);
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return { buffer: Buffer.concat(chunks), type, mimetype: inner?.mimetype || '' };
  };

  // ---- replies ----
  m.reply = (txt, extra = {}) =>
    sock.sendMessage(m.chat, { text: txt, ...extra }, { quoted: m });

  m.replyMedia = (buffer, opts = {}) => {
    const payload = opts.caption ? { caption: opts.caption } : {};
    if (opts.asSticker) return sock.sendMessage(m.chat, { sticker: buffer, ...payload }, { quoted: m });
    if (opts.asAudio) return sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg', ...payload }, { quoted: m });
    if (opts.asDocument) return sock.sendMessage(m.chat, { document: buffer, mimetype: opts.mimetype || 'application/octet-stream', fileName: opts.fileName || 'file', ...payload }, { quoted: m });
    return sock.sendMessage(m.chat, { [opts.asVideo ? 'video' : 'image']: buffer, ...payload }, { quoted: m });
  };

  return m;
}
