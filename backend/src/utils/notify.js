import { DISCORD_WEBHOOK_URL } from '../config.js';

/**
 * Send notification to Discord
 */
export async function notifyDiscord(title, fields = [], color = 0x00ff00) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('📢 Discord notification skipped (no webhook configured)');
    return;
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: title,
          fields: fields,
          color: color,
          timestamp: new Date().toISOString(),
          footer: { text: 'ArcBond Keeper' }
        }]
      })
    });

    if (response.ok) {
      console.log('✅ Discord notification sent');
    } else {
      console.log('⚠️ Discord notification failed:', response.status);
    }
  } catch (error) {
    console.log('⚠️ Discord notification error:', error.message);
  }
}

/**
 * Notify snapshot success
 */
export async function notifySnapshotSuccess(recordId, totalSupply, treasuryBalance, txHash, poolName = null, poolId = null) {
  // arcUSDC is 18 decimals, USDC is 6 decimals
  const couponDue = BigInt(totalSupply) / BigInt(100) / BigInt(1e12);
  
  const title = poolName ? `📸 Snapshot Recorded - ${poolName}` : '📸 Snapshot Recorded';
  const fields = [
    { name: 'Record ID', value: recordId.toString(), inline: true }
  ];
  
  if (poolId) {
    fields.push({ name: 'Pool ID', value: poolId.toString(), inline: true });
  }
  
  fields.push(
    { name: 'Total Supply', value: `${(Number(totalSupply) / 1e18).toFixed(2)} arcUSDC`, inline: true },
    { name: 'Treasury', value: `${(Number(treasuryBalance) / 1e6).toFixed(2)} USDC`, inline: true },
    { name: 'Coupon Due', value: `${(Number(couponDue) / 1e6).toFixed(6)} USDC`, inline: false },
    { name: 'Transaction', value: `[View on Explorer](https://testnet.arcscan.app/tx/${txHash})`, inline: false },
    { name: '📝 Next Step', value: 'Owner should distribute coupon now!', inline: false }
  );
  
  await notifyDiscord(title, fields, 0x00ff00); // Green
}

/**
 * Notify snapshot error
 */
export async function notifySnapshotError(error, poolName = null, poolId = null) {
  const title = poolName ? `🚨 Snapshot Failed - ${poolName}` : '🚨 Snapshot Failed';
  const fields = [
    { name: 'Error', value: error.message.substring(0, 1000), inline: false }
  ];
  
  if (poolId) {
    fields.push({ name: 'Pool ID', value: poolId.toString(), inline: true });
  }
  
  fields.push({ name: 'Time', value: new Date().toISOString(), inline: false });
  
  await notifyDiscord(title, fields, 0xff0000); // Red
}

/**
 * Notify keeper low balance
 */
export async function notifyLowBalance(balance) {
  await notifyDiscord(
    '⚠️ Keeper Balance Low',
    [
      { name: 'Current Balance', value: `${(Number(balance) / 1e18).toFixed(2)} USDC`, inline: true },
      { name: 'Action Required', value: 'Please refill keeper wallet for gas fees', inline: false }
    ],
    0xffa500 // Orange
  );
}

/**
 * Notify too soon (skip snapshot)
 */
export async function notifyTooSoon(hoursLeft) {
  console.log(`⏰ Too soon to snapshot. ${hoursLeft.toFixed(1)} hours left.`);
  // Don't send Discord for this - it's normal behavior
}

