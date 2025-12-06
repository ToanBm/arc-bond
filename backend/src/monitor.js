import { ethers } from 'ethers';
import { 
  getBondSeriesContract, 
  getAllPoolsToMonitor,
  formatTimestamp 
} from './utils/contract.js';
import { notifyDiscord } from './utils/notify.js';

/**
 * Monitor a single pool
 */
async function monitorPool(pool) {
  const poolLabel = pool.name || `Pool ${pool.poolId}`;
  
  console.log(`\n📊 Monitoring ${poolLabel} (${pool.poolId})...`);
  
  try {
    const { contract, keeper, provider } = getBondSeriesContract(pool.bondSeries);
    
    console.log('\n📍 Keeper address:', keeper.address);
    
    // ==================== 1. CHECK KEEPER BALANCE ====================
    const keeperBalance = await provider.getBalance(keeper.address);
    const keeperUSDC = ethers.formatUnits(keeperBalance, 18); // Native token = 18 decimals
    console.log('\n💰 Keeper Balance:', keeperUSDC, 'USDC');
    
    const MIN_BALANCE = ethers.parseUnits('1', 18); // 1 USDC
    if (keeperBalance < MIN_BALANCE) {
      console.log('⚠️ WARNING: Keeper balance low!');
      await notifyDiscord(
        '⚠️ Keeper Balance Low',
        [
          { name: 'Current Balance', value: `${keeperUSDC} USDC`, inline: true },
          { name: 'Minimum Required', value: '1 USDC', inline: true },
          { name: 'Action', value: 'Please refill keeper wallet for gas fees', inline: false }
        ],
        0xffa500 // Orange
      );
    }
    
    // ==================== 2. CHECK SERIES STATUS ====================
    const [
      maturityDate,
      totalDeposited,
      totalSupply,
      recordCount,
      cumulativeCouponIndex,
      emergencyMode
    ] = await contract.getSeriesInfo();
    
    const lastDistributed = await contract.lastDistributedRecord();
    const nextRecordTime = await contract.nextRecordTime();
    
    console.log('\n📊 Series Status:');
    console.log('   Total Deposited:', ethers.formatUnits(totalDeposited, 6), 'USDC');
    console.log('   Total Supply:', ethers.formatUnits(totalSupply, 18), 'arcUSDC');
    console.log('   Record Count:', recordCount.toString());
    console.log('   Last Distributed:', lastDistributed.toString());
    console.log('   Emergency Mode:', emergencyMode ? '🚨 YES' : '✅ No');
    console.log('   Next Record Time:', formatTimestamp(nextRecordTime));
    
    // ==================== 3. CHECK FOR EMERGENCY MODE ====================
    if (emergencyMode) {
      console.log('\n🚨 CRITICAL: Emergency mode is ACTIVE!');
      
      await notifyDiscord(
        '🚨 EMERGENCY MODE ACTIVE',
        [
          { name: 'Status', value: 'Owner has defaulted on coupon payments', inline: false },
          { name: 'Action Required', value: 'Users should emergency redeem their arcUSDC tokens', inline: false },
          { name: 'Impact', value: 'Users will receive pro-rata USDC based on treasury balance', inline: false },
          { name: '🔗 Contract', value: `[View on Explorer](https://testnet.arcscan.app/address/${contract.target})`, inline: false }
        ],
        0xff0000 // Red
      );
    }
    
    // ==================== 4. CHECK FOR MISSED DISTRIBUTIONS ====================
    const pendingDistributions = Number(recordCount) - Number(lastDistributed);
    
    console.log('\n📋 Distribution Status:');
    console.log('   Pending Distributions:', pendingDistributions);
    
    if (pendingDistributions >= 3) {
      console.log('   ⚠️ CRITICAL: 3+ snapshots without distribution!');
      
      await notifyDiscord(
        '⚠️ CRITICAL: Multiple Missed Distributions',
        [
          { name: 'Pending Count', value: pendingDistributions.toString(), inline: true },
          { name: 'Status', value: 'Emergency mode may activate soon!', inline: false },
          { name: 'Action', value: 'Owner must distribute coupon immediately', inline: false }
        ],
        0xff0000 // Red
      );
    } else if (pendingDistributions >= 2) {
      console.log('   ⚠️ WARNING: 2 snapshots without distribution');
      
      await notifyDiscord(
        '⚠️ WARNING: Missed Distributions',
        [
          { name: 'Pending Count', value: pendingDistributions.toString(), inline: true },
          { name: 'Action', value: 'Owner should distribute coupon soon', inline: false }
        ],
        0xffa500 // Orange
      );
    } else if (pendingDistributions === 1) {
      console.log('   📢 INFO: 1 snapshot awaiting distribution (normal)');
    } else {
      console.log('   ✅ All distributions up to date');
    }
    
    // ==================== 5. CHECK RECENT EVENTS ====================
    console.log('\n📡 Checking recent events...');
    
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 1000; // Last ~1000 blocks (~5-10 minutes on Arc)
    
    // Check for EmergencyRedeemEnabled events
    try {
      const emergencyFilter = contract.filters.EmergencyRedeemEnabled();
      const emergencyEvents = await contract.queryFilter(emergencyFilter, fromBlock);
      
      if (emergencyEvents.length > 0) {
        console.log('   🚨 Emergency events detected:', emergencyEvents.length);
        
        for (const event of emergencyEvents) {
          const block = await event.getBlock();
          await notifyDiscord(
            '🚨 NEW EMERGENCY MODE ACTIVATION DETECTED',
            [
              { name: 'Block', value: event.blockNumber.toString(), inline: true },
              { name: 'Time', value: new Date(block.timestamp * 1000).toISOString(), inline: true },
              { name: 'Transaction', value: `[View](https://testnet.arcscan.app/tx/${event.transactionHash})`, inline: false },
              { name: 'Impact', value: '⚠️ Users can now emergency redeem for pro-rata USDC', inline: false }
            ],
            0xff0000
          );
        }
      }
    } catch (err) {
      console.log('   ⚠️ Could not query emergency events:', err.message);
    }
    
    // Check for SnapshotRecorded events
    try {
      const snapshotFilter = contract.filters.SnapshotRecorded();
      const snapshotEvents = await contract.queryFilter(snapshotFilter, fromBlock);
      
      console.log('   📸 Snapshots in last 1000 blocks:', snapshotEvents.length);
    } catch (err) {
      console.log('   ⚠️ Could not query snapshot events:', err.message);
    }
    
    // Check for CouponDistributed events
    try {
      const couponFilter = contract.filters.CouponDistributed();
      const couponEvents = await contract.queryFilter(couponFilter, fromBlock);
      
      console.log('   💰 Distributions in last 1000 blocks:', couponEvents.length);
    } catch (err) {
      console.log('   ⚠️ Could not query coupon events:', err.message);
    }
    
    // ==================== 6. CHECK MATURITY ====================
    const now = Math.floor(Date.now() / 1000);
    const maturityTimestamp = Number(maturityDate);
    
    console.log('\n⏰ Maturity Status:');
    console.log('   Maturity Date:', formatTimestamp(maturityDate));
    
    if (now >= maturityTimestamp) {
      console.log('   ✅ Bond has matured - users can redeem');
      
      // Only notify once (check if within 10 minutes of maturity)
      if (now - maturityTimestamp < 600) {
        await notifyDiscord(
          '🎉 Bond Maturity Reached',
          [
            { name: 'Status', value: 'Users can now redeem their principal', inline: false },
            { name: 'Maturity Date', value: formatTimestamp(maturityDate), inline: true },
            { name: 'Total Supply', value: `${ethers.formatUnits(totalSupply, 18)} arcUSDC`, inline: true }
          ],
          0x00ff00
        );
      }
    } else {
      const timeToMaturity = maturityTimestamp - now;
      const hoursLeft = Math.floor(timeToMaturity / 3600);
      const minutesLeft = Math.floor((timeToMaturity % 3600) / 60);
      console.log(`   ⏳ Time to maturity: ${hoursLeft}h ${minutesLeft}m`);
    }
    
    console.log(`✅ ${poolLabel} check complete`);
    
    return { 
      success: true, 
      poolId: pool.poolId,
      poolName: poolLabel,
      timestamp: new Date().toISOString() 
    };
    
  } catch (error) {
    console.error(`❌ Monitor error for ${poolLabel}:`, error.message);
    
    await notifyDiscord(
      `❌ Monitor Error - ${poolLabel}`,
      [
        { name: 'Pool', value: poolLabel, inline: true },
        { name: 'Pool ID', value: pool.poolId, inline: true },
        { name: 'Error', value: error.message.substring(0, 1000), inline: false },
        { name: 'Time', value: new Date().toISOString(), inline: false }
      ],
      0xff0000
    );
    
    return { 
      success: false, 
      poolId: pool.poolId,
      poolName: poolLabel,
      error: error.message 
    };
  }
}

/**
 * Main monitor function - monitors all pools
 * Checks for:
 * - Emergency mode
 * - Missed distributions
 * - Low keeper balance
 */
async function monitor() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 ArcBond Health Monitor');
  console.log('='.repeat(60));
  console.log('Time:', new Date().toISOString());
  
  try {
    // Get all pools to monitor
    const pools = await getAllPoolsToMonitor();
    
    console.log(`\n📊 Found ${pools.length} pool(s) to monitor`);
    
    if (pools.length === 0) {
      console.log('⚠️  No pools found. Exiting.');
      return { success: false, reason: 'no_pools' };
    }
    
    // Check keeper balance once
    const { keeper, provider } = getBondSeriesContract(pools[0].bondSeries);
    const keeperBalance = await provider.getBalance(keeper.address);
    const keeperUSDC = ethers.formatUnits(keeperBalance, 18);
    console.log('\n💰 Keeper Balance:', keeperUSDC, 'USDC');
    
    const MIN_BALANCE = ethers.parseUnits('1', 18); // 1 USDC
    if (keeperBalance < MIN_BALANCE) {
      console.log('⚠️ WARNING: Keeper balance low!');
      await notifyDiscord(
        '⚠️ Keeper Balance Low',
        [
          { name: 'Current Balance', value: `${keeperUSDC} USDC`, inline: true },
          { name: 'Minimum Required', value: '1 USDC', inline: true },
          { name: 'Action', value: 'Please refill keeper wallet for gas fees', inline: false }
        ],
        0xffa500
      );
    }
    
    // Monitor each pool
    const results = [];
    for (const pool of pools) {
      const result = await monitorPool(pool);
      results.push(result);
      
      // Small delay between pools
      if (pools.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 Summary:');
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`   ✅ Successful: ${successful.length}`);
    console.log(`   ❌ Failed: ${failed.length}`);
    console.log('='.repeat(60));
    
    return {
      success: successful.length > 0,
      total: pools.length,
      successful: successful.length,
      failed: failed.length,
      results,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    
    await notifyDiscord(
      '❌ Monitor Fatal Error',
      [
        { name: 'Error', value: error.message.substring(0, 1000), inline: false },
        { name: 'Time', value: new Date().toISOString(), inline: false }
      ],
      0xff0000
    );
    
    console.log('='.repeat(60));
    return { success: false, reason: 'fatal_error', error: error.message };
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  monitor()
    .then(result => {
      console.log('\n📋 Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { monitor };

