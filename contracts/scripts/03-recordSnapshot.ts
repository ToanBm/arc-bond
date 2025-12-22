import { ethers } from "hardhat";
import { getDeployedAddresses } from "./utils/getAddresses";

/**
 * Script: Record snapshot (Keeper function - every 5 minutes for testing)
 * Usage: npx hardhat run scripts/03-recordSnapshot.ts --network arc
 */

async function main() {
  console.log("📸 Recording Snapshot...\n");

  const [signer] = await ethers.getSigners();
  console.log("📍 Keeper address:", signer.address);

  // Get contract addresses from deployment
  const { BOND_SERIES_ADDRESS } = await getDeployedAddresses();
  
  // Get contract
  const bondSeries = await ethers.getContractAt("BondSeries", BOND_SERIES_ADDRESS);
  
  // Check KEEPER_ROLE first
  const KEEPER_ROLE = await bondSeries.KEEPER_ROLE();
  const hasRole = await bondSeries.hasRole(KEEPER_ROLE, signer.address);
  
  if (!hasRole) {
    console.error("\n❌ ERROR: Address does not have KEEPER_ROLE!");
    console.error("   Your address:", signer.address);
    console.error("\n💡 Solutions:");
    console.error("   1. Use an address that has KEEPER_ROLE");
    console.error("   2. Ask admin to grant KEEPER_ROLE to your address:");
    console.error(`      await bondSeries.grantRole("${KEEPER_ROLE}", "${signer.address}")`);
    process.exitCode = 1;
    return;
  }
  
  console.log("✅ Keeper role verified");
  
  // Check snapshot status using new view function
  try {
    const status = await bondSeries.getSnapshotStatus(signer.address);
    const canRecordNow = status[0];
    const timeUntilNext = Number(status[2]);
    const isPoolExpired = status[3];
    const nextRecordTimestamp = Number(status[4]);
    
    console.log("\n📊 Snapshot Status:");
    console.log("   Can record now:", canRecordNow ? "✅ Yes" : "❌ No");
    console.log("   Pool expired:", isPoolExpired ? "⚠️ Yes" : "✅ No");
    
    if (isPoolExpired) {
      console.error("\n❌ ERROR: Pool has expired! Cannot record snapshot.");
      process.exitCode = 1;
      return;
    }
    
    if (!canRecordNow) {
      const minutesLeft = Math.floor(timeUntilNext / 60);
      const secondsLeft = timeUntilNext % 60;
      console.log("\n⚠️ Too soon! Need to wait:");
      console.log(`   ${minutesLeft} minutes ${secondsLeft} seconds`);
      console.log("   Next record time:", new Date(nextRecordTimestamp * 1000).toISOString());
      console.log("\n💡 For testing, you can fast-forward time or wait.");
      process.exitCode = 1;
      return;
    }
  } catch (error: any) {
    // Fallback to old method if new function doesn't exist
    console.log("⚠️ Using fallback status check...");
    const nextRecordTime = await bondSeries.nextRecordTime();
    const now = Math.floor(Date.now() / 1000);
    
    console.log("⏰ Current time:", new Date(now * 1000).toISOString());
    console.log("⏰ Next record time:", new Date(Number(nextRecordTime) * 1000).toISOString());
    
    if (now < Number(nextRecordTime)) {
      const timeLeft = Number(nextRecordTime) - now;
      const minutesLeft = Math.floor(timeLeft / 60);
      const secondsLeft = timeLeft % 60;
      console.log("\n⚠️ Too soon! Need to wait:");
      console.log(`   ${minutesLeft} minutes ${secondsLeft} seconds`);
      console.log("\n💡 For testing, you can fast-forward time or wait.");
      process.exitCode = 1;
      return;
    }
  }
  
  // Get info before
  const recordCountBefore = await bondSeries.recordCount();
  console.log("\n📊 Before snapshot:");
  console.log("   Record count:", recordCountBefore.toString());
  
  // Record snapshot with error handling
  console.log("\n⏳ Recording snapshot...");
  try {
    const tx = await bondSeries.recordSnapshot();
    const receipt = await tx.wait();
    console.log("✅ Snapshot recorded!");
    
    // Get info after
    const recordCountAfter = await bondSeries.recordCount();
    const snapshot = await bondSeries.snapshots(recordCountAfter);
    
    console.log("\n📊 After snapshot:");
    console.log("   Record count:", recordCountAfter.toString());
    console.log("   Total Supply:", ethers.formatUnits(snapshot.totalSupply, 6), "ABOND");
    console.log("   Treasury Balance:", ethers.formatUnits(snapshot.treasuryBalance, 6), "USDC");
    console.log("   Timestamp:", new Date(Number(snapshot.timestamp) * 1000).toISOString());
    
    // Calculate coupon due (0.001 USDC per token)
    const couponDue = (snapshot.totalSupply * BigInt(1000)) / BigInt(1e6); // Both 6 decimals
    console.log("\n💰 Coupon Due for this snapshot:");
    console.log("   Amount:", ethers.formatUnits(couponDue, 6), "USDC");
    console.log("   (Owner needs to distribute this amount)");
    
    console.log("\n🔗 Transaction:", tx.hash);
    console.log("🔗 Explorer: https://testnet.arcscan.app/tx/" + tx.hash);
    
    console.log("\n📝 Next step:");
    console.log("   Run: npx hardhat run scripts/04-distributeCoupon.ts --network arc");
  } catch (error: any) {
    console.error("\n❌ ERROR recording snapshot:");
    
    // Parse error message
    if (error.message) {
      if (error.message.includes("AccessControl")) {
        console.error("   Reason: Access denied - missing KEEPER_ROLE");
      } else if (error.message.includes("TooSoon")) {
        console.error("   Reason: Too soon to record snapshot");
      } else if (error.message.includes("PoolExpired")) {
        console.error("   Reason: Pool has expired");
      } else {
        console.error("   Reason:", error.message);
      }
    } else {
      console.error("   Error:", error);
    }
    
    // Try to get more details
    try {
      const canRecord = await bondSeries.canRecordSnapshot(signer.address);
      if (!canRecord[0]) {
        console.error("\n💡 Details:", canRecord[1]);
      }
    } catch (e) {
      // Ignore if function doesn't exist
    }
    
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});

