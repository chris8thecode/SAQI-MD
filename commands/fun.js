/* SAQI-MD — FUN: roasts, relationship, react actions, games — sara offline/text-based.
 * .muth deliberately NAHI hy. boydp/girldp placeholder hain (files owner ke pas nahi).
 */
const config = require('../config');
const { animeImage } = require('../lib/anime-pack');
const { pick, targetOf, mentionReply, pct } = require('../lib/helpers');

const ROASTS = ['Tumhari tarah main bhi soch raha tha ke zindagi me kuch karna hy... phir maine sochna chhor diya. 😂', 'Wifi ka signal bhi tumse zyada strong hy. 📶', 'Tumhari profile photo dekh ke meri camera ne resign de diya. 📸', 'Tum utne slow ho ke snail bhi keh de "bhai race mat jeeto ge". 🐌', 'Brain chahiye tha tumhe, tumne WiFi router le liya. 🧠'];
const COMPLIMENTS = ['Tum wo ho jiske aane se group ki vibe theek ho jati hy ✨', 'Smile to dekho, sasta sunblock lag jata hy ☀️', 'Tumhari tarif me itni lambi list hy ke WhatsApp character limit maan gayi 💯'];
const QUOTES = ['Kaam aisa karo ke naam khud likha jaye. — Anonymous', 'Mushkilein sirf unhe milti hain jo kuch karna chahte hain. 🌱', 'Sabr phal meetha hota hy, bas waqt lambe rehte hain. ⏳'];
const SHAYARI = ['Chand ko dekh kar yeh mat samajh,\nke raat khatam ho gayi hy,\nab to bas tumhara message aana baqi hy. 🌙', 'Tere naam se shuru hota hy mera din,\naur tere "seen" hone par mukammal. 💬', 'Zindagi ki bhag-daur me ek lamha ruk jao,\njine ke liye kuch pal khud ke liye nikalo. 🌸'];
const JOKES = ['Doctor: Tension nahi lena chahiye. Patient: Main to doctor se share kar raha hoon, aap lena chhoro. 😂', 'Teacher: Kal test hy. Student: Kal se parhta hoon. Aaj mood nahi. 😅', 'WiFi ke samne baithe ho to tum bhi 5G speed se bhagte ho... khane tak. 🍽️'];
const FACTS = ['octopus ke 3 dil hote hain 🐙', 'Shahed kabhi kharab nahi hota 🍯', 'Eiffel Tower sirf 6 mah ke liye banai gayi thi 🗼', 'Dolphin ek aankh khol kar soti hy 🐬', 'Pakistan me world ki sab se gehri line K2 hy 🏔️'];
const G8 = ['Hy ✅', 'Nahi ❌', 'Kabhi nahi 🚫', 'Zaroor 💯', 'Poochhte hi raho 🙄', 'Ho sakta hy 🤔', 'Mera jawab hy: HAAN! 🔥'];
const DARES = ['Apni last photo group me bhejo 😈', '5 min ke liye apna status "Main pagal hoon" lagao 😂', 'Kisi ajnabi ko "Salam bhai" likho 😆'];
const TRUTHS = ['Sab se embarrassing message kisko bheja? 👀', 'Aakhri dafa roya kab tha? 😅', 'Aik raaz batao jo ab tak kisi ko nahi pata? 🤫'];
const RIZZ = ['Kya aap WiFi ho? Kyunke connection acha lagta hy 📶', 'Google par maine search kiya tha, aap hi mil gaye 🌐', 'Aapki smile ka screenshot mere gallery ka best photo hy 📸'];
const PICKUPS = ['Excuse me, kya aap parking ka space ho? Kyunke main tumhare liye gira raha hoon 🚗', 'Kya tumhara dil WiFi hy? Signal bohat strong hy 📶', 'Naam kya hy?... nahi batana, main tumhe apni dua me lunga 🤲'];
const FLIRTS = ['Tumhari aankhon me dekha to time ruk gaya ⏱️', 'Tum India ki Google ho — sab kuch milta hy tumse 🇮🇳', 'Tumhare bina din adhura, message bina to zindagi 💌'];
const SIGMA_LINES = ['🗿 Sigma rule #1: Chup raho, kaam dikhao', '🗿 Sigma rule #47: Reply late, respect high', '🗿 Sigma rule #99: Aura lose mat karo'];
const HOROSCOPE = ['Aaj din acha jayega — kaam pehle, bakwas baad 🌞', 'Koi purana dost message karega 💬', 'Paisa bachao, mood banao 💰', 'Aaj sabr ka imtihaan — chill raho 🧘'];

// rishtedar commands: "X = tumhara Y"
const RELATIONS = {
  dad: 'DAD 👨', mom: 'MOM 👩', son: 'SON 👦', daughter: 'DAUGHTER 👧', boyfriend: 'BOYFRIEND 💙',
  girlfriend: 'GIRLFRIEND 💖', twin: 'TWIN 👯', partner: 'PARTNER 🤝', bodyguard: 'BODYGUARD 🕶️',
  boss: 'BOSS 😎', employee: 'EMPLOYEE 💼', pet: 'PET 🐾', servant: 'SERVANT 🧹', idol: 'IDOL ⭐',
  fan: 'FAN 🙌', ghost: 'GHOST 👻', angel: 'ANGEL 😇', devil: 'DEVIL 😈', king: 'KING 👑',
  queen: 'QUEEN 👸', slave: 'SLAVE ⛓️', master: 'MASTER 🎩', genius: 'GENIUS 🧠', fool: 'FOOL 🤡',
  rich: 'RICH 💰', poor: 'POOR 🥺', bhai: 'BHAI 🤜🤛', bahan: 'BAHAN 💐', wife: 'WIFE 💍',
  husband: 'HUSBAND 💑', chacha: 'CHACHA 👴', chachi: 'CHACHI 👵', nana: 'NANA 👴', nani: 'NANI 👵',
  mama: 'MAMA 🧔', mami: 'MAMI 👩', bestfriend: 'BESTFRIEND 🫂', enemy: 'ENEMY ⚔️', crush: 'CRUSH 💘',
  teacher: 'TEACHER 📚', student: 'STUDENT ✏️', rival: 'RIVAL 🔥', runmureed: 'RUNMUREED 🙏', bacha: 'BACHA 👶',
  bachi: 'BACHI 👧', technologica: 'TECHNOLOGIA 🤖', taroun: 'TAROT READER 🔮', cake: 'CAKE 🎂', chumi: 'CHUMI 🤏',
};

async function handler(m, sock) {
  const cmd = m.command;
  const who = targetOf(m).split('@')[0];

  // rishtedar + react-style actions
  if (RELATIONS[cmd]) {
    return mentionReply(m, sock, `🏷️ @${who} tumhara *${RELATIONS[cmd]}* hy! ${pick(['Mubarak ho 😂', 'Congrats 🎉', 'Wow 🎊'])}`);
  }
  if (['hug','kiss','slap','punch','pat','wave','poke','highfive','highfives','dance','laugh','cry','smile','wink','blush','angry','sad','sleep','stare','confused','bored','yawn','shocked','scared','surprised','shy','cool','celebrate','yay','run','think','bite','feed','cuddle','facepalm','shoot','clap','salute','thumbsup','yes','no','sorry','happy','nod','nope','shake','handshake','carry','tickle','smug','pout','tired','sigh','sip','bleh','nom','nya','peck','teehee','teehhee','yeet','kill','bully','cringe','glomp','bonk','baka','kabedon','nuzzle','headbang','nosebleed','tableflip','spin','shrug','lurk','blowkiss','handhold','stop','chumi'].includes(cmd)) {
    return mentionReply(m, sock, `@${who} ${cmd} 😂`);
  }

  switch (cmd) {
    case 'roast': return mentionReply(m, sock, `🔥 @${who}\n${pick(ROASTS)}`);
    case 'compliment': return mentionReply(m, sock, `@${who} ${pick(COMPLIMENTS)}`);
    case 'quote': return m.reply(`💬 *Quote:*\n\n${pick(QUOTES)}`);
    case 'shayari': return m.reply(`🌹 *Shayari:*\n\n${pick(SHAYARI)}`);
    case 'joke': return m.reply(`😂 ${pick(JOKES)}`);
    case 'fact': return m.reply(`🧠 *Fact:* ${pick(FACTS)}`);
    case '8ball': return m.arg ? m.reply(`🎱 *${m.arg}*\n\n${pick(G8)}`) : m.reply('❌ Sawal likho: .8ball kya main pass ho jaon ga?');
    case 'lovetest': case 'ship': case 'compatibility': case 'shipname': case 'marige': {
      const [a, b] = m.arg.split(/,|&|vs|and/i).map(x => x && x.trim()).filter(Boolean);
      if (!a || !b) return m.reply(`❌ Do naam do. Example: ${config.PREFIX}${cmd} Ali, Sana`);
      const p = pct(50, 100);
      return m.reply(`💕 *${a} 💘 ${b}*\n\n${'❤️'.repeat(Math.ceil(p / 20))} *${p}%*\n${p > 80 ? 'Shaadi ka laddu tod lo! 🎉' : 'Achi jori hy, mashallah 😄'}`);
    }
    case 'aura': return mentionReply(m, sock, `@${who} ⚡ *AURA: ${pct(1000, 9999)}*\n${pick(['SIGMA level! 🗿', 'Aur aura kamana hy to kaam karo 💪'])}`);
    case 'rate': case 'character': case 'npc': case 'maincharacter': case 'chad': case 'simp': case 'delulu':
      return mentionReply(m, sock, `@${who} ⭐ *${cmd.toUpperCase()} score: ${pct(60, 100)}/100* ${pct(60, 100) > 85 ? '🏆' : '💯'}`);
    case 'sigma': return m.reply(`🗿 *SIGMA CHECK*\n\nSigma level: ${pct(60, 100)}/100\n${pick(SIGMA_LINES)}`);
    case 'truth': return m.reply(`🕵️ *TRUTH:* ${pick(TRUTHS)}`);
    case 'dare': return m.reply(`😈 *DARE:* ${pick(DARES)}`);
    case 'wyr': return m.reply(`🤔 *Would You Rather:*\n\n1️⃣ Ameer ho kar akela raho\n2️⃣ Gareeb ho kar sab ke sath raho\n\nReply karo kaunsa chunti ho!`);
    case 'rizz': return m.reply(`😏 *Rizz line:*\n\n"${pick(RIZZ)}"`);
    case 'flirt': return m.reply(`😜 *Flirt:*\n\n${pick(FLIRTS)}`);
    case 'pickup': return m.reply(`💬 *Pickup line:*\n\n${pick(PICKUPS)}`);
    case 'vibe': return m.reply(`🌈 *Vibe check: ${pct(50, 100)}%*\n${pick(['Vibing 🎵', 'Chill mode 🧊', 'Full josh 🔥'])}`);
    case 'redflag': return mentionReply(m, sock, `@${who} 🚩 *RED FLAG detected: ${pct(30, 99)}%*`);
    case 'greenflag': return mentionReply(m, sock, `@${who} 🟢 *GREEN FLAG: ${pct(60, 100)}%*`);
    case 'horoscope': return m.reply(`🔮 *Horoscope (${pick(['Aries','Taurus','Gemini','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces','Cancer'])}):*\n\n${pick(HOROSCOPE)}`);
    case 'dice': return m.reply(`🎲 Dice: *${Math.floor(Math.random() * 6) + 1}*`);
    case 'coin': return m.reply(`🪙 Coin: *${Math.random() < 0.5 ? 'HEADS' : 'TAILS'}*`);
    case 'repeat': return m.arg ? m.reply(`${m.arg}\n`.repeat(1) + `(x1 — spam nahi karte 😄)`) : m.reply('❌ Text do.');
    case 'emoji': case 'emix': {
      const e1 = m.arg.split(/\s+/)[0] || '😀';
      const e2 = m.arg.split(/\s+/)[1] || '❤️';
      return m.reply(`🧪 *${e1} + ${e2} =*\n\n${pick([`${e1}${e2}`, `${e2}${e1}`, `${e1}${e1}${e2}`, `💥 ${e1}${e2}`])}`);
    }
    case 'img': {
      try {
        const r = await fetch('https://picsum.photos/1200/800.json').catch(() => null);
        const url = r ? (await r.json()).url || `https://picsum.photos/seed/${Date.now()}/1200/800` : `https://picsum.photos/seed/${Date.now()}/1200/800`;
        return sock.sendMessage(m.chat, { image: { url }, caption: `🖼️ Random image — ${config.BOT_NAME}` }, { quoted: m });
      } catch { return m.reply(`🖼️ https://picsum.photos/seed/${Date.now()}/1200/800`); }
    }
    case 'cosplay': case 'animegirl': case 'animegirl1': case 'animegirl2': case 'animegirl3': case 'animegirl4': case 'animegirl5': {
      const img = animeImage();
      if (!img) return m.reply('❌ Image pack mojood nahi.');
      return sock.sendMessage(m.chat, { image: { url: img }, caption: `🌸 ${config.BOT_NAME}` }, { quoted: m });
    }
    case 'dog': {
      try {
        const r = await fetch('https://dog.ceo/api/breeds/image/random').then(r => r.json());
        return sock.sendMessage(m.chat, { image: { url: r.message }, caption: '🐕 Woof!' }, { quoted: m });
      } catch { return m.reply('❌ API down hy.'); }
    }
    case 'boydp1': case 'boydp2': case 'boydp3': case 'boydp4': case 'boydp5': case 'boydp6': case 'boydp7': case 'boydp8': case 'boydp9': case 'boydp10': case 'boydp11': case 'boydp12': case 'boydp13': case 'boydp14': case 'boydp15': case 'boydp16': case 'boydp17': case 'boydp18': case 'boydp19': case 'boydp20': case 'boydp21': case 'boydp22':
    case 'girldp1': case 'girldp2': case 'girldp3': case 'girldp4': case 'girldp5': case 'girldp6': case 'girldp7': case 'girldp8': case 'girldp9': case 'girldp10': case 'girldp11': case 'girldp12': case 'girldp13': case 'girldp14': case 'girldp15': case 'girldp16': case 'girldp17': case 'girldp18': case 'girldp19': case 'girldp20': case 'girldp21': case 'girldp22':
      return m.reply(`📭 *${cmd}* ki DP files owner ke pas abhi nahi hyn — jald aayengi. Tab tak .animegirl ya .waifu try karo 🌸`);
    case 'shoot': return mentionReply(m, sock, `🔫 @${who} ko shoot kar diya! 💥`);
    default:
      return m.reply('❓ Unknown fun command');
  }
}

const NAMES = [
  'character','img','emix','compatibility','aura','roast','8ball','compliment','lovetest','emoji','ship',
  'dad','mom','son','daughter','boyfriend','girlfriend','twin','partner','bodyguard','boss','employee',
  'pet','servant','idol','fan','ghost','angel','devil','king','queen','slave','master','fool',
  'rich','poor','bhai','bahan','wife','husband','chacha','chachi','nana','nani','mama','mami','bestfriend',
  'enemy','crush','teacher','student','rival','runmureed','flirt','quote','cosplay','joke','bacha','bachi',
  'technologia','technologica','taroun','cake','pickup','sigma','rizz','simp','vibe','rate','shipname','dice','coin','fact',
  'chad','npc','maincharacter','delulu','redflag','greenflag','truth','dare','wyr','horoscope','lurk','marige',
  'shoot','sleep','clap','shrug','stare','wave','poke','confused','smile','peck','wink','sip','blush','smug',
  'tickle','yeet','think','highfive','feed','bite','teehee','teehhee','shocked','bleh','bored','nom','nya','yawn',
  'facepalm','cuddle','happy','carry','hug','kabedon','baka','bonk','pat','angry','spin','shake','run','nod',
  'nope','kiss','dance','punch','handshake','slap','cry','pout','blowkiss','handhold','salute','thumbsup',
  'laugh','tableflip','yes','no','stop','sorry','sad','scared','surprised','tired','sigh','shy','nuzzle',
  'cool','celebrate','yay','headbang','nosebleed','bully','cringe','kill','glomp','chumi',
  ...Array.from({ length: 22 }, (_, i) => `boydp${i + 1}`),
  ...Array.from({ length: 22 }, (_, i) => `girldp${i + 1}`),
  'muth','repeat','shayari','animegirl','animegirl1','animegirl2','animegirl3','animegirl4','animegirl5','dog',
];

// dedupe (yes/no/duplicate entries)
const seen = new Set();
module.exports.commands = NAMES.filter(n => !seen.has(n) && seen.add(n)).map(name => ({
  name, desc: 'Fun command', category: 'FUN', handler,
}));
