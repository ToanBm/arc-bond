import { ethers } from "hardhat";
import { getPoolAddresses } from "./utils/getAddresses";

/**
 * Script: Check if deployed contract is old version (with snapshot) or new version (auto-interest)
 * Usage: 
 *   npx hardhat run scripts/99-checkContractVersion.ts --network arc
 *   npx hardhat run scripts/99-checkContractVersion.ts --network arc --pool-id 1
 */

async function main() {
  console.log("🔍 Checking Contract Version...\n");

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Get pool ID from args
  const poolIdArg = process.argv.find(arg => arg.startsWith("--pool-id"));
  const poolId = poolIdArg ? (poolIdArg.split("=")[1] || process.argv[process.argv.indexOf(poolIdArg) + 1]) : undefined;
  
  const { BOND_SERIES_ADDRESS, POOL_ID } = await getPoolAddresses(chainId, poolId);
  
  const bondSeries = await ethers.getContractAt("BondSeries", BOND_SERIES_ADDRESS);
  
  console.log("📍 Pool ID:", POOL_ID);
  console.log("📍 Contract Address:", BOND_SERIES_ADDRESS);
  console.log("");
  
  // Check if contract has new functions
  try {
    const currentIndex = await bondSeries.getCurrentIndex();
    const lastDistributionIndex = await bondSeries.lastDistributionIndex();
    const lastDistributionTime = await bondSeries.lastDistributionTime();
    
    console.log("✅ Contract is NEW VERSION (Auto-Interest)");
    console.log("   Current Index:", ethers.formatUnits(currentIndex, 6));
    console.log("   Last Distribution Index:", ethers.formatUnits(lastDistributionIndex, 6));
    console.log("   Last Distribution Time:", new Date(Number(lastDistributionTime) * 1000).toISOString());
    
    // If lastDistributionIndex = 0 and lastDistributionTime = deploy time, it's fresh
    if (lastDistributionIndex === 0n) {
      console.log("\n   ✨ Contract is fresh (just deployed)");
    } else {
      console.log("\n   ⚠️ Contract has been used (has distribution history)");
    }
    
  } catch (error: any) {
    // Try old version functions
    try {
      const recordCount = await bondSeries.recordCount();
      const cumulativeIndex = await bondSeries.cumulativeCouponIndex();
      
      console.log("❌ Contract is OLD VERSION (Snapshot-based)");
      console.log("   Record Count:", recordCount.toString());
      console.log("   Cumulative Index:", ethers.formatUnits(cumulativeIndex, 6));
      console.log("\n   💡 You need to deploy a NEW contract to test auto-interest feature");
      console.log("   💡 The old contract cannot be upgraded (non-upgradeable)");
    } catch (error2: any) {
      console.log("❌ Error checking contract:", error.message);
      console.log("   Could not determine contract version");
    }
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});

