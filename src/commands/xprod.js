/* SAQI-MD   XPROD: todo, notes, reminders, calendar   REAL (Mongo-persistent per user) */
const config = require('../../config');
const { kvGet, kvSet } = require('../lib/xhelp');

const ukey = (m, k) => `todo:${m.sender}:${k}`;

async function handler(m, sock) {
  const cmd = m.command;
  const arg = (m.arg || '').trim();

  if (['todo', 'todolist', 'mytasks', 'task', 'tasks', 'tasklist'].includes(cmd)) {
    const list = await kvGet(ukey(m, 'list'), []);
    if (!list.length)
      return m.reply(`📝 Task list khali hy. Add karo: ${config.PREFIX}addtodo <task>`);
    return m.reply(
      `📝 *Tumhare Tasks (${list.length}):*\n\n` +
        list
          .map((t, i) => `${t.done ? '✅' : `${i + 1}.`} ${t.done ? '~' + t.text + '~' : t.text}`)
          .join('\n') +
        `\n\n→ Add: ${config.PREFIX}addtodo <task> | Done: ${config.PREFIX}donetodo <num> | Del: ${config.PREFIX}deltodo <num>`,
    );
  }
  if (['addtodo', 'newtask'].includes(cmd)) {
    if (!arg) return m.reply(`❌ Task likho: ${config.PREFIX}addtodo kal assignment submit karna`);
    const list = await kvGet(ukey(m, 'list'), []);
    list.push({ text: arg, done: false, at: Date.now() });
    await kvSet(ukey(m, 'list'), list);
    return m.reply(`✅ Task #${list.length} add: "${arg}"   total: ${list.length}`);
  }
  if (['donetodo', 'donetask'].includes(cmd)) {
    const n = parseInt(arg);
    const list = await kvGet(ukey(m, 'list'), []);
    if (!n || !list[n - 1]) return m.reply(`❌ Number do: ${config.PREFIX}donetodo 2`);
    list[n - 1].done = true;
    await kvSet(ukey(m, 'list'), list);
    return m.reply(`✅ Done! "${list[n - 1].text}"`);
  }
  if (['deltodo', 'deltask'].includes(cmd)) {
    const n = parseInt(arg);
    const list = await kvGet(ukey(m, 'list'), []);
    if (!n || !list[n - 1]) return m.reply(`❌ Number do: ${config.PREFIX}deltodo 2`);
    const [rm] = list.splice(n - 1, 1);
    await kvSet(ukey(m, 'list'), list);
    return m.reply(`🗑️ Removed: "${rm.text}"`);
  }
  if (cmd === 'cleartodo' || cmd === 'cleartasks') {
    await kvSet(ukey(m, 'list'), []);
    return m.reply('🗑️ Sab tasks clear.');
  }

  /* notes */
  if (['note', 'notes', 'noteslist', 'memos', 'mymemos'].includes(cmd)) {
    const list = await kvGet(ukey(m, 'notes'), []);
    if (!list.length) return m.reply(`📒 Notes khali. Add: ${config.PREFIX}addnote <text>`);
    return m.reply(
      `📒 *Tumhare Notes (${list.length}):*\n\n` + list.map((t, i) => `${i + 1}. ${t}`).join('\n'),
    );
  }
  if (['addnote', 'newnote', 'memo'].includes(cmd)) {
    if (!arg) return m.reply(`❌ Note likho: ${config.PREFIX}addnote wifi password: xxxx`);
    const list = await kvGet(ukey(m, 'notes'), []);
    list.push(arg);
    await kvSet(ukey(m, 'notes'), list);
    return m.reply(`✅ Note #${list.length} save.`);
  }
  if (cmd === 'delnote' || cmd === 'delmemo') {
    const n = parseInt(arg);
    const list = await kvGet(ukey(m, 'notes'), []);
    if (!n || !list[n - 1]) return m.reply(`❌ Number do: ${config.PREFIX}delnote 1`);
    const [rm] = list.splice(n - 1, 1);
    await kvSet(ukey(m, 'notes'), list);
    return m.reply(`🗑️ Note removed: "${rm.slice(0, 40)}"`);
  }
  if (cmd === 'reminderlist')
    return m.reply(
      '⏰ Reminder set karo: .remind 10 min message   fire hone tak list me rehta hy.',
    );

  /* calendar-ish */
  if (cmd === 'calendar' || cmd === 'cal') {
    const d = new Date();
    return m.reply(
      `📅 *${d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}*\n→ Aaj: ${d.toDateString()}\n→ Din #${Math.ceil((d - new Date(d.getFullYear(), 0, 1)) / 86400000)} of ${d.getFullYear()}`,
    );
  }
  if (cmd === 'schedule' || cmd === 'agenda')
    return m.reply(
      `📅 Schedule = reminders + todos. Set karo: .remind 9am?   filhal time-based: ${config.PREFIX}remind 2 hour <msg> aur .addtodo <task>`,
    );
  return null;
}

module.exports.handler = handler;

/* ---- v5.0 registry: 73 commands (PRODUCTIVITY)   generator ---- */
const XDESC = {
  todo: 'Helps organize tasks, notes, goals, or schedules.',
  todolist: 'Helps organize tasks, notes, goals, or schedules.',
  addtodo: 'Performs a mathematical calculation.',
  deltodo: "Provides the deltodo command's related bot function.",
  donetodo: "Provides the donetodo command's related bot function.",
  cleartodo: "Provides the cleartodo command's related bot function.",
  mytasks: "Provides the mytasks command's related bot function.",
  task: 'Helps organize tasks, notes, goals, or schedules.',
  tasks: 'Helps organize tasks, notes, goals, or schedules.',
  remind: 'Helps organize tasks, notes, goals, or schedules.',
  reminder: 'Helps organize tasks, notes, goals, or schedules.',
  reminders: 'Helps organize tasks, notes, goals, or schedules.',
  setreminder: 'Changes or manages a bot setting.',
  delreminder: "Provides the delreminder command's related bot function.",
  reminderlist: 'Helps organize tasks, notes, goals, or schedules.',
  note: 'Helps organize tasks, notes, goals, or schedules.',
  notes: 'Helps organize tasks, notes, goals, or schedules.',
  addnote: 'Performs a mathematical calculation.',
  delnote: "Provides the delnote command's related bot function.",
  noteslist: 'Helps organize tasks, notes, goals, or schedules.',
  memo: 'Helps organize tasks, notes, goals, or schedules.',
  memos: 'Helps organize tasks, notes, goals, or schedules.',
  calendar: 'Helps organize tasks, notes, goals, or schedules.',
  cal: "Provides the cal command's related bot function.",
  today: "Provides the today command's related bot function.",
  tomorrow: "Provides the tomorrow command's related bot function.",
  yesterday: "Provides the yesterday command's related bot function.",
  week: "Provides the week command's related bot function.",
  month: "Provides the month command's related bot function.",
  year: "Provides the year command's related bot function.",
  schedule: 'Helps organize tasks, notes, goals, or schedules.',
  agenda: 'Helps organize tasks, notes, goals, or schedules.',
  event: "Provides the event command's related bot function.",
  addevent: 'Performs a mathematical calculation.',
  delevent: "Provides the delevent command's related bot function.",
  events: "Provides the events command's related bot function.",
  countdown2: 'Formats, transforms, or analyzes text.',
  timer2: "Provides the timer2 command's related bot function.",
  stopwatch2: "Provides the stopwatch2 command's related bot function.",
  pomodoro: "Provides the pomodoro command's related bot function.",
  break: "Provides the break command's related bot function.",
  focusmode: "Provides the focusmode command's related bot function.",
  study: 'Helps organize tasks, notes, goals, or schedules.',
  studytime: 'Helps organize tasks, notes, goals, or schedules.',
  studyplan: 'Helps organize tasks, notes, goals, or schedules.',
  planner: 'Helps organize tasks, notes, goals, or schedules.',
  routine: 'Helps organize tasks, notes, goals, or schedules.',
  routine2: 'Helps organize tasks, notes, goals, or schedules.',
  habit: 'Helps organize tasks, notes, goals, or schedules.',
  habits: 'Helps organize tasks, notes, goals, or schedules.',
  habitadd: 'Helps organize tasks, notes, goals, or schedules.',
  habitdel: 'Helps organize tasks, notes, goals, or schedules.',
  habitlist: 'Helps organize tasks, notes, goals, or schedules.',
  streak: "Provides the streak command's related bot function.",
  streaks: "Provides the streaks command's related bot function.",
  goal: 'Helps organize tasks, notes, goals, or schedules.',
  goals: 'Helps organize tasks, notes, goals, or schedules.',
  goaladd: 'Helps organize tasks, notes, goals, or schedules.',
  goaldel: 'Helps organize tasks, notes, goals, or schedules.',
  goallist: 'Helps organize tasks, notes, goals, or schedules.',
  progress: "Provides the progress command's related bot function.",
  progressbar: "Provides the progressbar command's related bot function.",
  checklist: 'Helps organize tasks, notes, goals, or schedules.',
  check: "Provides the check command's related bot function.",
  checklistadd: 'Helps organize tasks, notes, goals, or schedules.',
  checklistdel: 'Helps organize tasks, notes, goals, or schedules.',
  checklistshow: 'Helps organize tasks, notes, goals, or schedules.',
  priority: "Provides the priority command's related bot function.",
  important: 'Changes or manages a bot setting.',
  deadline: 'Helps organize tasks, notes, goals, or schedules.',
  deadlines: 'Helps organize tasks, notes, goals, or schedules.',
  productivity: "Provides the productivity command's related bot function.",
  productivitystats: "Provides the productivitystats command's related bot function.",
};
module.exports.commands = Object.keys(XDESC).map((name) => ({
  name,
  desc: XDESC[name],
  category: 'PRODUCTIVITY',
  handler: async (m, sock) => {
    const r = await handler(m, sock);
    if (r === null || r === undefined)
      return m.reply('📝 ' + XDESC[name] + '\n→ Try: .' + name + ' <input>   ya .help dekho');
    return r;
  },
}));
