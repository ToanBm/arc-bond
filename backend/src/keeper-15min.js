import { ethers } from 'ethers';
import { 
  getBondSeriesContract,
  getAllPoolsToMonitor,
  getKeeperBalance, 
  formatTimestamp, 
  getTimeLeft 
} from './utils/contract.js';
import {
  notifySnapshotSuccess,
  notifySnapshotError,
  notifyLowBalance,
  notifyTooSoon
} from './utils/notify.js';

/**
 * Keeper Service: Auto-record snapshots every 5 minutes
 * 
 * This service runs continuously and records snapshots automatically
 * at the specified minute marks (0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55) of each hour.
 */

const TARGET_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]; // Minutes when to record snapshot (every 5 minutes)
const CHECK_INTERVAL = 1000; // Check every 1 second
const SNAPSHOT_INTERVAL_SEC = 5 * 60; // 5 minutes in seconds

let isRunning = true;
let lastRecordTime = {}; // Track last record time per pool

/**
 * Record snapshot for a single pool
 */
async function recordSnapshotForPool(pool) {
  const poolLabel = pool.name || `Pool ${pool.poolId}`;
  const poolKey = pool.poolId.toString();
  
  console.log(`\n📸 Recording snapshot for ${poolLabel} (${pool.poolId})...`);
  
  if (!pool.bondSeries) {
    console.error(`❌ Pool ${pool.poolId}: bondSeries address is missing!`);
    return {
      success: false,
      poolId: pool.poolId,
      poolName: poolLabel,
      reason: 'missing_bondSeries_address',
      error: 'bondSeries address not found in pool info'
    };
  }
  
  try {
    const { contract, keeper } = getBondSeriesContract(pool.bondSeries);
    
    console.log('📍 Keeper address:', keeper.address);
    
    // Check keeper balance
    const keeperBalance = await getKeeperBalance(pool.bondSeries);
    console.log('💰 Keeper balance:', ethers.formatUnits(keeperBalance, 18), 'USDC');
    
    const MIN_BALANCE = ethers.parseUnits('1', 18); // 1 USDC (native token)
    if (keeperBalance < MIN_BALANCE) {
      console.log('⚠️ WARNING: Keeper balance low!');
      await notifyLowBalance(keeperBalance);
    }
    
    // Get timing info
    const nextRecordTime = await contract.nextRecordTime();
    const recordCount = await contract.recordCount();
    const now = Math.floor(Date.now() / 1000);
    
    console.log('\n📊 Contract Status:');
    console.log('   Record Count:', recordCount.toString());
    console.log('   Next Record Time:', formatTimestamp(nextRecordTime));
    console.log('   Current Time:', formatTimestamp(now));
    
    // Check if can record
    const timeLeft = getTimeLeft(nextRecordTime);
    
    if (!timeLeft.canRecord) {
      const minutesLeft = Math.floor(timeLeft.seconds / 60);
      const secondsLeft = timeLeft.seconds % 60;
      console.log(`\n⏰ Too soon! Need to wait ${minutesLeft}m ${secondsLeft}s`);
      return { 
        success: false, 
        poolId: pool.poolId,
        poolName: poolLabel,
        reason: 'too_soon' 
      };
    }
    
    // Record snapshot
    console.log('⏳ Sending transaction...');
    const tx = await contract.recordSnapshot();
    console.log('📤 Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    
    // Get snapshot data
    const newRecordCount = await contract.recordCount();
    const snapshot = await contract.snapshots(newRecordCount);
    
    console.log('\n📸 Snapshot Recorded:');
    console.log('   Record ID:', snapshot.recordId.toString());
    console.log('   Total Supply:', ethers.formatUnits(snapshot.totalSupply, 6), 'arcUSDC');
    console.log('   Treasury:', ethers.formatUnits(snapshot.treasuryBalance, 6), 'USDC');
    console.log('   Timestamp:', formatTimestamp(snapshot.timestamp));
    
    // Update last record time for this pool
    lastRecordTime[poolKey] = Date.now();
    
    // Send notification
    await notifySnapshotSuccess(
      snapshot.recordId,
      snapshot.totalSupply,
      snapshot.treasuryBalance,
      tx.hash,
      poolLabel,
      pool.poolId
    );
    
    console.log('✅ Success!');
    console.log('🔗 Explorer:', `https://testnet.arcscan.app/tx/${tx.hash}`);
    
    return {
      success: true,
      poolId: pool.poolId,
      poolName: poolLabel,
      recordId: snapshot.recordId.toString(),
      txHash: tx.hash,
      totalSupply: snapshot.totalSupply.toString(),
      treasuryBalance: snapshot.treasuryBalance.toString()
    };
    
  } catch (error) {
    console.error(`❌ Snapshot failed for ${poolLabel}:`, error.message);
    
    // Parse common errors
    if (error.message.includes('TooSoon')) {
      console.log('   Reason: Too soon to record (15min interval)');
      return { 
        success: false, 
        poolId: pool.poolId,
        poolName: poolLabel,
        reason: 'too_soon', 
        error: error.message 
      };
    }
    
    if (error.message.includes('insufficient funds')) {
      console.log('   Reason: Keeper wallet has insufficient USDC for gas');
      await notifyLowBalance(0n);
      return { 
        success: false, 
        poolId: pool.poolId,
        poolName: poolLabel,
        reason: 'insufficient_funds', 
        error: error.message 
      };
    }
    
    // Send error notification
    await notifySnapshotError(error, poolLabel, pool.poolId);
    
    return { 
      success: false, 
      poolId: pool.poolId,
      poolName: poolLabel,
      reason: 'error', 
      error: error.message 
    };
  }
}

/**
 * Check if we should record snapshot now (at target minutes)
 */
function shouldRecordNow() {
  const now = new Date();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  
  // Record at :00, :15, :30, :45 (within first 5 seconds to avoid missing)
  return TARGET_MINUTES.includes(minute) && second < 5;
}

/**
 * Get next target minute
 */
function getNextTargetMinute() {
  const now = new Date();
  const currentMinute = now.getMinutes();
  const nextTarget = TARGET_MINUTES.find(m => m > currentMinute) || TARGET_MINUTES[0];
  const minutesUntilNext = nextTarget > currentMinute 
    ? nextTarget - currentMinute 
    : (60 - currentMinute) + nextTarget;
  return { nextTarget, minutesUntilNext };
}

/**
 * Main keeper service loop
 */
async function runKeeperService() {
  console.log('\n' + '='.repeat(60));
  console.log('🤖 ArcBond Keeper Service (5-minute snapshots)');
  console.log('='.repeat(60));
  console.log('Time:', new Date().toISOString());
  console.log(`📅 Will record snapshots at: ${TARGET_MINUTES.join(", ")} minutes past each hour`);
  console.log('🛑 Press Ctrl+C to stop\n');
  
  // Get all pools to monitor
  let pools;
  try {
    pools = await getAllPoolsToMonitor();
  } catch (error) {
    console.error('❌ Error getting pools:', error.message);
    console.error('💡 Check your .env file:');
    console.error('   - If using single pool: set BOND_SERIES_ADDRESS');
    console.error('   - If using Factory: set BOND_FACTORY_ADDRESS (and ensure it\'s correct)');
    process.exit(1);
  }
  
  if (pools.length === 0) {
    console.log('⚠️  No pools found. Exiting.');
    return;
  }
  
  console.log(`📊 Monitoring ${pools.length} pool(s)\n`);
  
  // Validate pools before starting
  for (const pool of pools) {
    if (!pool.bondSeries) {
      console.error(`❌ Pool ${pool.poolId}: bondSeries address is missing!`);
      console.error('   Please check your configuration.');
      process.exit(1);
    }
  }
  
  // Try to record immediately if possible (at target minutes AND contract allows)
  for (const pool of pools) {
    try {
      const { contract } = getBondSeriesContract(pool.bondSeries);
      const nextRecordTime = await contract.nextRecordTime();
      const timeLeft = getTimeLeft(nextRecordTime);
      const isTargetMinute = shouldRecordNow();
      
      // Record if: (1) at target minute (0, 15, 30, 45) AND (2) contract allows
      if (isTargetMinute && timeLeft.canRecord) {
        console.log(`📸 Recording initial snapshot for ${pool.name || `Pool ${pool.poolId}`}...`);
        await recordSnapshotForPool(pool);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Small delay
      } else {
        const { nextTarget, minutesUntilNext } = getNextTargetMinute();
        if (timeLeft.canRecord) {
          console.log(`⏳ Pool ${pool.poolId}: Waiting for target minute :${nextTarget.toString().padStart(2, '0')} (in ${minutesUntilNext} min)`);
        } else {
          const contractMinutesLeft = Math.floor(timeLeft.seconds / 60);
          const contractSecondsLeft = timeLeft.seconds % 60;
          console.log(`⏳ Pool ${pool.poolId}: Contract not ready (${contractMinutesLeft}m ${contractSecondsLeft}s left). Will record at :${nextTarget.toString().padStart(2, '0')} if ready.`);
        }
      }
    } catch (error) {
      console.error(`❌ Pool ${pool.poolId}: ${error.message}`);
      if (error.code === 'CALL_EXCEPTION') {
        console.error(`   ⚠️  Contract call failed. Check if address ${pool.bondSeries} is correct.`);
      }
    }
  }
  
  // Main loop
  const interval = setInterval(async () => {
    if (!isRunning) {
      clearInterval(interval);
      return;
    }
    
    const now = Date.now();
    
    // Check if we should record (at target minutes: 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
    if (shouldRecordNow()) {
      // Record snapshot for each pool
      for (const pool of pools) {
        const poolKey = pool.poolId.toString();
        const lastRecord = lastRecordTime[poolKey] || 0;
        
        // Skip if just recorded in this target minute (avoid duplicate records)
        const currentMinute = new Date().getMinutes();
        const lastRecordMinute = lastRecord > 0 ? new Date(lastRecord).getMinutes() : -1;
        if (lastRecordMinute === currentMinute && TARGET_MINUTES.includes(currentMinute)) {
          // Already recorded in this target minute, skip
          continue;
        }
        
        // Make sure at least 4 minutes have passed since last record (5 min interval - 1 min buffer)
        const timeSinceLastRecord = (now - lastRecord) / 1000; // seconds
        if (timeSinceLastRecord >= SNAPSHOT_INTERVAL_SEC - 60) { // 4 minutes (with 1 min buffer)
          // Also check if contract allows recording
          try {
            const { contract } = getBondSeriesContract(pool.bondSeries);
            const nextRecordTime = await contract.nextRecordTime();
            const timeLeft = getTimeLeft(nextRecordTime);
            
            if (timeLeft.canRecord) {
              await recordSnapshotForPool(pool);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Small delay between pools
            } else {
              const minutesLeft = Math.floor(timeLeft.seconds / 60);
              const secondsLeft = timeLeft.seconds % 60;
              console.log(`⏳ Pool ${pool.poolId}: At target minute but contract not ready (${minutesLeft}m ${secondsLeft}s left)`);
            }
          } catch (error) {
            // Skip if error is "too soon" or "already recorded" - don't spam errors
            if (error.message.includes('TooSoon') || error.message.includes('too soon')) {
              // Silently skip
            } else {
              console.error(`❌ Pool ${pool.poolId}: Error checking contract: ${error.message}`);
            }
          }
        } else {
          const minutesLeft = Math.floor((SNAPSHOT_INTERVAL_SEC - timeSinceLastRecord) / 60);
          const secondsLeft = Math.floor(((SNAPSHOT_INTERVAL_SEC - timeSinceLastRecord) % 60));
          // Only log if significant time left (avoid spam)
          if (minutesLeft >= 1 || secondsLeft > 30) {
            console.log(`⏳ Pool ${pool.poolId}: Skipping (recorded ${minutesLeft}m ${secondsLeft}s ago, need 5 min interval)`);
          }
        }
      }
    }
    
    // Display status every minute
    const currentSecond = new Date().getSeconds();
    if (currentSecond === 0) {
      const { nextTarget, minutesUntilNext } = getNextTargetMinute();
      const currentTime = new Date().toLocaleTimeString();
      process.stdout.write(`\r⏰ ${currentTime} | Next snapshot in ${minutesUntilNext} min (at :${nextTarget.toString().padStart(2, '0')})`);
    }
  }, CHECK_INTERVAL);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping keeper service...');
    isRunning = false;
    clearInterval(interval);
    setTimeout(() => process.exit(0), 1000);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Stopping keeper service...');
    isRunning = false;
    clearInterval(interval);
    setTimeout(() => process.exit(0), 1000);
  });
}

// Run service
runKeeperService().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

