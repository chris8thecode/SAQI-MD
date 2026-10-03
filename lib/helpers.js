// SAQI-MD — shared helpers for command files
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// quoted user ka JID (ya sender khud)
function targetOf(m) {
  return (m.quoted && (m.quoted.key?.participant || m.quoted.key?.remoteJid)) || m.sender || '';
}

// reply with mention of one user
async function mentionReply(m, sock, text, jid) {
  const who = jid || targetOf(m);
  await sock.sendMessage(m.chat, { text: `${text}`, mentions: [who] }, { quoted: m });
}

// percentage-style answer (lovetest/aura/rate...)
function pct(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// font style maps (font1-105 + .font)
const FONT_MAPS = [
  (s) => s.split('').map(c => { const m = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' }; return m[c] || c; }).join(''),
  (s) => s.split('').map(c => { const m = { a:'𝐚',b:'𝐛',c:'𝐜',d:'𝐝',e:'𝐞',f:'𝐟',g:'𝐠',h:'𝐡',i:'𝐢',j:'𝐣',k:'𝐤',l:'𝐥',m:'𝐦',n:'𝐧',o:'𝐨',p:'𝐩',q:'𝐪',r:'𝐫',s:'𝐬',t:'𝐭',u:'𝐮',v:'𝐯',w:'𝐰',x:'𝐱',y:'𝐲',z:'𝐳' }; return m[c] || c; }).join(''),
  (s) => s.split('').map(c => { const m = { a:'𝒂',b:'𝒃',c:'𝒄',d:'𝒅',e:'𝒆',f:'𝒇',g:'𝒈',h:'𝒉',i:'𝒊',j:'𝒋',k:'𝒌',l:'𝒍',m:'𝒎',n:'𝒏',o:'𝒐',p:'𝒑',q:'𝒒',r:'𝒓',s:'𝒔',t:'𝒕',u:'𝒖',v:'𝒗',w:'𝒘',x:'𝒙',y:'𝒚',z:'𝒛' }; return m[c] || c; }).join(''),
  (s) => s.split('').map(c => { const m = { a:'𝖺',b:'𝖻',c:'𝖼',d:'𝖽',e:'𝖾',f:'𝖿',g:'𝗀',h:'𝗁',i:'𝗂',j:'𝗃',k:'𝗄',l:'𝗅',m:'𝗆',n:'𝗇',o:'𝗈',p:'𝗉',q:'𝗊',r:'𝗋',s:'𝗌',t:'𝗍',u:'𝗎',v:'𝗏',w:'𝗐',x:'𝗑',y:'𝗒',z:'𝗓' }; return m[c] || c; }).join(''),
  (s) => s.split('').map(c => { const m = { a:'𝗮',b:'𝗯',c:'𝗰',d:'𝗱',e:'𝗲',f:'𝗳',g:'𝗴',h:'𝗵',i:'𝗶',j:'𝗷',k:'𝗸',l:'𝗹',m:'𝗺',n:'𝗻',o:'𝗼',p:'𝗽',q:'𝗾',r:'𝗿',s:'𝘀',t:'𝘁',u:'𝘂',v:'𝘃',w:'𝘄',x:'𝘅',y:'𝘆',z:'𝘇' }; return m[c] || c; }).join(''),
  (s) => s.split('').map(c => { const m = { a:'𝘢',b:'𝘣',c:'𝘤',d:'𝘥',e:'𝘦',f:'𝘧',g:'𝘨',h:'𝘩',i:'𝘪',j:'𝘫',k:'𝘬',l:'𝘭',m:'𝘮',n:'𝘯',o:'𝘰',p:'𝘱',q:'𝘲',r:'𝘳',s:'𝘴',t:'𝘵',u:'𝘶',v:'𝘷',w:'𝘸',x:'𝘹',y:'𝘺',z:'𝘻' }; return m[c] || c; }).join(''),
  (s) => s.split('').map(c => { const m = { a:'🅰',b:'🅱',c:'🅲',d:'🅳',e:'🅴',f:'🅵',g:'🅶',h:'🅷',i:'🅸',j:'🅹',k:'🅺',l:'🅻',m:'🅼',n:'🅽',o:'🅾',p:'🅿',q:'🆀',r:'🆁',s:'🆂',t:'🆃',u:'🆄',v:'🆅',w:'🆆',x:'🆇',y:'🆈',z:'🆉' }; return m[c] || c; }).join(''),
  (s) => s.split('').map(c => /[a-z]/.test(c) ? String.fromCharCode(c.charCodeAt(0) + 65248) : c).join(''),
  (s) => s.split('').map(c => { const m = { a:'𝔞',b:'𝔟',c:'𝔠',d:'𝔡',e:'𝔢',f:'𝔣',g:'𝔤',h:'𝔥',i:'𝔦',j:'𝔧',k:'𝔨',l:'𝔩',m:'𝔪',n:'𝔫',o:'𝔬',p:'𝔭',q:'𝔮',r:'𝔯',s:'𝔰',t:'𝔱',u:'𝔲',v:'𝔳',w:'𝔴',x:'𝔵',y:'𝔶',z:'𝔷' }; return m[c] || c; }).join(''),
  (s) => s.split('').map(c => { const m = { a:'α',b:'в',c:'¢',d:'∂',e:'є',f:'ƒ',g:'g',h:'н',i:'ι',j:'נ',k:'к',l:'ℓ',m:'м',n:'η',o:'σ',p:'ρ',q:'q',r:'я',s:'ѕ',t:'т',u:'υ',v:'ν',w:'ω',x:'χ',y:'у',z:'z' }; return m[c] || c; }).join(''),
  (s) => s.toUpperCase().split('').map(c => c + '̶').join(''),
  (s) => s.split('').map(c => /[a-z]/i.test(c) ? c + '̌' : c).join(''),
  (s) => s.split('').reverse().join(''),
  (s) => s.split('').map(c => /[a-z]/i.test(c) ? `【${c}】` : c).join(''),
  (s) => s.split('').join(' '),
  (s) => s.split('').map(c => /[a-z]/i.test(c) ? c + '̵' : c).join(''),
];

function fontStyle(n, text) { return FONT_MAPS[(n - 1) % FONT_MAPS.length](text); }

// react-style action lines (hug/kiss/slap...)
const ACTIONS = {
  hug:'🤗', kiss:'😘', slap:'👋', punch:'👊', pat:'🫂', wave:'👋', poke:'👉', highfive:'🙌', highfives:'🙌',
  dance:'💃', laugh:'😂', cry:'😢', smile:'😊', wink:'😉', blush:'😊', angry:'😠', sad:'😔',
  sleep:'😴', stare:'👀', confused:'😕', bored:'🥱', yawn:'🥱', shocked:'😱', scared:'😨', surprised:'😲',
  shy:'😊', cool:'😎', celebrate:'🎉', yay:'🙌', run:'🏃', think:'🤔', bite:'🦷', feed:'🍱',
  cuddle:'🥰', facepalm:'🤦', shoot:'🔫', clap:'👏', salute:'🫡', thumbsup:'👍', yes:'✅', no:'❌',
  sorry:'🙏', happy:'😄', nod:'🙂', nope:'🙅', shake:'🤝', handshake:'🤝', carry:'💪', tickle:'😆',
  smug:'😏', pout:'😤', tired:'😪', sigh:'😮‍💨', peek:'👀', sip:'🥤', bleh:'😛', nom:'😋',
  nya:'😸', peck:'😗', teehhee:'🤭', yeet:'🚀', kill:'💀', bully:'😈', cringe:'😬', glomp:'🏃‍♀️',
  bonk:'🔨', baka:'🙈', kabedon:'💋', nuzzle:'🤗', headbang:'🤘', nosebleed:'👃', tableflip:'(╯°□°）╯︵ ┻━┻',
  spin:'💫', shrg:'🤷', shrug:'🤷', lurk:'🕵️', blowkiss:'😘', handhold:'🤝', stop:'✋', pooh:'🎺',
};

module.exports = { pick, targetOf, mentionReply, pct, FONT_MAPS, fontStyle, ACTIONS };
