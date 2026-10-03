/* SAQI-MD — SEARCH: define (dictionary) + yts (youtube search) */
async function define(m, sock) {
  if (!m.arg) return m.reply(`❌ Word do. Example: ${'.'}define hello`);
  const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(m.arg)}`).then(r => r.json());
  if (!r[0]) return m.reply('❌ Meaning nahi mila.');
  const mean = r[0].meanings[0].definitions[0].definition;
  return m.reply(`📖 *${r[0].word}*\n\n✳️ ${mean}`);
}

async function yts(m, sock) {
  if (!m.arg) return m.reply(`❌ Search likho. Example: ${'.'}yts naye song`);
  return m.reply(`🔎 *YouTube Search:* ${m.arg}\n\n🔗 https://youtube.com/results?search_query=${encodeURIComponent(m.arg)}`);
}

module.exports.commands = [
  { name: 'define', desc: 'Word ka meaning', category: 'SEARCH', handler: define },
  { name: 'yts', desc: 'YouTube search', category: 'SEARCH', handler: yts },
];
