module.exports = {
  apps: [{
    name: 'bws-scraper',
    script: 'scraper/index.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    cron_restart: '*/10 * * * *', // Restart every 10 minutes
    log_file: 'logs/scraper.log',
    out_file: 'logs/scraper-out.log',
    error_file: 'logs/scraper-error.log',
    merge_logs: true,
    time: true,
    env: {
      NODE_ENV: 'production',
      SCRAPER_DATA_DIR: './scraper/data'
    },
    env_production: {
      NODE_ENV: 'production',
      SCRAPER_DATA_DIR: './scraper/data'
    }
  }, {
    name: 'curah-hujan-app',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: ['src'],
    ignore_watch: ['node_modules', 'scraper', 'logs'],
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
