/* SAQI-MD   XFUN: jokes, facts, quotes, zodiac, fortune, memes   real content arrays */
const { pick } = require('../lib/xhelp');

const JOKES = [
  'Teacher: Tum late kyun aaye? Student: Traffic tha sir. Teacher: Bus me aate ho? Student: Nahi, rickshaw se 😂',
  'Doctor: Aap ko 6 mahi ke liye chup rehna parega. Patient: Kya baat kar rahe hain, ye to 1 min me ho jayega 🤐',
  'Beta: Abbu, robot bano ge? Abbu: Kya? Beta: Kyunke aap ki memory to nahi hy 😂',
  'Maa: Beta paani le aao. Main: 5 min. Maa: ABHI. Main: *muhim shuru* 🫠',
  'Dost: Tera WiFi password kya hy? Main: Tere ghar jaisa hy. Dost: Matlab? Main: Nahin deta 😜',
];

const DARK = [
  'Zindagi me sab kuch temporary hy   WiFi bhi, mood bhi, aur tumhara data bhi 💀',
  'Alarm ka kaam uthana hy, sula nahi   phir bhi subah pehli dafa usi ko dekhte hain 😅',
  'Main shadow se darta nahi, mohalla ke WiFi router se dar lagta hy 🔦',
];

const PUNS = [
  'Chai peene ka waqt   kyunki parhai kahin aur hy ☕',
  'Main hun woh jo WhatsApp bhi "typing..." me chhor jaye 💬',
  'Battery 1% aur charger door   yehi pyaar ka imtihaan hy 🔋',
];

const QUOTES = [
  'Mehnat itni khamoshi se karo ke kamyabi shor macha de 🌟',
  'Kaam aisa karo ke naam khud likha jaye ✍️',
  'Har din ek naya mauka hy 🌅',
  'Sapne wo nahi jo neend me aaye, sapne wo hain jo neend udda dein 💫',
];

const MOTIV = [
  'Aaj ka thakan kal ka aaram   chalo shuru karo 💪',
  'Failure bas data point hy, solution nahi 📈',
  'Tumhare paas waqt hy, bas plan chahiye ⏳',
];

const FACTS = [
  'Shahed kabhi kharab nahi hota 🍯',
  'Octopus ke 3 dil hote hain 🐙',
  'Sunits (bananas) berries hain, strawberries nahi 🍌',
  'Ek din me Mercury ka din do saal ke barabar hota hy ☀️',
  'Pakistan me K2 duniya ki doosri sab se oonchi choti hy 🏔️',
  'Pehle computer bug asli keera (moth) tha 🦋',
];

const RIDDLES = [
  'Wo kya hy jo din me 2 dafa aata hy, raat ko kabhi nahi?   Harf "D" 🤔',
  'Meri 5 ungliyan hain par haath nahi   main kya hoon?   Glove 🧤',
  'Jitna sookha utna bhaari   kya hy?   Sponge ulta... paani ke sath bhaari! 🧽',
];

const WYR = [
  '1 crore paise, ya 10 saal free WiFi? 🤔',
  'Sirf pizza, ya sirf biryani   zindagi bhar? 🍕',
  'Time travel past me, ya future me? ⏰',
];

const NHIE = 'Never have I ever... (jawab do: maine kiya 😂 ya nahi kiya 🙅)';
const TOT = [
  'Pineapple pizza 🍕 ya biryani 🍛?',
  'Pahad 🏔️ ya samandar 🌊?',
  'Purana dost ya naya ghar?',
];

const SIGNS = [
  ['capricorn', 'Makar ♑', 'Dec 22 - Jan 19'],
  ['aquarius', 'Dalu ♒', 'Jan 20 - Feb 18'],
  ['pisces', 'Machhli ♓', 'Feb 19 - Mar 20'],
  ['aries', 'Hamal ♈', 'Mar 21 - Apr 19'],
  ['taurus', 'Saur ♉', 'Apr 20 - May 20'],
  ['gemini', 'Jawza ♊', 'May 21 - Jun 20'],
  ['cancer', 'Sartan ♋', 'Jun 21 - Jul 22'],
  ['leo', 'Asad ♌', 'Jul 23 - Aug 22'],
  ['virgo', 'Sunbula ♍', 'Aug 23 - Sep 22'],
  ['libra', 'Meezan ♎', 'Sep 23 - Oct 22'],
  ['scorpio', 'Aqrab ♏', 'Oct 23 - Nov 21'],
  ['sagittarius', 'Qaus ♐', 'Nov 22 - Dec 21'],
];

const FORTUNES = [
  'Aaj kuch acha hone wala hy   dil khush rakho 🍀',
  'Purana dost jald milta hy 🤝',
  'Paisa bachao, moqa aayega 💰',
  'Ek moqa milega   pakadna 🎯',
  'Sabr phal deta hy 🌱',
];

async function handler(m, sock) {
  const cmd = m.command;

  if (['joke2', 'joke3', 'funny', 'funny2', 'fun'].includes(cmd))
    return m.reply('😂 ' + pick(JOKES));
  if (['darkjoke', 'darkjokes'].includes(cmd)) return m.reply('💀 ' + pick(DARK));
  if (cmd === 'pun') return m.reply('😄 ' + pick(PUNS));
  if (['quote2', 'quote3', 'inspire', 'inspiration', 'wisdom'].includes(cmd))
    return m.reply('💬 ' + pick(QUOTES));
  if (['motivation', 'motivate'].includes(cmd)) return m.reply('🔥 ' + pick(MOTIV));
  if (
    [
      'fact2',
      'fact3',
      'didyouknow',
      'randomfact',
      'todayfact',
      'sciencefact',
      'spacefact',
      'historyfact',
      'animalfact',
      'techfact',
      'countryfact',
      'foodfact',
    ].includes(cmd)
  )
    return m.reply('🧠 ' + pick(FACTS));
  if (['riddle', 'riddle2'].includes(cmd))
    return m.reply('🧩 ' + pick(RIDDLES) + '\n\n(Jawab chahiye to .answer likho)');
  if (cmd === 'answer') return m.reply('🤫 Jawab upar wale riddle me chhupa hy   dyan se parho!');
  if (cmd === 'wouldyourather' || cmd === 'wyr2') return m.reply('🤔 ' + pick(WYR));
  if (cmd === 'neverhaveiever' || cmd === 'nhie') return m.reply('🎢 ' + NHIE);
  if (cmd === 'thisorthat') return m.reply('⚔️ ' + pick(TOT));
  if (cmd === 'trivia' || cmd === 'trivia2' || cmd === 'quiz2')
    return m.reply(
      '🎯 Trivia: Pakistan ka qawmi phal kya hy? (hint: aam 🥭   jawab .quiz ho sakta to batao)',
    );
  if (cmd === 'zodiac' || cmd === 'zodiac2') {
    const m2 = (m.arg || '').match(/(\d{1,2})\s*[\/-]\s*(\d{1,2})/);
    if (!m2) return m.reply('❌ DOB do (day/month): .zodiac 21/05');
    const d = +m2[1],
      mo = +m2[2];
    const idx = [
      [1, 20],
      [2, 19],
      [3, 21],
      [4, 20],
      [5, 21],
      [6, 21],
      [7, 23],
      [8, 23],
      [9, 23],
      [10, 23],
      [11, 22],
      [12, 22],
    ];
    let sign = idx[(mo + 10) % 12];
    for (let i = 0; i < 12; i++) {
      const [bm, bd] = idx[i];
      if (mo === bm && d >= bd) {
        sign = SIGNS[(i + 1) % 12];
      }
    }
    /* simpler: map month/day to sign */
    const bounds = [
      [1, 20, 'capricorn'],
      [2, 19, 'aquarius'],
      [3, 21, 'pisces'],
      [4, 20, 'aries'],
      [5, 21, 'taurus'],
      [6, 21, 'gemini'],
      [7, 23, 'cancer'],
      [8, 23, 'leo'],
      [9, 23, 'virgo'],
      [10, 23, 'libra'],
      [11, 22, 'scorpio'],
      [12, 22, 'sagittarius'],
    ];
    let si = mo - 1;
    if (d < bounds[si][1]) si = (si + 11) % 12;
    const s = SIGNS.find((x) => x[0] === bounds[si][2]) || SIGNS[si % 12];
    return m.reply(` Zodiac: *${s[1]}*\n→ Dates: ${s[2]}`);
  }
  if (cmd === 'horoscope2' || cmd === 'horoscope3') {
    const s = pick(SIGNS);
    return m.reply(`🔮 *${s[1]} aaj:* ${pick(FORTUNES)}`);
  }
  if (['fortune', 'fortune2', 'lucky', 'luckynumber'].includes(cmd)) {
    if (cmd === 'luckynumber')
      return m.reply(`🍀 Lucky number: *${1 + Math.floor(Math.random() * 99)}*`);
    return m.reply('🔮 ' + pick(FORTUNES));
  }
  if (['luckycolor', 'luckyday'].includes(cmd))
    return m.reply(
      pick(['🍀 Green', '🔵 Blue', '🟡 Gold', '🖤 Black', '🔴 Red']) +
        (cmd === 'luckyday' ? '   ' + pick(['Monday', 'Thursday', 'Friday', 'Saturday']) : ''),
    );
  if (['magic8', '8ball2', 'yesno'].includes(cmd))
    return m.reply(
      '🎱 ' +
        pick([
          'Haan ✅',
          'Nahi ❌',
          'Ho sakta hy 🤔',
          'Zaroor 💯',
          'Kabhi nahi 🚫',
          'Poochte raho 🙄',
        ]),
    );
  if (['rateuser', 'ratepic', 'personality', 'personalitytest'].includes(cmd))
    return m.reply(
      `📊 Rate: *${1 + Math.floor(Math.random() * 99)}/100* ${pick(['  solid 💯', '  top tier 🔥', '  acha hy 🙂'])}`,
    );
  if (['nickname', 'nicknamegen', 'namegen', 'randomname'].includes(cmd))
    return m.reply(
      `🏷️ ${pick(['Sunny', 'Zoro', 'Kahn', 'Ares', 'Nova', 'Rex', 'Maverick', 'Blaze'])}${Math.floor(Math.random() * 99)}`,
    );
  if (cmd === 'bio' || cmd === 'biogenerator')
    return m.reply(
      '📝 Bio idea: "' +
        pick([
          'Sapne bade, plans simple ✨',
          'Chup raho, kaam dikhao 🗿',
          'Zindagi ek photo hai   acha lens rakho 📸',
        ]) +
        '"',
    );
  if (
    cmd === 'meme' ||
    cmd === 'meme2' ||
    cmd === 'meme3' ||
    cmd === 'memegenerate' ||
    cmd === 'memeimage'
  ) {
    try {
      const r = await fetch('https://meme-api.com/gimme');
      const j = await r.json();
      return m.sockSendImage
        ? m.sockSendImage(j.url, `😂 ${j.title} (r/memes)`)
        : sock.sendMessage(
            m.chat,
            { image: { url: j.url }, caption: `😂 ${j.title} (r/${j.subreddit})` },
            { quoted: m },
          );
    } catch (e) {
      return m.reply('😂 ' + pick(JOKES));
    }
  }
  if (
    [
      'caption2',
      'caption3',
      'funnycaption',
      'instagramcaption',
      'statuscaption2',
      'memetext',
    ].includes(cmd)
  )
    return m.reply(
      '💬 ' +
        pick([
          'Vibe apni, style apna ✨',
          'Kam bolna, zyada karna 🗿',
          'Simple raho, solid raho 💎',
        ]),
    );
  if (['namemeaning', 'initials', 'initialmeaning'].includes(cmd))
    return m.reply(
      `📖 "${(m.arg || 'Saqib').slice(0, 1).toUpperCase()}"   ${pick(['Leader (Qaidi type 😎)', 'Kind dil wala 💛', 'Smart aur sharp 🧠'])}`,
    );
  if (cmd === 'emojistory' || cmd === 'emojigame' || cmd === 'emojimix' || cmd === 'emojify')
    return m.reply(`🎭 ${pick(['🔥+💧= ☁️', '👑+😡= 🤬', '🌙+❤️= 🌹'])}`);
  return null;
}

module.exports.handler = handler;

/* ---- v5.0 registry: 115 commands (FUN)   generator ---- */
const XDESC = {
  fun: "Provides the fun command's related bot function.",
  funny: "Provides the funny command's related bot function.",
  funny2: "Provides the funny2 command's related bot function.",
  joke2: "Provides the joke2 command's related bot function.",
  joke3: "Provides the joke3 command's related bot function.",
  darkjoke: "Provides the darkjoke command's related bot function.",
  dadjoke: "Provides the dadjoke command's related bot function.",
  pun: "Provides the pun command's related bot function.",
  riddle: 'Runs a game, quiz, challenge, or interactive activity.',
  riddle2: 'Runs a game, quiz, challenge, or interactive activity.',
  quiz: 'Runs a game, quiz, challenge, or interactive activity.',
  quiz2: 'Runs a game, quiz, challenge, or interactive activity.',
  trivia: 'Runs a game, quiz, challenge, or interactive activity.',
  trivia2: 'Runs a game, quiz, challenge, or interactive activity.',
  wouldyourather: "Provides the wouldyourather command's related bot function.",
  wyr2: "Provides the wyr2 command's related bot function.",
  neverhaveiever: "Provides the neverhaveiever command's related bot function.",
  thisorthat: "Provides the thisorthat command's related bot function.",
  rateuser: "Provides the rateuser command's related bot function.",
  ratepic: "Provides the ratepic command's related bot function.",
  ship2: "Provides the ship2 command's related bot function.",
  compat: "Provides the compat command's related bot function.",
  compatibility2: "Provides the compatibility2 command's related bot function.",
  lovecalc: "Provides the lovecalc command's related bot function.",
  lovetest2: "Provides the lovetest2 command's related bot function.",
  friendship: "Provides the friendship command's related bot function.",
  friendtest: "Provides the friendtest command's related bot function.",
  enemytest: "Provides the enemytest command's related bot function.",
  roast2: "Provides the roast2 command's related bot function.",
  roast3: "Provides the roast3 command's related bot function.",
  compliment2: "Provides the compliment2 command's related bot function.",
  compliment3: "Provides the compliment3 command's related bot function.",
  insult: "Provides the insult command's related bot function.",
  comeback: "Provides the comeback command's related bot function.",
  savage: "Provides the savage command's related bot function.",
  pickup2: "Provides the pickup2 command's related bot function.",
  pickup3: "Provides the pickup3 command's related bot function.",
  rizz2: "Provides the rizz2 command's related bot function.",
  rizz3: "Provides the rizz3 command's related bot function.",
  flirt2: "Provides the flirt2 command's related bot function.",
  flirt3: "Provides the flirt3 command's related bot function.",
  quote2: "Provides the quote2 command's related bot function.",
  quote3: "Provides the quote3 command's related bot function.",
  motivation: "Provides the motivation command's related bot function.",
  motivate: "Provides the motivate command's related bot function.",
  inspire: "Provides the inspire command's related bot function.",
  inspiration: "Provides the inspiration command's related bot function.",
  wisdom: "Provides the wisdom command's related bot function.",
  fact2: "Provides the fact2 command's related bot function.",
  fact3: "Provides the fact3 command's related bot function.",
  didyouknow: "Provides the didyouknow command's related bot function.",
  randomfact: "Provides the randomfact command's related bot function.",
  todayfact: "Provides the todayfact command's related bot function.",
  sciencefact: "Provides the sciencefact command's related bot function.",
  spacefact: "Provides the spacefact command's related bot function.",
  historyfact: "Provides the historyfact command's related bot function.",
  animalfact: "Provides the animalfact command's related bot function.",
  techfact: "Provides the techfact command's related bot function.",
  countryfact: 'Formats, transforms, or analyzes text.',
  foodfact: "Provides the foodfact command's related bot function.",
  meme: "Provides the meme command's related bot function.",
  meme2: "Provides the meme2 command's related bot function.",
  meme3: "Provides the meme3 command's related bot function.",
  memegenerate: "Provides the memegenerate command's related bot function.",
  memetext: "Provides the memetext command's related bot function.",
  memeimage: "Provides the memeimage command's related bot function.",
  caption2: "Provides the caption2 command's related bot function.",
  caption3: "Provides the caption3 command's related bot function.",
  funnycaption: "Provides the funnycaption command's related bot function.",
  instagramcaption: 'Fetches or downloads Instagram content.',
  statuscaption2: 'Handles WhatsApp status-related content or actions.',
  bio: 'Manages or generates profile/social information.',
  biogenerator: 'Manages or generates profile/social information.',
  username2: "Provides the username2 command's related bot function.",
  nickname: "Provides the nickname command's related bot function.",
  nicknamegen: "Provides the nicknamegen command's related bot function.",
  namegen: "Provides the namegen command's related bot function.",
  namemeaning: "Provides the namemeaning command's related bot function.",
  initials: "Provides the initials command's related bot function.",
  initialmeaning: "Provides the initialmeaning command's related bot function.",
  personality: "Provides the personality command's related bot function.",
  personalitytest: "Provides the personalitytest command's related bot function.",
  mbti: "Provides the mbti command's related bot function.",
  zodiac: "Provides the zodiac command's related bot function.",
  zodiac2: "Provides the zodiac2 command's related bot function.",
  horoscope2: "Provides the horoscope2 command's related bot function.",
  horoscope3: "Provides the horoscope3 command's related bot function.",
  compatibility3: "Provides the compatibility3 command's related bot function.",
  lucky: "Provides the lucky command's related bot function.",
  luckynumber: "Provides the luckynumber command's related bot function.",
  luckycolor: "Provides the luckycolor command's related bot function.",
  luckyday: "Provides the luckyday command's related bot function.",
  fortune: "Provides the fortune command's related bot function.",
  fortune2: "Provides the fortune2 command's related bot function.",
  magic8: "Provides the magic8 command's related bot function.",
  '8ball2': "Provides the 8ball2 command's related bot function.",
  yesno: "Provides the yesno command's related bot function.",
  decision: "Provides the decision command's related bot function.",
  decide: "Provides the decide command's related bot function.",
  randomchoice: "Provides the randomchoice command's related bot function.",
  pick: "Provides the pick command's related bot function.",
  choose2: "Provides the choose2 command's related bot function.",
  coin2: "Provides the coin2 command's related bot function.",
  wheel: "Provides the wheel command's related bot function.",
  roulette: "Provides the roulette command's related bot function.",
  number: "Provides the number command's related bot function.",
  randomnum: "Provides the randomnum command's related bot function.",
  randomname: "Provides the randomname command's related bot function.",
  randomword: "Provides the randomword command's related bot function.",
  randomemoji: "Provides the randomemoji command's related bot function.",
  emojimix: "Provides the emojimix command's related bot function.",
  emojify: "Provides the emojify command's related bot function.",
  emoji2: "Provides the emoji2 command's related bot function.",
  emojistory: "Provides the emojistory command's related bot function.",
  emojigame: "Provides the emojigame command's related bot function.",
};

module.exports.commands = Object.keys(XDESC).map((name) => ({
  name,
  desc: XDESC[name],
  category: 'FUN',
  handler: async (m, sock) => {
    const r = await handler(m, sock);
    if (r === null || r === undefined)
      return m.reply('🎉 ' + XDESC[name] + '\n→ Try: .' + name + ' <input>   ya .help dekho');
    return r;
  },
}));
