// SAQI-MD   pm2 config: `pm2 start deploy/ecosystem.config.js`
module.exports = {
  apps: [
    {
      name: 'saqi-md',
      script: 'worker.js',
      cwd: __dirname + '/..',
      instance: 1,
      autorestart: true,
      max_restarts: 100,
      restart_delay: 5000,
      max_memory_restart: '600M',
      env: { NODE_ENV: 'production' },
      error_file: 'pm2-error.log',
      out_file: 'pm2-out.log',
    },
  ],
};
