/* SAQI-MD   TOOLS: FX animations, fonts (105), image tools (ffmpeg real), weather, npm, attp
 * Upscale/enhance/colorize/unblur/remini/blurface sab REAL ffmpeg filters par   koi fake nahi.
 */
const config = require('../../config');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { fontStyle } = require('../lib/helpers');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

function tmpFile(ext) {
  return path.join(
    os.tmpdir(),
    `saqimd_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`,
  );
}
function run(args) {
  return new Promise((res, rej) =>
    execFile('ffmpeg', args, { timeout: 90000 }, (e, so, se) =>
      e ? rej(new Error((se || e.message).slice(-200))) : res(),
    ),
  );
}

async function grabImage(m) {
  const msg = m.message?.imageMessage || m.quoted?.message?.imageMessage;
  if (!msg) return null;
  const stream = await downloadContentFromMessage(msg, 'image');
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

// ---- "cinematic" text sequences (earthquake...telepath)   animated text FX ----
const SCENES = {
  earthquake: [
    '🌄 Sab shant hy...',
    '🫨 Kuch hone wala hy...',
    '🌋 *DHAMAAA!* 💥',
    '🌍 *EARTHQUAKE!* Zameen hil gayi!',
  ],
  tsunami: ['🌊 Samandar shant...', '🌊🌊 Pani peche hat gaya...', '🌊🌊🌊 *TSUNAMI!* Bhaago! 💦'],
  volcano: [
    '⛰️ Pahad soya hy...',
    '🔥 Dhuan nikal raha hy...',
    '🌋 *VOLCANO ERUPTION!* Lava everywhere! 🔥',
  ],
  tornado: ['💨 Hawa tez ho rahi hy...', '🌀 Chakkar aa raha hy...', '🌪️ *TORNADO!* Sab urr gaya!'],
  hurricane: ['🌩️ Badal garaj rahe hain...', '🌧️ Tez barish...', '🌪️ *HURRICANE!* 💨💧'],
  alieninvasion: [
    '🛸 Aasman par kuch hy...',
    '🛸🛸 Woh aa rahe hain...',
    '👽 *ALIEN INVASION!* Take me to your leader!',
  ],
  zombie: ['🌙 Raat ho gayi...', '🚶 Koi chal raha hy...', '🧟 *ZOMBIES!* Run for your life! 🏃'],
  vampire: [
    '🕯️ Andhera kamra...',
    '🦇 Kuch parwaz kar raha hy...',
    '🧛 *VAMPIRE!* Blood everywhere! 🩸',
  ],
  werewolf: ['🌕 Poora chand nikla...', '🐺 Awaaz aayi...', '🐺 *WEREWOLF AWAKENS!* Howwwwl!'],
  wizardmagic: [
    '✨ Mantar parha ja raha hy...',
    '🌀 Energy jam ho rahi hy...',
    '🧙 *ABRACADABRA!* Magic shuru!',
  ],
  fairy: ['🌸 Jhaadiyon par roshni...', '🧚 *FAIRY DUST!* Wishes come true ✨'],
  mermaid: ['🌊 Gehra pani...', '🐠 Kuch chamak raha hy...', '🧜 *MERMAID SPOTTED!* 🐚'],
  dragonfire: ['🐉 Dragon jaag gaya...', '🔥 Saans le raha hy...', '🐲 *DRAGON FIRE!* 🔥🔥🔥'],
  phoenix: [' ashes...', '🔥 Ek parinda janm liya...', '🕊️🔥 *PHOENIX REBORN!*'],
  pegasus: ['☁️ Badalon me kuch hy...', '🐎 *PEGASUS FLYING!* 🪽'],
  centaur: ['🌲 Jungle me taangein...', '🏹 *CENTAUR APPEARED!* 🐴'],
  griffin: ['🦅 Aasman me saya...', '🦅 *GRIFFIN DIVES DOWN!*'],
  cyborg: ['⚙️ Machine jaag rahi hy...', '🤖 *CYBORG ONLINE!* Bzzt!'],
  ninja: ['🌙 Raat me koi...', '🥷 *NINJA STRIKE!* Shhh... 🔪'],
  samurai: ['⚔️ Talwar saaf hy...', '🗡️ *SAMURAI SLASH!* Kat gaya!'],
  viking: ['🚢 Samandar me kashti...', '🪓 *VIKINGS ATTACK!* For Valhalla!'],
  pirate: ['🏴‍☠️ Dushman jahaz nazar aya...', '⚓ *PIRATES BOARD!* Arghh! 💰'],
  knight: ['🛡️ Zirah pehen li...', '⚔️ *KNIGHT CHARGES!* For the kingdom!'],
  gladiator: ['🏛️ Arena me dushman...', '⚔️ *GLADIATOR WINS!* Are you not entertained?!'],
  spartan: ['300 tayyar hain...', '🛡️ *THIS IS SPARTA!* 🔥'],
  pharaoh: ['🏺 Pyramid ke andar...', '☥ *PHARAOH AWAKENS!* Mummy time! 🧟‍♂️'],
  mayan: ['🌿 Purana mandir mila...', '🗿 *MAYAN CURSE ACTIVATED!*'],
  atlantis: ['🌊 Pani ke neeche roshni...', '🏛️ *ATLANTIS RISES!* 🧜‍♂️'],
  olympus: ['⚡ Pahadon par bijli...', '🏛️ *OLYMPUS CALLS!* Zeus is watching 👁️'],
  valhalla: ['⚔️ Yudh ka mahol...', '🏛️ *WELCOME TO VALHALLA!* Skol! 🍺'],
  shaman: ['🪘 Dhol baj raha hy...', '🌀 *SHAMAN TRANCE!* Rooh-e-jungle 🌿'],
  witchspell: ['🧹 Kadde me khansi...', '🧙‍♀️ *WITCH SPELL CASTED!* Hex on you! 🐍'],
  necromancer: ['💀 Qabristan me roshni...', '☠️ *NECROMANCER RISES!* Undead army!'],
  alchemist: ['⚗️ Jar me jhatka...', '💚 *ALCHEMY COMPLETE!* Gold bana diya!'],
  monk: ['🧘 Saans andar... saans bahar...', '🕉️ *INNER PEACE ACHIEVED*'],
  yogi: ['🧘 Om... Om...', '🕉️ *YOGI MODE: ENLIGHTENED* ✨'],
  guru: ['📖 Guru bol rahe hain...', '🕉️ *GYAN TIME:* "Kaam karo, fal ki chinta mat karo" 🙏'],
  sage: ['🌿 Jadi booti jam ki...', '🔮 *SAGE WISDOM:* Sabar kar, waqt aayega'],
  mystic: ['🔮 Gumbad ghum rahi hy...', '✨ *MYSTIC VISION:* Anjaan raaste par safar'],
  oracle: ['🏛️ Kahani suni ja rahi hy...', '🔮 *ORACLE SPEAKS:* "Tumhari kismat badal rahi hy"'],
  sorcerer: ['🪄 Chari ghum rahi hy...', '⚡ *SORCERY UNLEASHED!*'],
  enchanter: ['✨ Parvane chamak rahe hain...', '🌟 *ENCHANTMENT COMPLETE!*'],
  conjurer: ['🎩 Topi se khargosh...', '🐇 *CONJURED!* Ta-da!'],
  illusionist: ['🎭 Aankhein band karo...', '🌀 *ILLUSION REVEALED!* Jo dekha wo sach nahi tha'],
  diviner: ['📿 Mala chal rahi hy...', '🔮 *DIVINATION:* Acha waqt aa raha hy'],
  seer: ['👁️ Nazar tez ki ja rahi hy...', '👁️ *VISION:* Jo chhupa hy wo khulega'],
  prophet: ['📜 Paigam likha ja raha hy...', '📜 *PROPHECY:* Sabr ka phal meetha hoga'],
  astral: ['🧠 Badan se bahar...', '🌌 *ASTRAL PROJECTION!* Stars dekho ✨'],
  medium: ['🕯️ Candle jalti hy...', '👻 *MEDIUM CONTACT!* Awaz aati hy...'],
  telepath: ['🧠 Dimagh se dimagh tak...', '📡 *TELEPATHY:* "Sun rahe ho?" 😏'],
};

// emoji animation single-shot commands (TOOLS ke emoji FX)   happy/angry/sad/shy/confused FUN me hyn (duplicate avoid)
const EMOJI_FX = { heart: '💖', moon: '🌙', rocket: '🚀', clock: '🕰️', fing: '🖕', nikal: '🚪' };

async function handler(m, sock) {
  const cmd = m.command;

  // ---- cinematic scene FX ----
  if (SCENES[cmd]) {
    for (const line of SCENES[cmd]) {
      const sent = await sock.sendMessage(m.chat, { text: line }, { quoted: m });
      await new Promise((r) => setTimeout(r, 1200));
      if (line !== SCENES[cmd][SCENES[cmd].length - 1]) {
        await sock.sendMessage(m.chat, { text: '⏳', edit: sent.key }).catch(() => {});
      }
    }
    return;
  }

  // ---- emoji FX ----
  if (EMOJI_FX[cmd]) {
    const e = EMOJI_FX[cmd];
    const frames = [e, e + e, e.repeat(3), `${e.repeat(3)}\n*${cmd.toUpperCase()}!*`];
    let last;
    for (const f of frames) {
      last = await sock.sendMessage(m.chat, { text: f }, { quoted: m });
      await new Promise((r) => setTimeout(r, 700));
    }
    return;
  }

  switch (cmd) {
    // ---- fonts ----
    case 'font': {
      if (!m.arg) return m.reply(`❌ Text do. Example: ${config.PREFIX}font SAQIB`);
      return m.reply(fontStyle(1, m.arg.toLowerCase()));
    }
    case 'loading': {
      const frames = ['⬜⬜⬜⬜', '🟩⬜⬜⬜', '🟩🟩⬜⬜', '🟩🟩🟩⬜', '🟩🟩🟩🟩 ✅'];
      let last;
      for (const f of frames) {
        last = await sock.sendMessage(m.chat, { text: `${f} ${pctBar()}` }, { quoted: m });
        await new Promise((r) => setTimeout(r, 800));
      }
      return;
    }
    case 'cd': {
      if (!m.arg || isNaN(parseInt(m.arg)))
        return m.reply(`❌ Number do. Example: ${config.PREFIX}cd 10`);
      let n = Math.min(parseInt(m.arg), 60);
      let last;
      while (n > 0) {
        last = await sock.sendMessage(m.chat, { text: `⏰ *${n}...*` }, { quoted: m });
        await new Promise((r) => setTimeout(r, 1500));
        n--;
      }
      return sock.sendMessage(m.chat, { text: '⏰ *TIME UP!* ⏱️' }, { quoted: m });
    }
    case 'wthr': {
      if (!m.arg) return m.reply(`❌ City do. Example: ${config.PREFIX}wthr Layyah`);
      try {
        const r = await fetch(`https://wttr.in/${encodeURIComponent(m.arg)}?format=j1`).then((r) =>
          r.json(),
        );
        const c = r.current_condition?.[0];
        if (!c) throw new Error('no data');
        return m.reply(
          `🌦️ *Weather   ${m.arg}*\n\n▫️ Temp: ${c.temp_C}°C (feels ${c.FeelsLikeC}°C)\n▫️ Sky: ${c.weatherDesc?.[0]?.value}\n▫️ Humidity: ${c.humidity}%\n▫️ Wind: ${c.windspeedKmph} km/h`,
        );
      } catch {
        return m.reply('❌ Weather nahi mila. City spelling check karo.');
      }
    }
    case 'type': {
      if (!m.arg) return m.reply('❌ Text do.');
      let acc = '';
      for (const ch of m.arg.slice(0, 60)) {
        acc += ch;
        await sock.sendMessage(m.chat, { text: acc + '▌' }).catch(() => {});
        await new Promise((r) => setTimeout(r, 250));
      }
      return sock.sendMessage(m.chat, { text: acc });
    }
    case 'spinner': {
      for (const f of ['◐', '◓', '◑', '◒', '◯ Done!']) {
        await sock.sendMessage(m.chat, { text: f }, { quoted: m });
        await new Promise((r) => setTimeout(r, 600));
      }
      return;
    }
    case 'npm': {
      if (!m.arg) return m.reply('❌ Package name do. Example: .npm baileys');
      const r = await fetch(`https://registry.npmjs.org/${encodeURIComponent(m.arg)}`).then((r) =>
        r.json(),
      );
      if (r.error) return m.reply('❌ Package nahi mila.');
      const v = r['dist-tags']?.latest;
      return m.reply(
        `📦 *${r.name}* v${v}\n📝 ${r.versions[v]?.description || '-'}\n🔗 ${r.versions[v]?.dist?.tarball || ''}`,
      );
    }
    case 'sticker':
    case 's':
      return stickerCmd(m, sock, false);
    case 'tssticker':
    case 'textsticker':
      return textStickerCmd(m, sock);
    case 'attp': {
      if (!m.arg) return m.reply(`❌ Text do. Example: ${config.PREFIX}attp Hello`);
      const out = tmpFile('webp');
      const safe = m.arg.slice(0, 40).replace(/[':%\\]/g, '');
      await run([
        '-y',
        '-f',
        'lavfi',
        '-i',
        'color=c=black:s=512x512:d=1',
        '-vf',
        `drawtext=fontfile=/usr/share/fonts/truetype/freefont/FreeSansBold.ttf:text='${safe}':fontcolor=yellow:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2`,
        '-c:v',
        'libwebp',
        '-quality',
        '85',
        out,
      ]);
      await sock.sendMessage(m.chat, { sticker: fs.readFileSync(out) }, { quoted: m });
      try {
        fs.unlinkSync(out);
      } catch {}
      return;
    }
    case 'upscale1':
    case 'upscale2':
    case 'upscale3':
    case 'upscale4':
    case 'upscale5':
    case 'upscale6':
    case 'upscale7':
    case 'upscale8':
    case 'upscale9':
    case 'upscale10':
    case 'upscale11':
    case 'upscale12':
    case 'upscale13':
    case 'upscale14':
    case 'upscale15':
    case 'upscale16':
      return imageEnhance(m, sock, 'upscale', parseInt(cmd.replace('upscale', '')) / 4);
    case 'enhance1':
    case 'enhance4':
    case 'enhance8':
    case 'enhance16':
      return imageEnhance(m, sock, 'enhance', parseInt(cmd.replace('enhance', '')) / 8);
    case 'colorize':
      return imageEnhance(m, sock, 'colorize', 1);
    case 'unblur':
      return imageEnhance(m, sock, 'unblur', 1);
    case 'remini':
      return imageEnhance(m, sock, 'remini', 2);
    case 'blurface':
      return imageEnhance(m, sock, 'blurface', 1);
    case 'removebg':
    case 'removebg2': {
      const buf = await grabImage(m);
      if (!buf) return m.reply(`❌ Image do ya reply karo (${config.PREFIX}${cmd}).`);
      return m.reply(
        'ℹ️ RemoveBG ke liye remove.bg API key chahiye   owner se key dalwao, phir ye command live ho jayegi.',
      );
    }
  }
}

function pctBar() {
  return Math.floor(Math.random() * 30) + 70 + '%';
}

async function textStickerCmd(m, sock) {
  const txt = (m.arg || '').trim();
  if (!txt) return m.reply(`❌ Text likho. Example: ${config.PREFIX}tssticker Salam`);
  const { execFile } = require('child_process');
  const os = require('os'),
    path = require('path'),
    fs = require('fs');
  const out = path.join(os.tmpdir(), `ts_${Date.now()}.webp`);
  const safe = txt.replace(/[\\':%]/g, ' ').slice(0, 60);
  const font = fs.existsSync('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
    ? '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    : '';
  const vf = `drawtext=${font ? `fontfile=${font}:` : ''}text='${safe}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`;
  await new Promise((res, rej) => {
    execFile(
      'ffmpeg',
      ['-y', '-f', 'lavfi', '-i', 'color=c=0x1f8a70:s=512x512', '-vf', vf, '-frames:v', '1', out],
      (e) => (e ? rej(e) : res()),
    );
  });
  await sock.sendMessage(m.chat, { sticker: fs.readFileSync(out) }, { quoted: m });
  try {
    fs.unlinkSync(out);
  } catch {}
}

async function stickerCmd(m, sock, attp) {
  const msg = m.message?.imageMessage ? m.message : m.quoted?.message;
  if (!msg || (!msg.imageMessage && !msg.videoMessage)) {
    return m.reply(
      `❌ Image/video do. Caption me ${config.PREFIX}sticker likho, ya media par reply karo.`,
    );
  }
  const isVideo = !!msg.videoMessage;
  const stream = await downloadContentFromMessage(
    isVideo ? msg.videoMessage : msg.imageMessage,
    isVideo ? 'video' : 'image',
  );
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  const { toSticker } = require('../lib/functions');
  const webp = await toSticker(Buffer.concat(chunks), isVideo);
  await sock.sendMessage(m.chat, { sticker: webp }, { quoted: m });
}

// REAL ffmpeg image enhancement   upscale/sharpen/color-boost/blur
async function imageEnhance(m, sock, mode, factor) {
  const buf = await grabImage(m);
  if (!buf) return m.reply(`❌ Image do ya reply karo (${config.PREFIX}${m.command}).`);
  await m.reply(`🖼️ *${m.command}* lag raha hy...`);
  const inp = tmpFile('jpg');
  const out = tmpFile('jpg');
  fs.writeFileSync(inp, buf);
  let vf;
  if (mode === 'upscale')
    vf = `scale=iw*${Math.min(4, Math.ceil(factor))}:ih*${Math.min(4, Math.ceil(factor))}:flags=lanczos,unsharp=5:5:1.0`;
  else if (mode === 'enhance') vf = 'unsharp=5:5:1.2,eq=contrast=1.1:saturation=1.15';
  else if (mode === 'colorize') vf = 'eq=saturation=1.4:contrast=1.05,hue=s=1.2';
  else if (mode === 'unblur' || mode === 'remini') vf = 'unsharp=7:7:1.5,eq=contrast=1.08';
  else if (mode === 'blurface') vf = 'boxblur=20:2';
  await run(['-y', '-i', inp, '-vf', vf, out]);
  await sock.sendMessage(
    m.chat,
    { image: fs.readFileSync(out), caption: `✨ *${m.command} done*   ${config.BOT_NAME}` },
    { quoted: m },
  );
  try {
    fs.unlinkSync(inp);
    fs.unlinkSync(out);
  } catch {}
}

const TOOLS_NAMES = Object.keys(SCENES).concat(Object.keys(EMOJI_FX));
const seen = new Set();
module.exports.commands = [
  ...TOOLS_NAMES.filter((n) => !seen.has(n) && seen.add(n)).map((n) => ({
    name: n,
    desc: 'FX tool',
    category: 'TOOLS',
    handler,
  })),
  { name: 'loading', desc: 'Loading animation', category: 'TOOLS', handler },
  { name: 'cd', desc: 'Countdown timer', category: 'TOOLS', handler },
  { name: 'wthr', desc: 'Weather', category: 'TOOLS', handler },
  { name: 'type', desc: 'Typing animation', category: 'TOOLS', handler },
  { name: 'spinner', desc: 'Spinner animation', category: 'TOOLS', handler },
  { name: 'npm', desc: 'npm package info', category: 'TOOLS', handler },
  { name: 'font', desc: 'Fancy font', category: 'TOOLS', handler },
  { name: 'sticker', desc: 'Photo/video → sticker', category: 'TOOLS', handler },
  { name: 'tssticker', desc: 'Text → sticker', category: 'TOOLS', handler },
  { name: 's', desc: 'Sticker (short)', category: 'TOOLS', handler },
  { name: 'attp', desc: 'Text → sticker', category: 'TOOLS', handler },
  ...Array.from({ length: 16 }, (_, i) => ({
    name: `upscale${i + 1}`,
    desc: 'Image upscale',
    category: 'TOOLS',
    handler,
  })),
  { name: 'unblur', desc: 'Image unblur', category: 'TOOLS', handler },
  { name: 'blurface', desc: 'Image blur', category: 'TOOLS', handler },
  { name: 'removebg', desc: 'BG remove (key chahiye)', category: 'TOOLS', handler },
  { name: 'removebg2', desc: 'BG remove (key chahiye)', category: 'TOOLS', handler },
  { name: 'remini', desc: 'Image quality boost', category: 'TOOLS', handler },
  { name: 'enhance1', desc: 'Image enhance', category: 'TOOLS', handler },
  { name: 'enhance4', desc: 'Image enhance', category: 'TOOLS', handler },
  { name: 'enhance8', desc: 'Image enhance', category: 'TOOLS', handler },
  { name: 'enhance16', desc: 'Image enhance', category: 'TOOLS', handler },
  { name: 'colorize', desc: 'Image colorize', category: 'TOOLS', handler },
  ...Array.from({ length: 105 }, (_, i) => ({
    name: `font${i + 1}`,
    desc: `Font style ${i + 1}`,
    category: 'TOOLS',
    handler: (m, sock) => {
      if (!m.arg)
        return m.reply(
          `❌ Text do. Example: ${config.PREFIX}font${m.command.replace('font', '')} SAQIB`,
        );
      return m.reply(fontStyle(parseInt(m.command.replace('font', '')), m.arg.toLowerCase()));
    },
  })),
];
