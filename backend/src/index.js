import cron from 'node-cron';
import { CRON_SCHEDULE } from './config.js';
import { recordSnapshot } from './snapshot.js';

console.log('🚀 ArcBond Keeper Bot Starting...\n');

/**
 * Main cron job
 */
function startCronJob() {
  console.log('⏰ Cron Schedule:', CRON_SCHEDULE);
  console.log('   (Daily at 00:00 UTC by default)\n');
  
  // Validate cron schedule
  if (!cron.validate(CRON_SCHEDULE)) {
    throw new Error('Invalid CRON_SCHEDULE format');
  }
  
  // Schedule the job
  const task = cron.schedule(CRON_SCHEDULE, async () => {
    console.log('\n⏰ Cron job triggered at:', new Date().toISOString());
    await recordSnapshot();
  });
  
  console.log('✅ Cron job scheduled successfully!');
  console.log('💡 Waiting for scheduled time...\n');
  
  // Keep the process alive
  task.start();
  
  // Log next execution time
  const now = new Date();
  console.log('📅 Current time:', now.toISOString());
  console.log('📅 Next execution will be at the scheduled time\n');
  
  // Optional: Run immediately on start (for testing)
  const RUN_ON_START = process.env.RUN_ON_START === 'true';
  if (RUN_ON_START) {
    console.log('🔧 RUN_ON_START enabled - executing snapshot now...\n');
    recordSnapshot();
  }
}

/**
 * Health check endpoint (for Render.com)
 */
function startHealthCheck() {
  // Render.com checks if process is alive
  // This keeps the process running
  setInterval(() => {
    const uptime = process.uptime();
    console.log(`💚 Keeper bot alive - Uptime: ${Math.floor(uptime / 60)} minutes`);
  }, 24 * 60 * 60 * 1000); // Every 24 hours (for local testing only, use Render for production)
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

/**
 * Start the bot
 */
try {
  startCronJob();
  startHealthCheck();
} catch (error) {
  console.error('❌ Failed to start keeper bot:', error);
  process.exit(1);
}

