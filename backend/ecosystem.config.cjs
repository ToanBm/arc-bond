/**
 * PM2 Ecosystem Config for VPS Deployment
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'arcbond-keeper',
      script: 'src/keeper-daily.js', // Updated to Daily Keeper
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/keeper-error.log',
      out_file: './logs/keeper-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};

