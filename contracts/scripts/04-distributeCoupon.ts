import { ethers } from "hardhat";
import { getPoolAddresses } from "./utils/getAddresses";

/**
 * Script: Distribute coupon (Owner function)
 * Usage: 
 *   npx hardhat run scripts/04-distributeCoupon.ts --network arc
 *   npx hardhat run scripts/04-distributeCoupon.ts --network arc --pool-id 1
 * 
 * Owner deposits USDC to fund coupon payments.
 * Index increases continuously, this function snapshots the current index.
 */

async function main() {
  console.log("💸 Distributing Coupon (Owner deposit)...\n");

  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // Get pool ID from args
  const poolIdArg = process.argv.find(arg => arg.startsWith("--pool-id"));
  const poolId = poolIdArg ? (poolIdArg.split("=")[1] || process.argv[process.argv.indexOf(poolIdArg) + 1]) : undefined;

  console.log("📍 Owner address:", signer.address);

  // Get contract addresses from Factory
  const { USDC_ADDRESS, BOND_SERIES_ADDRESS, POOL_ID } = await getPoolAddresses(chainId, poolId);
  console.log("📍 Pool ID:", POOL_ID);

  // Get contracts
  const usdc = await ethers.getContractAt("contracts/IERC20.sol:IERC20", USDC_ADDRESS);
  const bondSeries = await ethers.getContractAt("BondSeries", BOND_SERIES_ADDRESS);

  // Get current status
  const bondTokenAddress = await bondSeries.bondToken();
  const bondToken = await ethers.getContractAt("BondToken", bondTokenAddress);
  const totalSupply = await bondToken.totalSupply();
  const lastDistributionTime = await bondSeries.lastDistributionTime();
  const currentIndex = await bondSeries.getCurrentIndex();

  console.log("📊 Current Status:");
  console.log("   Total Supply:", ethers.formatUnits(totalSupply, 6), "ABOND");
  console.log("   Current Index:", ethers.formatUnits(currentIndex, 6));
  console.log("   Last Distribution Time:", new Date(Number(lastDistributionTime) * 1000).toISOString());

  // Calculate time elapsed since last distribution
  const timeElapsed = BigInt(Math.floor(Date.now() / 1000)) - lastDistributionTime;
  const daysElapsed = Number(timeElapsed) / 86400;
  console.log("   Time Elapsed:", daysElapsed.toFixed(2), "days");

  // Calculate recommended amount (optional: 1% per day per token)
  // Owner can deposit any amount
  const recommendedAmount = (totalSupply * BigInt(1000)) / BigInt(1e6); // 0.001 per token
  const recommendedForDays = (recommendedAmount * BigInt(Math.floor(daysElapsed))) / BigInt(1);

  console.log("\n💰 Recommended deposit:");
  console.log("   Per day (1% of totalSupply):", ethers.formatUnits(recommendedAmount, 6), "USDC");
  console.log("   For elapsed time:", ethers.formatUnits(recommendedForDays, 6), "USDC");

  // Use recommended amount or allow user to specify
  const AMOUNT_USDC = recommendedAmount > 0n ? recommendedAmount : ethers.parseUnits("1", 6); // Default 1 USDC if no supply
  console.log("\n💵 Amount to deposit:", ethers.formatUnits(AMOUNT_USDC, 6), "USDC");

  // Check owner balance
  const ownerBalance = await usdc.balanceOf(signer.address);
  console.log("   Owner Balance:", ethers.formatUnits(ownerBalance, 6), "USDC");

  if (ownerBalance < AMOUNT_USDC) {
    console.log("\n❌ Insufficient USDC balance!");
    console.log("💡 Run: npx hardhat run scripts/01-mintUSDC.ts --network arc");
    return;
  }

  // Get index before
  const indexBefore = currentIndex;
  console.log("\n📊 Before distribution:");
  console.log("   Current Index:", ethers.formatUnits(indexBefore, 6));

  // Approve USDC
  console.log("\n⏳ Approving USDC...");
  const approveTx = await usdc.approve(BOND_SERIES_ADDRESS, AMOUNT_USDC);
  await approveTx.wait();
  console.log("✅ Approved");

  // Distribute interest (deposit USDC and snapshot index)
  console.log("⏳ Depositing USDC and snapshotting index...");
  const distributeTx = await bondSeries.distributeInterest(AMOUNT_USDC);
  await distributeTx.wait();
  console.log("✅ Distribution complete!");

  // Get index after (should be same as current index, but lastDistributionTime updated)
  const indexAfter = await bondSeries.getCurrentIndex();
  const newLastDistributionTime = await bondSeries.lastDistributionTime();
  console.log("\n📊 After distribution:");
  console.log("   Index Snapshot:", ethers.formatUnits(indexAfter, 6));
  console.log("   Last Distribution Time:", new Date(Number(newLastDistributionTime) * 1000).toISOString());

  console.log("\n🔗 Transaction:", distributeTx.hash);
  console.log("🔗 Explorer: https://testnet.arcscan.app/tx/" + distributeTx.hash);

  console.log("\n📝 Next step:");
  console.log("   Users can now claim interest!");
  console.log("   Run: npx hardhat run scripts/05-claimInterest.ts --network arc");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});

