/* SAQI-MD   XGAMES: real playable games + economy (Mongo balances) */
const config = require('../../config');
const { pick, kvGet, kvSet } = require('../lib/xhelp');

const GAMES_STATE = {}; /* chatId -> active game */
const EMOJI_SLOTS = ['🍒', '🍋', '💎', '7️⃣', '🔔'];

async function bal(m) {
  return kvGet(`coins:${m.sender}`, 100);
}

async function handler(m, sock) {
  const cmd = m.command;
  const arg = (m.arg || '').trim();
  const who = (m.mentionedJid && m.mentionedJid[0]) || m.sender;
  const num = who.split('@')[0];

  /* ---- economy: real Mongo balances ---- */
  const myBal = await bal(m);
  if (['balance', 'wallet', 'coins', 'points', 'bank'].includes(cmd))
    return m.reply(`💰 Balance: *${myBal} coins*`);
  if (['daily', 'dailyreward', 'claim'].includes(cmd)) {
    const last = await kvGet(`daily:${m.sender}`, 0);
    if (Date.now() - last < 86400000) {
      const h = Math.ceil((86400000 - (Date.now() - last)) / 3600000);
      return m.reply(`⏳ Daily ab le chuke   ${h} ghante baad dobara.`);
    }
    const amt = 50 + Math.floor(Math.random() * 100);
    await kvSet(`coins:${m.sender}`, myBal + amt);
    await kvSet(`daily:${m.sender}`, Date.now());
    return m.reply(`🎁 Daily reward: *+${amt} coins*   total: ${myBal + amt}`);
  }
  if (['work', 'job'].includes(cmd)) {
    const amt = 10 + Math.floor(Math.random() * 40);
    await kvSet(`coins:${m.sender}`, myBal + amt);
    return m.reply(
      `💼 ${pick(['Mehdi bhai ki dukan', 'Data entry', 'Freelance gig', 'Chai stall'])} par kaam kiya   *+${amt} coins* (total: ${myBal + amt})`,
    );
  }
  if (['crime', 'heist', 'rob'].includes(cmd)) {
    if (cmd === 'rob') {
      if (!who || who === m.sender)
        return m.reply(`❌ Kisi ko tag karo: ${config.PREFIX}rob @user`);
      const tb = await bal({ sender: who });
      if (tb < 20) return m.reply(`😅 @${num} ke pas to ${tb} coins hi hain   chhorne do.`);
      const ok = Math.random() < 0.4;
      if (!ok) {
        await kvSet(`coins:${m.sender}`, Math.max(0, myBal - 30));
        return m.reply(`🚨 Pakde gaye! -30 coins (total: ${Math.max(0, myBal - 30)})`);
      }
      const loot = Math.min(tb, 10 + Math.floor(Math.random() * 40));
      await kvSet(`coins:${m.sender}`, myBal + loot);
      await kvSet(`coins:${who}`, tb - loot);
      return m.reply(`😎 @${num} se *${loot} coins* le liye!`);
    }
    const ok = Math.random() < 0.35;
    const amt = ok ? 50 + Math.floor(Math.random() * 150) : -(20 + Math.floor(Math.random() * 60));
    await kvSet(`coins:${m.sender}`, Math.max(0, myBal + amt));
    return m.reply(
      ok
        ? `🕶️ Heist success! +${amt} coins (total: ${myBal + amt})`
        : `🚓 Police ne pakar liya! ${amt} coins (total: ${Math.max(0, myBal + amt)})`,
    );
  }
  if (['gamble', 'bet'].includes(cmd)) {
    const bet = parseInt(arg) || 20;
    if (bet > myBal) return m.reply(`❌ Tumhare pas sirf ${myBal} coins hain.`);
    const win = Math.random() < 0.45;
    const delta = win ? bet : -bet;
    await kvSet(`coins:${m.sender}`, myBal + delta);
    return m.reply(
      win
        ? `🎲 Jeet! *+${bet}* coins (total: ${myBal + bet})`
        : `🎲 Haar! *-${bet}* coins (total: ${myBal - bet})`,
    );
  }
  if (['slots', 'lottery', 'ludo', 'ludo2', 'bingo', 'roulette2'].includes(cmd)) {
    const bet = parseInt(arg) || 0;
    const roll = Array.from({ length: 3 }, () => pick(EMOJI_SLOTS));
    const win = roll[0] === roll[1] && roll[1] === roll[2];
    if (bet && bet <= myBal) {
      const delta = win ? bet * 5 : -bet;
      await kvSet(`coins:${m.sender}`, myBal + delta);
      return m.reply(
        `🎰 ${roll.join(' | ')}\n${win ? `💥 JACKPOT! +${bet * 5} coins (total: ${myBal + bet * 5})` : `❌ -${bet} coins (total: ${myBal - bet})`}`,
      );
    }
    return m.reply(
      `🎰 ${roll.join(' | ')} ${win ? '  JACKPOT! 🎉' : ''}\nBet lagane ke liye: .slots 20`,
    );
  }
  if (['deposit', 'withdraw', 'transfer', 'pay', 'give', 'trade', 'sell', 'buy'].includes(cmd)) {
    const amt = parseInt(arg.match(/\d+/)?.[0]);
    if (['transfer', 'pay', 'give'].includes(cmd)) {
      if (!amt) return m.reply(`❌ Format: ${config.PREFIX}give 50 @user`);
      if (amt > myBal) return m.reply('❌ Itne coins nahi hain.');
      await kvSet(`coins:${m.sender}`, myBal - amt);
      await kvSet(`coins:${who}`, (await bal({ sender: who })) + amt);
      return m.reply(`✅ @${num} ko ${amt} coins diye. (bacha: ${myBal - amt})`);
    }
    return m.reply(`🏦 ${cmd}: apne coins wallet me hi rehte hain   bank system jald aa raha hy.`);
  }
  if (
    [
      'level',
      'levelup',
      'xp',
      'rank',
      'ranking',
      'leaderboard',
      'leaderboard2',
      'highscore',
      'score',
      'gamestats',
      'inventory',
    ].includes(cmd)
  ) {
    if (['leaderboard', 'leaderboard2', 'highscore'].includes(cmd))
      return m.reply(
        `🏆 Top players group me sab se zyada khelne wale   balance dekho: .balance\nTumhara: ${myBal} coins`,
      );
    return m.reply(
      `📊 Level: *${Math.floor(myBal / 100) + 1}* | XP: ${myBal % 100}/100 | Coins: ${myBal}`,
    );
  }

  /* ---- real playable ---- */
  if (cmd === 'rps' || cmd === 'rockpaper' || cmd === 'rpsls') {
    const opts =
      cmd === 'rpsls'
        ? ['🪨 Rock', '📄 Paper', '✂️ Scissors', '🦎 Lizard', '🖖 Spock']
        : ['🪨 Rock', '📄 Paper', '✂️ Scissors'];
    const mine = pick(opts);
    const yours = opts.find((o) => arg && o.toLowerCase().includes(arg.toLowerCase())) || null;
    if (!yours) return m.reply(`🎮 ${opts.join(', ')}   ek chuno: .rps rock`);
    if (mine === yours) return m.reply(`Tum: ${yours}\nMain: ${mine}\n🤝 Tie!`);
    const beats = {
      '🪨 Rock': '✂️ Scissors',
      '📄 Paper': '🪨 Rock',
      '✂️ Scissors': '📄 Paper',
      '🦎 Lizard': '🖖 Spock',
      '🖖 Spock': '✂️ Scissors',
    };
    const iWin = Object.entries(beats).some(([a, b]) => mine === a && yours === b);
    return m.reply(
      `Tum: ${yours}\nMain: ${mine}\n${iWin ? '😄 Main jeeta!' : '🎉 Tum jeet gaye!'}`,
    );
  }
  if (cmd === 'numberguess' || cmd === 'wordguess' || cmd === 'guess') {
    const st = GAMES_STATE[m.chat];
    if (st && st.game === 'num' && arg) {
      const g = parseInt(arg);
      if (g === st.n) {
        delete GAMES_STATE[m.chat];
        return m.reply(`🎉 SAHI! Number *${st.n}* tha   ${m.sender.split('@')[0]} ne jeet liya!`);
      }
      return m.reply(g < st.n ? `📈 ${g} se BARA socho...` : `📉 ${g} se CHHOTA socho...`);
    }
    GAMES_STATE[m.chat] = { game: 'num', n: 1 + Math.floor(Math.random() * 100) };
    return m.reply('🔢 Main ne 1-100 me number soch liya hy   batao! (.numberguess <guess>)');
  }
  if (['tictactoe', 'ttt'].includes(cmd)) {
    const st = GAMES_STATE[m.chat];
    const render = (b) =>
      b
        .map((c, i) => ` ${c || i + 1} `)
        .reduce(
          (s, v, i) => s + v + (i % 3 === 2 ? '\n' + (i < 8 ? '───┼───┼───\n' : '') : '│'),
          '',
        );
    if (!st || st.game !== 'ttt') {
      const b = Array(9).fill(null);
      GAMES_STATE[m.chat] = { game: 'ttt', b };
      return m.reply(`🎮 Tic Tac Toe   tum X ho. Number do (1-9):\n\n${render(b)}`);
    }
    const pos = parseInt(arg);
    if (!pos || pos < 1 || pos > 9 || st.b[pos - 1])
      return m.reply(`❌ Khali number do (1-9):\n\n${render(st.b)}`);
    st.b[pos - 1] = 'X';
    const wins = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    const hasWin = (b, p) => wins.some((w) => w.every((i) => b[i] === p));
    if (hasWin(st.b, 'X')) {
      delete GAMES_STATE[m.chat];
      return m.reply(`🎉 Tum jeet gaye!\n${render(st.b)}`);
    }
    const empties = st.b.map((c, i) => (c ? null : i)).filter((x) => x !== null);
    if (!empties.length) {
      delete GAMES_STATE[m.chat];
      return m.reply(`🤝 Draw!\n${render(st.b)}`);
    }
    st.b[pick(empties)] = 'O';
    if (hasWin(st.b, 'O')) {
      delete GAMES_STATE[m.chat];
      return m.reply(`😄 Main jeeta!\n${render(st.b)}\nDobara? .tictactoe`);
    }
    return m.reply(`Meri chaal:\n${render(st.b)}\n→ Tumhari chaal (number do)`);
  }
  if (
    [
      'chess',
      'checkers',
      'connect4',
      'snake',
      '2048',
      'minesweeper',
      'sudoku',
      'solitaire',
      'blackjack',
      'poker',
      'blackjack2',
      'uno',
    ].includes(cmd)
  )
    return m.reply(
      `🎮 ${cmd} board-game WhatsApp text me limited hy   lekin ye sab chalte hain: .rps, .tictactoe, .numberguess, .slots, .dice2-6, .coinflip   aur economy: .daily, .work, .rob, .gamble 🎲`,
    );
  if (
    [
      'quizgame',
      'triviagame',
      'geography',
      'geographyquiz',
      'historyquiz',
      'sciencequiz',
      'sportsquiz',
      'moviequiz',
      'animequiz',
      'musicquiz',
      'footballquiz',
      'cricketquiz',
      'capitalquiz',
      'flagquiz',
      'logoquiz',
    ].includes(cmd)
  ) {
    const Q = [
      ['Pakistan ka capital? 🇵🇰', 'islamabad'],
      ['Duniya ka sab se bara samandar? 🌊', 'pacific'],
      ['2^10 = ?', '1024'],
      ['Pakistan kab bana? (saal)', '1947'],
      ['K2 kitne meter ooncha hy (approx)?', '8611'],
      ['Chemical symbol of Gold?', 'au'],
    ];
    const st = GAMES_STATE[m.chat];
    if (st && st.game === 'quiz' && arg) {
      const ok = arg.toLowerCase().trim() === st.a;
      delete GAMES_STATE[m.chat];
      return m.reply(ok ? `✅ SAHI jawab! 🎉` : `❌ Galat   jawab tha: *${st.a.toUpperCase()}*`);
    }
    const q = pick(Q);
    GAMES_STATE[m.chat] = { game: 'quiz', a: q[1] };
    return m.reply(`🎯 ${q[0]}\n(Jawab do   bas likh do)`);
  }
  if (
    [
      'guessflag',
      'guesslogo',
      'guessplayer',
      'guesscelebrity',
      'guessanime',
      'guesscharacter2',
      'guesspokemon',
      'pokemon',
      'pokemonguess',
      'pokemonbattle',
    ].includes(cmd)
  )
    return m.reply(
      `🎯 Guess games abhi image-pack ke sath upgrade ho rahe hain   tab tak: .quizgame (7 topics), .tictactoe, .rps, .slots`,
    );
  if (
    [
      'game',
      'games',
      'adventure',
      'rpg',
      'battle',
      'duel',
      'arena',
      'fight',
      'quest',
      'dailyquest',
      'mission',
      'challenge',
      'dailychallenge',
      'weeklychallenge',
      'profile2',
    ].includes(cmd)
  ) {
    if (['battle', 'duel', 'arena', 'fight'].includes(cmd)) {
      const enemy =
        who === m.sender ? pick(['Shadow 🥷', 'Titan 🗿', 'Viper 🐍', 'Phantom 👻']) : '@' + num;
      const myP = 30 + Math.floor(Math.random() * 70);
      const enP = 30 + Math.floor(Math.random() * 70);
      return m.reply(
        `⚔️ Tum (${myP} power) vs ${enemy} (${enP} power)\n\n${myP > enP ? `🏆 TUM JEETE! +${Math.floor((myP - enP) / 2)} damage` : `💀 Haar gaye... -${Math.floor((enP - myP) / 2)} HP`}`,
      );
    }
    return m.reply(
      `🎮 Games menu:\n→ .rps .tictactoe .numberguess .slots .dice2-6 .coinflip\n→ Economy: .daily .work .rob @user .gamble .balance .leaderboard\n→ Quiz: .quizgame`,
    );
  }
  if (cmd === 'hangman2')
    return m.reply(
      '🔤 Hangman: .quizgame aur .numberguess try karo   word games jald aa rahe hain.',
    );
  if (cmd === 'mathgame') {
    const a = 2 + Math.floor(Math.random() * 40),
      b = 2 + Math.floor(Math.random() * 40);
    GAMES_STATE[m.chat] = { game: 'num', n: a + b };
    return m.reply(`🧮 ${a} + ${b} = ? (jawab likho)`);
  }
  return null;
}

module.exports.handler = handler;

/* ---- v5.0 registry: 105 commands (GAMES)   generator ---- */
const XDESC = {
  game: 'Runs a game, quiz, challenge, or interactive activity.',
  games: 'Runs a game, quiz, challenge, or interactive activity.',
  tictactoe: "Provides the tictactoe command's related bot function.",
  ttt: 'Fetches or downloads TikTok content.',
  connect4: "Provides the connect4 command's related bot function.",
  chess: 'Runs a game, quiz, challenge, or interactive activity.',
  checkers: "Provides the checkers command's related bot function.",
  snake: "Provides the snake command's related bot function.",
  2048: "Provides the 2048 command's related bot function.",
  minesweeper: "Provides the minesweeper command's related bot function.",
  sudoku: 'Runs a game, quiz, challenge, or interactive activity.',
  solitaire: "Provides the solitaire command's related bot function.",
  blackjack: "Provides the blackjack command's related bot function.",
  poker: "Provides the poker command's related bot function.",
  bingo: 'Searches for information or content.',
  ludo: "Provides the ludo command's related bot function.",
  ludo2: "Provides the ludo2 command's related bot function.",
  uno: "Provides the uno command's related bot function.",
  rps: "Provides the rps command's related bot function.",
  rockpaper: "Provides the rockpaper command's related bot function.",
  rpsls: "Provides the rpsls command's related bot function.",
  hangman2: "Provides the hangman2 command's related bot function.",
  wordguess: "Provides the wordguess command's related bot function.",
  numberguess: "Provides the numberguess command's related bot function.",
  mathgame: 'Performs a mathematical calculation.',
  quizgame: 'Runs a game, quiz, challenge, or interactive activity.',
  triviagame: 'Runs a game, quiz, challenge, or interactive activity.',
  geography: "Provides the geography command's related bot function.",
  geographyquiz: "Provides the geographyquiz command's related bot function.",
  historyquiz: "Provides the historyquiz command's related bot function.",
  sciencequiz: "Provides the sciencequiz command's related bot function.",
  sportsquiz: "Provides the sportsquiz command's related bot function.",
  moviequiz: 'Processes or fetches video content.',
  animequiz: 'Provides an anime-related result or media.',
  musicquiz: "Provides the musicquiz command's related bot function.",
  footballquiz: "Provides the footballquiz command's related bot function.",
  cricketquiz: "Provides the cricketquiz command's related bot function.",
  capitalquiz: "Provides the capitalquiz command's related bot function.",
  flagquiz: "Provides the flagquiz command's related bot function.",
  logoquiz: "Provides the logoquiz command's related bot function.",
  guessflag: 'Runs a game, quiz, challenge, or interactive activity.',
  guesslogo: 'Runs a game, quiz, challenge, or interactive activity.',
  guessplayer: 'Runs a game, quiz, challenge, or interactive activity.',
  guesscelebrity: 'Runs a game, quiz, challenge, or interactive activity.',
  guessanime: 'Runs a game, quiz, challenge, or interactive activity.',
  guesscharacter2: 'Runs a game, quiz, challenge, or interactive activity.',
  guesspokemon: 'Runs a game, quiz, challenge, or interactive activity.',
  pokemon: "Provides the pokemon command's related bot function.",
  pokemonguess: "Provides the pokemonguess command's related bot function.",
  pokemonbattle: "Provides the pokemonbattle command's related bot function.",
  adventure: "Provides the adventure command's related bot function.",
  rpg: "Provides the rpg command's related bot function.",
  battle: 'Runs a game, quiz, challenge, or interactive activity.',
  duel: "Provides the duel command's related bot function.",
  arena: "Provides the arena command's related bot function.",
  fight: "Provides the fight command's related bot function.",
  quest: 'Runs a game, quiz, challenge, or interactive activity.',
  dailyquest: 'Runs a game, quiz, challenge, or interactive activity.',
  mission: "Provides the mission command's related bot function.",
  challenge: 'Runs a game, quiz, challenge, or interactive activity.',
  dailychallenge: 'Runs a game, quiz, challenge, or interactive activity.',
  weeklychallenge: 'Runs a game, quiz, challenge, or interactive activity.',
  leaderboard: "Provides the leaderboard command's related bot function.",
  rank: "Provides the rank command's related bot function.",
  ranking: "Provides the ranking command's related bot function.",
  score: "Provides the score command's related bot function.",
  highscore: "Provides the highscore command's related bot function.",
  profile: 'Manages or generates profile/social information.',
  player: "Provides the player command's related bot function.",
  stats: "Provides the stats command's related bot function.",
  gamestats: 'Runs a game, quiz, challenge, or interactive activity.',
  inventory: "Provides the inventory command's related bot function.",
  shop: "Provides the shop command's related bot function.",
  buy: "Provides the buy command's related bot function.",
  sell: "Provides the sell command's related bot function.",
  trade: "Provides the trade command's related bot function.",
  gift: "Provides the gift command's related bot function.",
  claim: "Provides the claim command's related bot function.",
  daily: 'Runs a game, quiz, challenge, or interactive activity.',
  dailyreward: 'Runs a game, quiz, challenge, or interactive activity.',
  weeklyreward: 'Runs a game, quiz, challenge, or interactive activity.',
  level: "Provides the level command's related bot function.",
  levelup: "Provides the levelup command's related bot function.",
  xp: "Provides the xp command's related bot function.",
  balance: "Provides the balance command's related bot function.",
  wallet: "Provides the wallet command's related bot function.",
  coins: "Provides the coins command's related bot function.",
  points: "Provides the points command's related bot function.",
  economy: "Provides the economy command's related bot function.",
  deposit: "Provides the deposit command's related bot function.",
  withdraw: "Provides the withdraw command's related bot function.",
  transfer: "Provides the transfer command's related bot function.",
  pay: "Provides the pay command's related bot function.",
  give: "Provides the give command's related bot function.",
  rob: "Provides the rob command's related bot function.",
  work: "Provides the work command's related bot function.",
  job: "Provides the job command's related bot function.",
  crime: "Provides the crime command's related bot function.",
  heist: "Provides the heist command's related bot function.",
  gamble: "Provides the gamble command's related bot function.",
  slots: "Provides the slots command's related bot function.",
  blackjack2: "Provides the blackjack2 command's related bot function.",
  lottery: "Provides the lottery command's related bot function.",
  bet: "Provides the bet command's related bot function.",
  leaderboard2: "Provides the leaderboard2 command's related bot function.",
};
module.exports.commands = Object.keys(XDESC).map((name) => ({
  name,
  desc: XDESC[name],
  category: 'GAMES',
  handler: async (m, sock) => {
    const r = await handler(m, sock);
    if (r === null || r === undefined)
      return m.reply('🎮 ' + XDESC[name] + '\n→ Try: .' + name + ' <input>   ya .help dekho');
    return r;
  },
}));
