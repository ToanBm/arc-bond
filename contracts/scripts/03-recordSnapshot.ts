import { ethers } from "hardhat";
import { getDeployedAddresses } from "./utils/getAddresses";

/**
 * Script: Record snapshot (Keeper function - Daily at 00:00 UTC)
 * Usage: 
 *   Manual: npx hardhat run scripts/03-recordSnapshot.ts --network arc
 *   PM2:    pm2 start "npx hardhat run scripts/03-recordSnapshot.ts --network arc" --name keeper
 */

async function main() {
  console.log("📸 Starting Snapshot Keeper Service...\n");

  const [signer] = await ethers.getSigners();
  console.log("📍 Keeper address:", signer.address);

  // Get contract addresses from deployment
  const { BOND_SERIES_ADDRESS } = await getDeployedAddresses();

  // Get contract
  const bondSeries = await ethers.getContractAt("BondSeries", BOND_SERIES_ADDRESS);

  // Check KEEPER_ROLE only once at startup
  const KEEPER_ROLE = await bondSeries.KEEPER_ROLE();
  const hasRole = await bondSeries.hasRole(KEEPER_ROLE, signer.address);

  if (!hasRole) {
    console.error("\n❌ ERROR: Address does not have KEEPER_ROLE!");
    console.error("   Your address:", signer.address);
    console.error("   Service cannot start.");
    process.exitCode = 1;
    return;
  }

  console.log("✅ Keeper role verified. Service is active.");
  console.log("------------------------------------------");

  // Continuous loop
  while (true) {
    try {
      // 1. Check status
      console.log(`\n🔍 Checking status at ${new Date().toISOString()}...`);

      let canRecordNow = false;
      let timeUntilNext = 0;
      let isPoolExpired = false;
      let nextRecordTimestamp = 0;

      try {
        const status = await bondSeries.getSnapshotStatus(signer.address);
        canRecordNow = status[0];
        timeUntilNext = Number(status[2]);
        isPoolExpired = status[3];
        nextRecordTimestamp = Number(status[4]);
      } catch (err) {
        // Fallback or temporary network error - retry soon
        console.error("⚠️ Error checking status:", err);
        await sleep(60); // Wait 1 min and retry
        continue;
      }

      if (isPoolExpired) {
        console.log("⚠️ Pool has expired. Keeper service stopping.");
        return; // Exit normally so PM2 stops? Or maybe sleep long time? Return is safer.
      }

      if (canRecordNow) {
        // 2. Record Snapshot
        console.log("⏳ Recording snapshot...");

        try {
          // Estimate gas to fail early if reverts
          // await bondSeries.recordSnapshot.estimateGas();

          const tx = await bondSeries.recordSnapshot();
          console.log("   Tx sent:", tx.hash);

          const receipt = await tx.wait();
          console.log("✅ Snapshot recorded successfully!");

          // Log details
          const recordCount = await bondSeries.recordCount();
          const snapshot = await bondSeries.snapshots(recordCount);
          console.log(`   Record ID: ${recordCount}, TotalSupply: ${ethers.formatUnits(snapshot.totalSupply, 6)}`);

        } catch (txError: any) {
          console.error("❌ Snapshot failed:", txError.message || txError);
          // If failed, maybe wait a bit to avoid spamming if it's a logic error
          await sleep(60);
          continue;
        }

      } else {
        // 3. Wait until next slot
        if (nextRecordTimestamp > 0) {
          const now = Math.floor(Date.now() / 1000);
          let waitSeconds = nextRecordTimestamp - now;

          // Add small buffer (e.g. 10 sec) to ensure block time has passed
          waitSeconds += 10;

          if (waitSeconds > 0) {
            const waitHours = (waitSeconds / 3600).toFixed(2);
            const nextDate = new Date((nextRecordTimestamp + 10) * 1000); // with buffer

            console.log(`💤 Waiting ${waitHours} hours until ${nextDate.toISOString()}`);
            console.log(`   (Sleeping for ${waitSeconds} seconds)`);

            // Sleep
            await sleep(waitSeconds);
          } else {
            // Should have been ready? Maybe slight drift or block time diff
            console.log("🤔 Time seems passed but contract said wait? Retrying in 10s...");
            await sleep(10);
          }
        } else {
          // Should not happen if not expired
          console.log("❓ Unknown state, checking again in 1 min...");
          await sleep(60);
        }
      }

    } catch (mainError) {
      console.error("💥 Unexpected error in main loop:", mainError);
      console.log("🔄 Retrying in 1 minute...");
      await sleep(60);
    }
  }
}

function sleep(seconds: number) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

main().catch((error) => {
  console.error("❌ Fatal Error:", error);
  process.exitCode = 1; // PM2 will restart if configured
});
