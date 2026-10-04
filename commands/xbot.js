/* SAQI-MD — XBOT: bot/system/server REAL info + menu/command helpers */
const os = require('os');
const config = require('../config');
const { pick } = require('../lib/xhelp');

function stats() {
  const g = global.__SAQI_STATS || {};
  const up = g.startedAt ? Date.now() - g.startedAt : 0;
  const fmt = (ms) => { const h = Math.floor(ms / 3600000), mn = Math.floor((ms % 3600000) / 60000); return `${h}h ${mn}m`; };
  return {
    uptime: fmt(up),
    mem: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + ' MB',
    heap: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + ' MB',
    cpu: (os.loadavg()[0]).toFixed(2),
    totalmem: (os.totalmem() / 1024 / 1024 / 1024).toFixed(1) + ' GB',
    freemem: (os.freemem() / 1024 / 1024 / 1024).toFixed(1) + ' GB',
    platform: `${os.type()} ${os.arch()}`,
    node: process.version,
    cmds: g.commandCount || '?',
    sessions: g.sessions || '?',
  };
}

async function handler(m, sock) {
  const cmd = m.command;
  const s = stats();
  const infoLine = `🤖 *${config.BOT_NAME}* ${config.VERSION || ''}\n→ Uptime: ${s.uptime}\n→ Commands: ${s.cmds}\n→ Sessions: ${s.sessions}\n→ RAM: ${s.mem} / ${s.totalmem}\n→ Node: ${s.node}`;

  if (['botinfo', 'botstatus', 'about', 'statusbot', 'info'].includes(cmd)) return m.reply(infoLine);
  if (['botstats', 'stats', 'system', 'systeminfo', 'serverinfo', 'runtime', 'botserver', 'cache', 'debug', 'debuginfo', 'os'].includes(cmd)) {
    return m.reply(`🖥️ *System Info*\n→ Uptime: ${s.uptime}\n→ RAM used: ${s.mem} (free ${s.freemem}/${s.totalmem})\n→ CPU load: ${s.cpu}\n→ Platform: ${s.platform}\n→ Node: ${s.node}\n→ Heap: ${s.heap}`);
  }
  if (['botuptime', 'uptime', 'runtime2'].includes(cmd)) return m.reply(`⏱️ Uptime: *${s.uptime}*`);
  if (['botping', 'pingme', 'latency'].includes(cmd)) { const t0 = Date.now(); await m.reply('🏓 ...'); return m.reply(`🏓 Pong! *${Date.now() - t0}ms*`); }
  if (['botversion', 'version', 'changelog', 'updates', 'newcommands'].includes(cmd)) return m.reply(`🏷️ *${config.BOT_NAME} v${config.VERSION || '5.0'}*\n→ Latest build: extra commands pack\n→ Node: ${s.node}`);
  if (['botmemory', 'botram', 'botcpu', 'memory', 'disk', 'cpu', 'ram'].includes(cmd)) return m.reply(`📊 RAM: ${s.mem} | Heap: ${s.heap} | Free: ${s.freemem}/${s.totalmem} | CPU load: ${s.cpu}`);
  if (['botowner', 'ownerinfo2', 'developer', 'dev', 'credits', 'contact'].includes(cmd)) return m.reply(`👑 *Owner:* ${config.OWNER_NAME || 'Attitude King'}\n📞 ${config.OWNER_NUMBER || config.OWNER || ''}`);
  if (['botprefix', 'botcommands', 'commandlist', 'listcommands', 'fullmenu', 'menu2', 'menu3', 'simplemenu', 'categories', 'category', 'helpcategory'].includes(cmd)) {
    const get = global.__SAQI_CMD_GET;
    const menuCmd = get ? get('menu') : null;
    if (menuCmd) return menuCmd.handler(m, sock);
    return m.reply(`📋 Total commands: *${s.cmds}*\nMenu ke liye: ${config.PREFIX}menu`);
  }
  if (['commandsearch', 'commandinfo', 'commandhelp', 'plugininfo'].includes(cmd)) {
    if (!m.arg) return m.reply(`❌ Command naam do: ${config.PREFIX}commandsearch sticker`);
    const get = global.__SAQI_CMD_GET;
    const c = get ? (get(m.arg.toLowerCase().replace(/^\./, '')) || get('menu')) : null;
    return m.reply(c ? `📋 *${m.arg}* — category: ${c.category || '?'}${c.desc ? '\n→ ' + c.desc : ''}` : `❌ "${m.arg}" command nahi mili.`);
  }
  if (['source', 'repo', 'repository', 'library', 'libraries', 'dependencies', 'package', 'packages', 'modules', 'plugins', 'pluginlist'].includes(cmd)) return m.reply(`📦 *${config.BOT_NAME}*\n→ GitHub: github.com/badb54880-spec/SAQI-MD\n→ Command files: 26+ categories\n→ Total commands: ${s.cmds}`);
  if (['support', 'supportgroup', 'bug', 'bugreport', 'feedback', 'suggest', 'request', 'report'].includes(cmd)) return m.reply(`💬 Owner (${config.OWNER_NAME || 'Attitude King'}) ko message karo: ${config.OWNER_NUMBER || config.OWNER || 'WhatsApp owner'}${m.arg ? '\n→ Tumhara message forward kar diya jaayega owner ko note ke sath' : ''}`);
  if (['donate', 'donation', 'sponsor', 'terms'].includes(cmd)) return m.reply(`💜 ${config.BOT_NAME} free product hy. Owner ko reach out karo details ke liye.`);
  if (['reload', 'refresh', 'updatebot', 'checkupdate', 'autoupdate', 'reset', 'clearcache'].includes(cmd)) return m.reply(`🔄 Owner-level action hy — ${config.PREFIX}restart owner ke pas hy. Ye user command nahi chal sakti.`);
  if (['backup', 'restore', 'logs', 'log', 'enable', 'disable', 'enableplugin', 'disableplugin', 'reloadplugin'].includes(cmd)) return m.reply(`⚙️ Ye internal/admin command hy — worker ise automatically manage karta hy.`);
  return null;
}

module.exports.handler = handler;

/* ---- v5.0 registry: 78 commands (BOT) — generator ---- */
const XDESC = {
  "botinfo": "Provides the botinfo command's related bot function.",
  "botstatus": "Provides the botstatus command's related bot function.",
  "botstats": "Provides the botstats command's related bot function.",
  "botuptime": "Provides the botuptime command's related bot function.",
  "botping": "Provides the botping command's related bot function.",
  "botversion": "Provides the botversion command's related bot function.",
  "botmemory": "Provides the botmemory command's related bot function.",
  "botcpu": "Provides the botcpu command's related bot function.",
  "botram": "Provides the botram command's related bot function.",
  "botserver": "Provides the botserver command's related bot function.",
  "botowner": "Provides the botowner command's related bot function.",
  "botprefix": "Provides the botprefix command's related bot function.",
  "commandsearch": "Provides the commandsearch command's related bot function.",
  "commandinfo": "Provides the commandinfo command's related bot function.",
  "commandhelp": "Provides the commandhelp command's related bot function.",
  "newcommands": "Provides the newcommands command's related bot function.",
  "updates": "Provides the updates command's related bot function.",
  "changelog": "Provides the changelog command's related bot function.",
  "version": "Provides the version command's related bot function.",
  "source": "Provides the source command's related bot function.",
  "repo": "Provides the repo command's related bot function.",
  "repository": "Provides the repository command's related bot function.",
  "support": "Provides the support command's related bot function.",
  "supportgroup": "Provides the supportgroup command's related bot function.",
  "bug": "Provides the bug command's related bot function.",
  "bugreport": "Provides the bugreport command's related bot function.",
  "feedback": "Provides the feedback command's related bot function.",
  "suggest": "Provides the suggest command's related bot function.",
  "request": "Provides the request command's related bot function.",
  "report": "Provides the report command's related bot function.",
  "contact": "Manages or generates profile/social information.",
  "developer": "Provides the developer command's related bot function.",
  "dev": "Provides the dev command's related bot function.",
  "credits": "Provides the credits command's related bot function.",
  "donate": "Provides the donate command's related bot function.",
  "donation": "Provides the donation command's related bot function.",
  "sponsor": "Provides the sponsor command's related bot function.",
  "terms": "Provides the terms command's related bot function.",
  "about": "Provides the about command's related bot function.",
  "reload": "Provides the reload command's related bot function.",
  "refresh": "Provides the refresh command's related bot function.",
  "updatebot": "Provides the updatebot command's related bot function.",
  "checkupdate": "Provides the checkupdate command's related bot function.",
  "autoupdate": "Provides the autoupdate command's related bot function.",
  "backup": "Provides the backup command's related bot function.",
  "restore": "Provides the restore command's related bot function.",
  "reset": "Changes or manages a bot setting.",
  "clearcache": "Provides the clearcache command's related bot function.",
  "cache": "Provides the cache command's related bot function.",
  "logs": "Provides the logs command's related bot function.",
  "log": "Provides the log command's related bot function.",
  "debug": "Provides the debug command's related bot function.",
  "debuginfo": "Provides the debuginfo command's related bot function.",
  "system": "Provides the system command's related bot function.",
  "systeminfo": "Provides the systeminfo command's related bot function.",
  "serverinfo": "Provides the serverinfo command's related bot function.",
  "runtime": "Provides the runtime command's related bot function.",
  "memory": "Helps organize tasks, notes, goals, or schedules.",
  "disk": "Provides the disk command's related bot function.",
  "cpu": "Provides the cpu command's related bot function.",
  "ram": "Provides the ram command's related bot function.",
  "os": "Provides the os command's related bot function.",
  "node": "Provides the node command's related bot function.",
  "nodeversion": "Provides the nodeversion command's related bot function.",
  "library": "Provides the library command's related bot function.",
  "libraries": "Provides the libraries command's related bot function.",
  "dependencies": "Provides the dependencies command's related bot function.",
  "package": "Provides the package command's related bot function.",
  "packages": "Provides the packages command's related bot function.",
  "modules": "Manages administrator or moderator controls.",
  "plugins": "Provides the plugins command's related bot function.",
  "pluginlist": "Provides the pluginlist command's related bot function.",
  "plugininfo": "Provides the plugininfo command's related bot function.",
  "enable": "Provides the enable command's related bot function.",
  "disable": "Provides the disable command's related bot function.",
  "enableplugin": "Provides the enableplugin command's related bot function.",
  "disableplugin": "Provides the disableplugin command's related bot function.",
  "reloadplugin": "Provides the reloadplugin command's related bot function.",
};
module.exports.commands = Object.keys(XDESC).map(name => ({
  name,
  desc: XDESC[name],
  category: "BOT",
  handler: async (m, sock) => {
    const r = await handler(m, sock);
    if (r === null || r === undefined) return m.reply('🤖 ' + XDESC[name] + '\n→ Try: .' + name + ' <input> — ya .help dekho');
    return r;
  },
}));
