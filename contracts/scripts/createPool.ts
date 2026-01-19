import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { getAddresses } from "./utils/getAddresses";

async function main() {
  console.log("🏊 Creating New Bond Pool...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Using account:", deployer.address);

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
  console.log("1️⃣ BondFactory:", addresses.BondFactory);
  console.log("");

  // ==================== 2. Get Pool Parameters ====================
  // You can modify these parameters
  const poolName = process.env.POOL_NAME || "ArcBond Series 1";
  const keeperAddress = process.env.KEEPER_ADDRESS || "0x7A6b18979a03d15DCBd5bB68E437aF61b0BD5C1d";
  const maturityHours = process.env.MATURITY_HOURS ? parseInt(process.env.MATURITY_HOURS) : 336; // 336 hours default (2 weeks)

  console.log("2️⃣ Pool Parameters:");
  console.log("   Name:          ", poolName);
  console.log("   Symbol:        arcUSDC (hardcoded in contract)");
  console.log("   Keeper:        ", keeperAddress);
  console.log("   Maturity Hours: ", maturityHours);
  console.log("");

  // ==================== 3. Create Pool ====================
  console.log("3️⃣ Creating pool...");
  const tx = await bondFactory.createPool(
    poolName,
    keeperAddress,
    maturityHours
  );
  console.log("   Transaction:", tx.hash);

  const receipt = await tx.wait();
  console.log("   Block:", receipt?.blockNumber);
  console.log("");

  // ==================== 4. Get Pool Info ====================
  const poolCount = await bondFactory.poolCount();
  console.log("4️⃣ New pool created!");
  console.log("   Pool ID:", poolCount.toString());

  const poolInfo = await bondFactory.getPool(poolCount);
  console.log("   BondToken:   ", poolInfo.bondToken);
  console.log("   BondSeries:  ", poolInfo.bondSeries);
  console.log("   Maturity Date:", new Date(Number(poolInfo.maturityDate) * 1000).toISOString());
  console.log("   Created At:   ", new Date(Number(poolInfo.createdAt) * 1000).toISOString());
  console.log("");

  // ==================== 5. Update Deployment File ====================
  console.log("5️⃣ Updating deployment file...");
  const deploymentPath = path.join(__dirname, "../deployments/bond-factory.json");
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  if (!deploymentData[chainId.toString()].contracts.pools) {
    deploymentData[chainId.toString()].contracts.pools = {};
  }

  deploymentData[chainId.toString()].contracts.pools[poolCount.toString()] = {
    poolId: poolCount.toString(),
    name: poolInfo.name,
    symbol: poolInfo.symbol,
    bondToken: poolInfo.bondToken,
    bondSeries: poolInfo.bondSeries,
    maturityDate: poolInfo.maturityDate.toString(),
    createdAt: poolInfo.createdAt.toString(),
    isActive: poolInfo.isActive
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log("✅ Deployment file updated");
  console.log("");

  // ==================== Summary ====================
  console.log("=".repeat(60));
  console.log("🎉 Pool Created Successfully!");
  console.log("=".repeat(60));
  console.log("");
  console.log("📋 Pool Details:");
  console.log("   Pool ID:      ", poolCount.toString());
  console.log("   BondToken:    ", poolInfo.bondToken);
  console.log("   BondSeries:   ", poolInfo.bondSeries);
  console.log("");
  console.log("🔗 Explorers:");
  console.log("   BondToken:    https://testnet.arcscan.app/address/" + poolInfo.bondToken);
  console.log("   BondSeries:   https://testnet.arcscan.app/address/" + poolInfo.bondSeries);
  console.log("");
}

main().catch((error) => {
  console.error("❌ Pool creation failed:", error);
  process.exitCode = 1;
});

