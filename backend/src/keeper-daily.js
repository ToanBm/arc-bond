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
    notifyLowBalance
} from './utils/notify.js';

/**
 * Keeper Service: Auto-record snapshots DAILY at 00:00 UTC
 * 
 * This service runs continuously and checks contract status.
 * It relies on BondSeries.sol logic which enforces 00:00 UTC timing.
 */

const CHECK_INTERVAL = 60 * 1000; // Check every 1 minute
let isRunning = true;
let lastPoolsRefresh = 0;
let poolsCache = [];

/**
 * Record snapshot for a single pool
 */
async function recordSnapshotForPool(pool) {
    const poolLabel = pool.name || `Pool ${pool.poolId}`;

    console.log(`\n📸 Recording snapshot for ${poolLabel} (${pool.poolId})...`);

    try {
        const { contract, keeper } = getBondSeriesContract(pool.bondSeries);

        // Check keeper balance
        const keeperBalance = await getKeeperBalance(pool.bondSeries);
        const MIN_BALANCE = ethers.parseUnits('0.1', 18); // 0.1 USDC (native token)
        if (keeperBalance < MIN_BALANCE) {
            console.log('⚠️ WARNING: Keeper balance low!');
            await notifyLowBalance(keeperBalance);
        }

        // Verify allow status
        const canRecord = await contract.canRecordSnapshot(keeper.address);
        if (!canRecord[0]) {
            console.log(`   ❌ Contract rejected: ${canRecord[1]}`);
            return false;
        }

        // Record snapshot
        console.log('⏳ Sending transaction...');
        // Optional: Boost gas price for reliability
        // const feeData = await contract.runner.provider.getFeeData();
        const tx = await contract.recordSnapshot();
        console.log('📤 Transaction sent:', tx.hash);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed!', receipt.blockNumber);

        // Get snapshot data for notification
        const newRecordCount = await contract.recordCount();
        const snapshot = await contract.snapshots(newRecordCount);

        await notifySnapshotSuccess(
            snapshot.recordId,
            snapshot.totalSupply,
            snapshot.treasuryBalance,
            tx.hash,
            poolLabel,
            pool.poolId
        );

        return true;

    } catch (error) {
        console.error(`❌ Snapshot failed for ${poolLabel}:`, error.message);
        await notifySnapshotError(error, poolLabel, pool.poolId);
        return false;
    }
}

/**
 * Main keeper service loop
 */
async function runKeeperService() {
    console.log('\n' + '='.repeat(60));
    console.log('🌙 ArcBond Daily Keeper Service');
    console.log('='.repeat(60));
    console.log('Time:', new Date().toISOString());
    console.log('📅 Function: Records snapshot when contract indicates 00:00 UTC reached');
    console.log('🛑 Press Ctrl+C to stop\n');

    // Initial pools load
    try {
        poolsCache = await getAllPoolsToMonitor();
        lastPoolsRefresh = Date.now();
    } catch (error) {
        console.error('❌ Error getting pools:', error.message);
        process.exit(1);
    }

    if (poolsCache.length === 0) {
        console.log('⚠️  No pools found. Waiting for pools...');
    } else {
        console.log(`📊 Monitoring ${poolsCache.length} pool(s)\n`);
    }

    // Loop
    const interval = setInterval(async () => {
        if (!isRunning) {
            clearInterval(interval);
            return;
        }

        const now = Date.now();

        // 1. Refresh pools every 10 mins
        if (now - lastPoolsRefresh > 10 * 60 * 1000) {
            try {
                const newPools = await getAllPoolsToMonitor();
                if (newPools.length !== poolsCache.length) {
                    console.log(`\n🔄 Pools updated: ${poolsCache.length} → ${newPools.length}`);
                    poolsCache = newPools;
                }
                lastPoolsRefresh = now;
            } catch (err) {
                console.error('⚠️ Refresh failed:', err.message);
            }
        }

        // 2. Check each pool
        for (const pool of poolsCache) {
            try {
                // Simple check: getTimeLeft
                // We need to instantiate contract to view
                const { contract } = getBondSeriesContract(pool.bondSeries);

                let nextRecordTime;
                try {
                    nextRecordTime = await contract.nextRecordTime();
                } catch (callErr) {
                    console.log(`⚠️ Failed to read nextRecordTime for Pool ${pool.poolId}`);
                    continue;
                }

                const timeLeft = getTimeLeft(nextRecordTime);

                if (timeLeft.canRecord) {
                    console.log(`\n⚡ It's time! Pool ${pool.poolId} is ready.`);
                    await recordSnapshotForPool(pool);
                } else {
                    // Log status every hour (when minutes == 0) to avoid spam
                    const min = new Date().getMinutes();
                    if (min === 0) { // e.g., 10:00, 11:00...
                        console.log(`⏳ Pool ${pool.poolId}: Waiting... ${timeLeft.hours.toFixed(1)} hours left until ${formatTimestamp(nextRecordTime)}`);
                    }
                }
            } catch (poolErr) {
                // Silent fail or log debug
            }
        }

        // Heartbeat every minute
        process.stdout.write(`\r💓 Heartbeat: ${new Date().toLocaleTimeString()} | Monitoring ${poolsCache.length} pools `);

    }, CHECK_INTERVAL);

    // Handle graceful shutdown
    const stop = () => {
        console.log('\n🛑 Stopping keeper service...');
        isRunning = false;
        clearInterval(interval);
        setTimeout(() => process.exit(0), 1000);
    };

    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
}

// Run service
runKeeperService().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
