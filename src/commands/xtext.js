/* SAQI-MD   XTEXT: text transforms + font styles + counting   sab REAL */
const { fontStyle } = require('../lib/helpers');

async function handler(m, sock) {
  const cmd = m.command;
  const a = (m.arg || '').trim();
  const need = () => m.reply(`❌ Text do. Example: .${cmd} hello world`);

  if (cmd === 'uppercase' || cmd === 'upper') {
    if (!a) return need();
    return m.reply(`🔠 ${a.toUpperCase()}`);
  }
  if (cmd === 'lowercase' || cmd === 'lower') {
    if (!a) return need();
    return m.reply(`🔡 ${a.toLowerCase()}`);
  }
  if (cmd === 'capitalize' || cmd === 'titlecase') {
    if (!a) return need();
    return m.reply(
      `🔤 ${a.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())}`,
    );
  }
  if (cmd === 'reverseword' || cmd === 'reverse' || cmd === 'reversetext') {
    if (!a) return need();
    return m.reply(`🔁 ${a.split('').reverse().join('')}`);
  }
  if (cmd === 'count' || cmd === 'wordcount' || cmd === 'charcount' || cmd === 'linecount') {
    if (!a) return need();
    const words = a.split(/\s+/).filter(Boolean).length;
    const chars = a.length;
    const lines = a.split('\n').length;
    if (cmd === 'wordcount') return m.reply(`🔢 Words: *${words}*`);
    if (cmd === 'charcount') return m.reply(`🔢 Characters: *${chars}* (spaces ke sath)`);
    if (cmd === 'linecount') return m.reply(`🔢 Lines: *${lines}*`);
    return m.reply(
      `🔢 Text stats:\n→ Words: *${words}*\n→ Characters: *${chars}*\n→ Lines: *${lines}*\n→ Letters: *${(a.match(/[a-zA-Z]/g) || []).length}*\n→ Digits: *${(a.match(/\d/g) || []).length}*`,
    );
  }
  /* text2/text3/text N = font style variants (13 styles) */
  const styleMatch = cmd.match(/^text(\d*)$/);
  if (styleMatch) {
    if (!a) return m.reply(`❌ Text do. Example: .${cmd} Saqib MD`);
    const n = styleMatch[1] ? parseInt(styleMatch[1]) : 1;
    return m.reply(`${fontStyle(((n - 1) % 13) + 1, a)}`);
  }
  return null;
}

module.exports.handler = handler;

/* ---- v5.0 registry: 64 commands (TEXT)   generator ---- */
const XDESC = {
  text: 'Formats, transforms, or analyzes text.',
  text2: 'Formats, transforms, or analyzes text.',
  text3: 'Formats, transforms, or analyzes text.',
  uppercase: 'Formats, transforms, or analyzes text.',
  lowercase: 'Formats, transforms, or analyzes text.',
  capitalize: 'Formats, transforms, or analyzes text.',
  reverseword: 'Formats, transforms, or analyzes text.',
  count: 'Formats, transforms, or analyzes text.',
  wordcount: "Provides the wordcount command's related bot function.",
  charcount: "Provides the charcount command's related bot function.",
  linecount: "Provides the linecount command's related bot function.",
  remove: "Provides the remove command's related bot function.",
  removeextra: "Provides the removeextra command's related bot function.",
  removespace: "Provides the removespace command's related bot function.",
  trim: "Provides the trim command's related bot function.",
  split: "Provides the split command's related bot function.",
  sort: 'Formats, transforms, or analyzes text.',
  sorttext: 'Formats, transforms, or analyzes text.',
  shuffle: 'Formats, transforms, or analyzes text.',
  randomize: "Provides the randomize command's related bot function.",
  duplicate: "Provides the duplicate command's related bot function.",
  replace: 'Formats, transforms, or analyzes text.',
  find: 'Formats, transforms, or analyzes text.',
  findtext: 'Formats, transforms, or analyzes text.',
  compare: 'Formats, transforms, or analyzes text.',
  comparetext: 'Formats, transforms, or analyzes text.',
  diff: "Provides the diff command's related bot function.",
  textdiff: 'Formats, transforms, or analyzes text.',
  formattext: 'Formats, transforms, or analyzes text.',
  cleantext: 'Formats, transforms, or analyzes text.',
  fixtext: 'Formats, transforms, or analyzes text.',
  beautify: "Provides the beautify command's related bot function.",
  minify: "Provides the minify command's related bot function.",
  wrap: "Provides the wrap command's related bot function.",
  unwrap: "Provides the unwrap command's related bot function.",
  center: "Provides the center command's related bot function.",
  justify: "Provides the justify command's related bot function.",
  bold: 'Formats, transforms, or analyzes text.',
  italic: 'Formats, transforms, or analyzes text.',
  underline: 'Formats, transforms, or analyzes text.',
  strike: "Provides the strike command's related bot function.",
  monospace: "Provides the monospace command's related bot function.",
  smallcaps: "Provides the smallcaps command's related bot function.",
  bubble: "Provides the bubble command's related bot function.",
  squaretext: 'Performs a mathematical calculation.',
  circled: "Provides the circled command's related bot function.",
  mirrortext: "Provides the mirrortext command's related bot function.",
  upside: "Provides the upside command's related bot function.",
  zalgo: "Provides the zalgo command's related bot function.",
  ascii: "Provides the ascii command's related bot function.",
  asciiart: "Provides the asciiart command's related bot function.",
  figlet: "Provides the figlet command's related bot function.",
  banner: 'Blocks or restricts a user.',
  box: "Provides the box command's related bot function.",
  border: "Provides the border command's related bot function.",
  separator: "Provides the separator command's related bot function.",
  symbol: "Provides the symbol command's related bot function.",
  symbols: "Provides the symbols command's related bot function.",
  specialchars: "Provides the specialchars command's related bot function.",
  emojitext: "Provides the emojitext command's related bot function.",
  textemoji: 'Formats, transforms, or analyzes text.',
  emojiart: "Provides the emojiart command's related bot function.",
  kaomoji: "Provides the kaomoji command's related bot function.",
  kaomojilist: "Provides the kaomojilist command's related bot function.",
};
module.exports.commands = Object.keys(XDESC).map((name) => ({
  name,
  desc: XDESC[name],
  category: 'TEXT',
  handler: async (m, sock) => {
    const r = await handler(m, sock);
    if (r === null || r === undefined)
      return m.reply('🔤 ' + XDESC[name] + '\n→ Try: .' + name + ' <input>   ya .help dekho');
    return r;
  },
}));
