import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { getAddresses } from "./utils/getAddresses";

/**
 * Script: View current status of BondSeries
 * Usage: 
 *   Legacy: npx hardhat run scripts/00-viewStatus.ts --network arc
 *   Factory: npx hardhat run scripts/00-viewStatus.ts --network arc [--pool-id 1]
 */

async function main() {
  console.log("📊 ArcBond System Status\n");
  console.log("=".repeat(60));

  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // Check which mode: Factory or Legacy
  const factoryPath = path.join(__dirname, "../deployments/bond-factory.json");
  const systemPath = path.join(__dirname, "../deployments/bond-system.json");
  
  let BOND_SERIES_ADDRESS: string;
  let BOND_TOKEN_ADDRESS: string;
  let USDC_ADDRESS: string;
  let poolId: string | null = null;

  if (fs.existsSync(factoryPath)) {
    // Factory mode
    const addresses = getAddresses(chainId, "bond-factory.json");
    USDC_ADDRESS = addresses.USDC!;
    
    // Get pool ID from args or use newest
    const poolIdArg = process.argv.find(arg => arg.startsWith("--pool-id"));
    if (poolIdArg) {
      poolId = poolIdArg.split("=")[1] || process.argv[process.argv.indexOf(poolIdArg) + 1];
    }
    
    if (!poolId) {
      // Get newest pool
      const pools = addresses.pools;
      const poolIds = Object.keys(pools).sort((a, b) => Number(b) - Number(a));
      poolId = poolIds[0];
    }
    
    if (!poolId || !addresses.pools[poolId]) {
      throw new Error(`❌ Pool ${poolId || "not found"} not found in bond-factory.json`);
    }
    
    const pool = addresses.pools[poolId];
    BOND_SERIES_ADDRESS = pool.bondSeries;
    BOND_TOKEN_ADDRESS = pool.bondToken;
    
    console.log("📍 Network:", network.name, `(Chain ID: ${chainId})`);
    console.log("📍 Mode: Factory (Multiple Pools)");
    console.log("📍 Pool ID:", poolId);
    console.log("📍 Contracts loaded from deployments/bond-factory.json\n");
  } else if (fs.existsSync(systemPath)) {
    // Legacy mode
    const addresses = getAddresses(chainId, "bond-system.json");
    USDC_ADDRESS = addresses.USDC!;
    BOND_SERIES_ADDRESS = addresses.BondSeries!;
    BOND_TOKEN_ADDRESS = addresses.BondToken!;
    
    console.log("📍 Network:", network.name, `(Chain ID: ${chainId})`);
    console.log("📍 Mode: Legacy (Single Pool)");
    console.log("📍 Contracts loaded from deployments/bond-system.json\n");
  } else {
    throw new Error("❌ No deployment file found! Run deployBondSystem.ts or deployFactory.ts first.");
  }
  
  // Get contracts
  const usdc = await ethers.getContractAt("contracts/IERC20.sol:IERC20", USDC_ADDRESS);
  const bondSeries = await ethers.getContractAt("BondSeries", BOND_SERIES_ADDRESS);
  const bondToken = await ethers.getContractAt("BondToken", BOND_TOKEN_ADDRESS);
  
  // Get series info
  const seriesInfo = await bondSeries.getSeriesInfo();
  const maturityDate = seriesInfo[0];
  const totalDeposited = seriesInfo[1];
  const totalSupply = seriesInfo[2];
  const currentIndex = seriesInfo[3];
  const lastDistributionTime = seriesInfo[4];
  const emergencyMode = seriesInfo[5];
  
  // Get treasury status
  const treasuryStatus = await bondSeries.getTreasuryStatus();
  const treasuryBalance = treasuryStatus[0];
  const requiredReserve = treasuryStatus[1];
  const withdrawable = treasuryStatus[2];
  
  const now = Math.floor(Date.now() / 1000);
  
  console.log("\n🏦 SERIES INFORMATION");
  console.log("-".repeat(60));
  console.log("Maturity Date:", new Date(Number(maturityDate) * 1000).toISOString());
  console.log("Status:", now >= Number(maturityDate) ? "✅ MATURED" : "⏳ ACTIVE");
  console.log("Emergency Mode:", emergencyMode ? "🚨 ENABLED" : "✅ Normal");
  
  console.log("\n💰 FINANCIAL STATUS");
  console.log("-".repeat(60));
  console.log("Total Deposited:", ethers.formatUnits(totalDeposited, 6), "USDC");
  console.log("Total BondToken Supply:", ethers.formatUnits(totalSupply, 6), "ABOND");
  console.log("Treasury Balance:", ethers.formatUnits(treasuryBalance, 6), "USDC");
  console.log("Required Reserve (30%):", ethers.formatUnits(requiredReserve, 6), "USDC");
  console.log("Owner Withdrawable:", ethers.formatUnits(withdrawable, 6), "USDC");
  
  console.log("\n📈 COUPON INDEX (Continuous Accrual)");
  console.log("-".repeat(60));
  console.log("Current Index:", ethers.formatUnits(currentIndex, 6));
  console.log("Last Distribution Time:", new Date(Number(lastDistributionTime) * 1000).toISOString());
  const timeSinceLastDist = now - Number(lastDistributionTime);
  const daysSinceLastDist = timeSinceLastDist / 86400;
  const hoursSinceLastDist = timeSinceLastDist / 3600;
  const minutesSinceLastDist = timeSinceLastDist / 60;
  
  if (daysSinceLastDist >= 1) {
    console.log("Time Since Last Distribution:", daysSinceLastDist.toFixed(2), "days");
  } else if (hoursSinceLastDist >= 1) {
    console.log("Time Since Last Distribution:", hoursSinceLastDist.toFixed(2), "hours");
  } else if (minutesSinceLastDist >= 1) {
    console.log("Time Since Last Distribution:", minutesSinceLastDist.toFixed(2), "minutes");
  } else {
    console.log("Time Since Last Distribution:", timeSinceLastDist, "seconds");
  }
  
  if (timeSinceLastDist > 3 * 86400) {
    console.log("⚠️ WARNING: More than 3 days since last distribution!");
  }
  
  console.log("\n👤 YOUR ACCOUNT");
  console.log("-".repeat(60));
  console.log("Address:", signer.address);
  
  const yourUSDC = await usdc.balanceOf(signer.address);
  const yourBond = await bondToken.balanceOf(signer.address);
  const yourClaimable = await bondSeries.claimableAmount(signer.address);
  const yourClaimedIndex = await bondSeries.claimedIndex(signer.address);
  
  console.log("USDC Balance:", ethers.formatUnits(yourUSDC, 6), "USDC");
  console.log("BondToken Balance:", ethers.formatUnits(yourBond, 6), "ABOND");
  console.log("Claimable Coupon:", ethers.formatUnits(yourClaimable, 6), "USDC");
  console.log("Your Claimed Index:", ethers.formatUnits(yourClaimedIndex, 6));
  
  if (yourBond > 0n) {
    const yourPrincipal = yourBond / BigInt(10); // 0.1 USDC per ABOND (both 6 decimals)
    console.log("Redeemable Principal:", ethers.formatUnits(yourPrincipal, 6), "USDC");
  }
  
  console.log("\n📝 NEXT STEPS");
  console.log("-".repeat(60));
  
  if (yourBond === 0n) {
    console.log("1. Get USDC from faucet/bridge (if needed)");
    console.log("2. Deposit: npx hardhat run scripts/02-deposit.ts --network arc");
  } else {
    if (timeSinceLastDist > 3 * 86400) {
      console.log("⚠️ WARNING: More than 3 days since last distribution!");
      console.log("   Owner should distribute coupon: npx hardhat run scripts/04-distributeCoupon.ts --network arc");
    }
    
    if (yourClaimable > 0n) {
      console.log("💰 You can claim coupon now!");
      console.log("   npx hardhat run scripts/05-claimCoupon.ts --network arc");
    }
    
    if (now >= Number(maturityDate)) {
      console.log("🔄 You can redeem principal now!");
      console.log("   npx hardhat run scripts/06-redeem.ts --network arc");
    } else {
      console.log("💡 Tip: Interest accrues continuously. Check back later to claim!");
    }
  }
  
  console.log("\n" + "=".repeat(60));
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});

