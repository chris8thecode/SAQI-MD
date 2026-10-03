/* SAQI-MD — DOWNLOADER: .song/.ytmp3, .video/.ytmp4
 * YouTube search (API-key-free) -> public converter APIs ko order me try karta hy.
 * Note: public converters kabhi kabhi down hote hain — teen endpoints fallback me hain,
 * sab fail hon to video ka link bhej deta hy. (Production me apna converter server best hy.)
 */
const { ytSearch, ytDownload } = require('../lib/functions');
const config = require('../config');

const CAPTION = (title, url) => `🎵 *${title}*\n🔗 ${url}\n\n_⬇️ SAQI-MD Downloader_`;

async function handler(m, sock) {
  const asAudio = ['song', 'ytmp3', 'music', 'play'].includes(m.command);
  if (!m.arg) return m.reply(`❌ Song/video ka naam ya link do.\nExample: ${config.PREFIX}${asAudio ? 'song' : 'video'} saqi achi lagti ho`);

  await sock.sendPresenceUpdate('recording', m.chat).catch(() => {}); // "recording..." dikhata hy

  let video = null;
  if (/youtu/.test(m.arg) && m.arg.match(/.{11}/)) {
    const id = m.arg.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/)?.[1];
    if (id) video = { id, title: 'YouTube Video', url: `https://youtu.be/${id}` };
  }
  if (!video) {
    m.reply('🔎 Search kar raha hoon...');
    video = await ytSearch(m.arg);
    if (!video) return m.reply('❌ YouTube par nahi mila. Doosre lafz try karo.');
  }

  m.reply(`⬇️ *${video.title}* download ho raha hy... (${asAudio ? 'MP3' : 'MP4'})`);

  const dlUrl = await ytDownload(video.id, asAudio ? 'mp3' : 'mp4');

  try {
    if (dlUrl) {
      const mediaRes = await fetch(dlUrl, { redirect: 'follow' });
      if (mediaRes.ok) {
        const buf = Buffer.from(await mediaRes.arrayBuffer());
        if (buf.length > 10000) {
          return asAudio
            ? sock.sendMessage(m.chat, { audio: buf, mimetype: 'audio/mpeg', fileName: `${video.title}.mp3` }, { quoted: m })
            : sock.sendMessage(m.chat, { video: buf, caption: CAPTION(video.title, video.url) }, { quoted: m });
        }
      }
    }
  } catch (e) {
    console.error('[downloader]', e.message);
  }

  // fallback: link bhej do
  return m.reply(`⚠️ Direct file nahi ban saki (converter down hy). Yahan se dekh lo:\n\n▶️ ${video.url}\n\n_owner: converter server lagana parega_`);
}

module.exports.commands = [
  { name: 'song', desc: 'YouTube MP3', category: 'Downloader', handler },
  { name: 'ytmp3', desc: 'YouTube MP3', category: 'Downloader', handler },
  { name: 'music', desc: 'YouTube MP3', category: 'Downloader', handler },
  { name: 'play', desc: 'YouTube MP3', category: 'Downloader', handler },
  { name: 'video', desc: 'YouTube MP4', category: 'Downloader', handler },
  { name: 'ytmp4', desc: 'YouTube MP4', category: 'Downloader', handler },
];
