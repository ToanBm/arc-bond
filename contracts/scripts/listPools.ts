import { ethers } from "hardhat";
import { getAddresses } from "./utils/getAddresses";

async function main() {
  console.log("📋 Listing All Bond Pools...\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`📍 Network: ${network.name} (Chain ID: ${chainId})\n`);

  // ==================== 1. Load Factory Address ====================
  const addresses = getAddresses(chainId, "bond-factory.json");
  if (!addresses.BondFactory) {
    throw new Error("BondFactory address not found. Please deploy factory first.");
  }
  
  const BondFactory = await ethers.getContractFactory("BondFactory");
  const bondFactory = BondFactory.attach(addresses.BondFactory);
  console.log("🏭 BondFactory:", addresses.BondFactory);
  console.log("");

  // ==================== 2. Get Pool Count ====================
  const poolCount = await bondFactory.poolCount();
  console.log("📊 Total Pools:", poolCount.toString());
  console.log("");

  if (poolCount === 0n) {
    console.log("ℹ️  No pools created yet. Use createPool.ts to create one.");
    return;
  }

  // ==================== 3. Get All Pools ====================
  console.log("=" .repeat(80));
  console.log("📋 All Pools:");
  console.log("=" .repeat(80));
  console.log("");

  const allPools = await bondFactory.getAllPools();
  
  // Get current block timestamp
  const currentBlock = await ethers.provider.getBlock("latest");
  const currentTimestamp = currentBlock?.timestamp || 0;
  
  for (let i = 0; i < allPools.length; i++) {
    const pool = allPools[i];
    const maturityDate = new Date(Number(pool.maturityDate) * 1000);
    const createdAt = new Date(Number(pool.createdAt) * 1000);
    const isMatured = currentTimestamp >= Number(pool.maturityDate);
    const isActive = pool.isActive && !isMatured;
    
    console.log(`🏊 Pool #${pool.poolId}`);
    console.log("   Name:          ", pool.name);
    console.log("   Symbol:        ", pool.symbol);
    console.log("   BondToken:     ", pool.bondToken);
    console.log("   BondSeries:    ", pool.bondSeries);
    console.log("   Created:       ", createdAt.toISOString());
    console.log("   Maturity:      ", maturityDate.toISOString());
    console.log("   Status:        ", isActive ? "✅ Active" : isMatured ? "⏰ Matured" : "❌ Inactive");
    console.log("");
  }

  // ==================== 4. Get Active Pools Only ====================
  const activePools = await bondFactory.getActivePools();
  console.log("=" .repeat(80));
  console.log(`✅ Active Pools: ${activePools.length}`);
  console.log("=" .repeat(80));
  console.log("");

  // Get current block timestamp
  const currentBlock2 = await ethers.provider.getBlock("latest");
  const currentTimestamp2 = currentBlock2?.timestamp || 0;
  
  if (activePools.length === 0) {
    console.log("ℹ️  No active pools at the moment.");
  } else {
    for (let i = 0; i < activePools.length; i++) {
      const pool = activePools[i];
      const maturityDate = new Date(Number(pool.maturityDate) * 1000);
      const timeRemaining = Number(pool.maturityDate) - currentTimestamp2;
      const daysRemaining = Math.floor(timeRemaining / 86400);
      const hoursRemaining = Math.floor((timeRemaining % 86400) / 3600);
      
      console.log(`🏊 Pool #${pool.poolId} - ${pool.name}`);
      console.log("   Symbol:        ", pool.symbol);
      console.log("   BondSeries:    ", pool.bondSeries);
      console.log("   Maturity:      ", maturityDate.toISOString());
      console.log("   Time Remaining:", `${daysRemaining}d ${hoursRemaining}h`);
      console.log("");
    }
  }
}

main().catch((error) => {
  console.error("❌ Failed to list pools:", error);
  process.exitCode = 1;
});

