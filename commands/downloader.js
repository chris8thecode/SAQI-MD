/* SAQI-MD — DOWNLOADER: social media + youtube + misc download commands
 * tikwm (tiktok) + generic cobalt-style + youtube (ytSearch/ytDownload) + misc.
 */
const config = require('../config');
const { ytSearch, ytDownload } = require('../lib/functions');

const GENERIC = ['twitter','gdrive','capcut','fb','igdl','igdl2','igdl3','igmp3','mediafire','megadl','download','ytpost'];

async function tiktokDL(m, sock) {
  const r = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(m.arg)}`).then(r => r.json());
  if (!r.data) return m.reply('❌ Video nahi mili. Link check karo.');
  if (m.command === 'ttmp3') {
    return sock.sendMessage(m.chat, { audio: { url: r.data.music }, mimetype: 'audio/mpeg' }, { quoted: m });
  }
  await sock.sendMessage(m.chat, { video: { url: r.data.play }, caption: `⬇️ *TikTok* — ${config.BOT_NAME}` }, { quoted: m });
}

async function genericDL(m, sock) {
  const r = await fetch('https://api.cobalt.tools/api/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ url: m.arg }),
  }).then(r => r.json());
  if (r.status === 'error' || !r.url) return m.reply('❌ Download nahi ho saka. Link private ya unsupported hy.');
  if (r.audio) return sock.sendMessage(m.chat, { audio: { url: r.audio }, mimetype: 'audio/mpeg' }, { quoted: m });
  await sock.sendMessage(m.chat, { video: { url: r.url }, caption: `⬇️ *Download* — ${config.BOT_NAME}` }, { quoted: m });
}

async function ytDL(m, sock) {
  const asAudio = ['song', 'play'].includes(m.command);
  if (!m.arg) return m.reply(`❌ Song/video ka naam ya link do.\nExample: ${config.PREFIX}${m.command} saqi achi lagti ho`);
  await sock.sendPresenceUpdate('recording', m.chat).catch(() => {});
  let video = null;
  if (/youtu/.test(m.arg)) {
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
            ? sock.sendMessage(m.chat, { audio: buf, mimetype: 'audio/mpeg' }, { quoted: m })
            : sock.sendMessage(m.chat, { video: buf, caption: `🎵 *${video.title}*\n_⬇️ SAQI-MD_` }, { quoted: m });
        }
      }
    }
  } catch (e) { console.error('[downloader]', e.message); }
  return m.reply(`⚠️ Direct file nahi ban saki (converter down). Yahan dekho:\n\n▶️ ${video.url}`);
}

async function ttsCmd(m, sock) {
  if (!m.arg) return m.reply(`❌ Text do. Example: ${config.PREFIX}tts hello kaise ho`);
  const lang = (m.arg.match(/-([a-z]{2})\s*$/) || [null, 'hi'])[1];
  const text = m.arg.replace(/-[a-z]{2}\s*$/, '');
  try {
    const r = await fetch(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`);
    if (!r.ok) throw new Error('tts fail');
    const buf = Buffer.from(await r.arrayBuffer());
    await sock.sendMessage(m.chat, { audio: buf, mimetype: 'audio/mpeg', ptt: true }, { quoted: m });
  } catch (e) { await m.reply('❌ TTS fail: ' + e.message); }
}

async function surahCmd(m, sock) {
  const n = parseInt(m.arg) || 1;
  if (n < 1 || n > 114) return m.reply('❌ Surah number 1-114 do. Example: .surah 1');
  try {
    const r = await fetch(`https://api.alquran.cloud/v1/surah/${n}/quran-uthmani`).then(r => r.json());
    const ayahs = r.data.ayahs.slice(0, 15).map(a => `${a.numberInSurah}. ${a.text}`).join('\n');
    await m.reply(`📖 *Surah ${r.data.englishName} (${r.data.name})*\n\n${ayahs}${r.data.ayahs.length > 15 ? '\n\n_(pehli 15 ayat)_' : ''}`);
  } catch { await m.reply('❌ Quran API down hy.'); }
}

async function miscCmd(m, sock) {
  switch (m.command) {
    case 'dlnpm': {
      if (!m.arg) return m.reply('❌ Package name do. Example: .dlnpm baileys');
      const r = await fetch(`https://registry.npmjs.org/${encodeURIComponent(m.arg)}`).then(r => r.json());
      if (r.error) return m.reply('❌ Package nahi mila.');
      const v = r['dist-tags']?.latest;
      return m.reply(`📦 *${r.name}* v${v}\n📝 ${r.versions[v]?.description || '-'}\n🔗 ${r.versions[v]?.dist?.tarball || ''}`);
    }
    case 'apk': {
      if (!m.arg) return m.reply('❌ App ka naam do. Example: .apk whatsapp');
      return m.reply(`📱 *APK Search: ${m.arg}*\n\n🔗 https://www.apkpure.com/search?q=${encodeURIComponent(m.arg)}\n\n_(APK direct download site policies ki wajah se link dete hyn)_`);
    }
    case 'gitclone': {
      if (!/github\.com/.test(m.arg)) return m.reply('❌ GitHub repo link do. Example: .gitclone https://github.com/user/repo');
      return m.reply(`📥 *Repo clone link:*\n\n${m.arg.replace('github.com', 'codeload.github.com').replace(/\.git$/, '')}/zip/heads/main\n\n_(browser me kholo — poora repo ZIP me milega)_`);
    }
    case 'srepo': {
      return m.reply(`🗂️ *SAQI-MD Source Repo:*\n\nhttps://github.com/badb54880-spec/SAQI-MD`);
    }
    case 'tiktoksearch': {
      if (!m.arg) return m.reply('❌ Kuch likho. Example: .tiktoksearch funny cats');
      try {
        const r = await fetch(`https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(m.arg)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        }).then(r => r.json());
        const vids = r.data?.slice(0, 5) || [];
        if (!vids.length) throw new Error('empty');
        return m.reply(`🔎 *TikTok: ${m.arg}*\n\n` + vids.map((v, i) => `${i + 1}. ${v.title?.slice(0, 50)}\n▶️ https://tikwm.com/video/${v.video_id || v.id}`).join('\n'));
      } catch {
        return m.reply(`🔎 *TikTok Search: ${m.arg}*\n\n🔗 https://www.tiktok.com/search?q=${encodeURIComponent(m.arg)}\n\n_(jo video pasand aaye uska link .tiktok me do — download kar dunga)_`);
      }
    }
    case 'tsticker': {
      return m.reply('ℹ️ Text sticker ke liye .attp use karo — wo text ko animated sticker bana deta hy.');
    }
    case 'drama': case 'cartoon': case 'movie': {
      if (!m.arg) return m.reply(`❌ Naam do. Example: ${config.PREFIX}${m.command} tom and jerry`);
      return m.reply(`🔎 *${m.command}: ${m.arg}*\n\n🎬 Download links ke liye ye try karo:\n• https://youtu.be/results?search_query=${encodeURIComponent(m.arg)}\n\n_(Direct movie download copyright ki wajah se support nahi karta)_`);
    }
    default: return m.reply('❓ Unknown download command');
  }
}

// dispatch: command -> right engine
async function dispatch(m, sock) {
  if (!m.arg) return m.reply(`❌ Link/naam do. Example: ${config.PREFIX}${m.command} <link>`);
  if (['tiktok', 'tiktok2', 'tiktok3', 'ttmp3'].includes(m.command)) return tiktokDL(m, sock);
  if (GENERIC.includes(m.command)) return genericDL(m, sock);
  return miscCmd(m, sock);
}

module.exports.commands = [
  ...['tiktok', 'tiktok2', 'tiktok3', 'ttmp3'].map(n => ({ name: n, desc: 'TikTok download', category: 'DOWNLOAD', handler: dispatch })),
  ...GENERIC.map(n => ({ name: n, desc: 'Media download', category: 'DOWNLOAD', handler: dispatch })),
  { name: 'dlnpm', desc: 'npm package info', category: 'DOWNLOAD', handler: dispatch },
  { name: 'apk', desc: 'APK search', category: 'DOWNLOAD', handler: dispatch },
  { name: 'gitclone', desc: 'GitHub repo ZIP link', category: 'DOWNLOAD', handler: dispatch },
  { name: 'tiktoksearch', desc: 'TikTok search', category: 'DOWNLOAD', handler: dispatch },
  { name: 'tsticker', desc: 'Text sticker info', category: 'DOWNLOAD', handler: dispatch },
  { name: 'surah', desc: 'Quran surah (1-114)', category: 'DOWNLOAD', handler: surahCmd },
  { name: 'tts', desc: 'Text → voice', category: 'DOWNLOAD', handler: ttsCmd },
  { name: 'play', desc: 'YouTube MP3', category: 'DOWNLOAD', handler: ytDL },
  { name: 'song', desc: 'YouTube MP3', category: 'DOWNLOAD', handler: ytDL },
  { name: 'video', desc: 'YouTube MP4', category: 'DOWNLOAD', handler: ytDL },
  { name: 'drama', desc: 'Drama search', category: 'DOWNLOAD', handler: dispatch },
  { name: 'cartoon', desc: 'Cartoon search', category: 'DOWNLOAD', handler: dispatch },
  { name: 'movie', desc: 'Movie search', category: 'DOWNLOAD', handler: dispatch },
];
