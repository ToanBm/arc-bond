/**
 * PM2 Ecosystem Config for VPS Deployment
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

export default {
  apps: [
    {
      name: 'arcbond-snapshot',
      script: 'src/snapshot.js',
      instances: 1,
      autorestart: false, // Cron jobs should exit after completion
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/snapshot-error.log',
      out_file: './logs/snapshot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'arcbond-monitor',
      script: 'src/monitor.js',
      instances: 1,
      autorestart: false, // Cron jobs should exit after completion
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/monitor-error.log',
      out_file: './logs/monitor-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};

