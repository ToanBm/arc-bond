import { ethers } from "hardhat";
import { getPoolAddresses } from "./utils/getAddresses";

/**
 * Script: Owner withdraw funds (max 70% of deposits)
 * Usage: 
 *   npx hardhat run scripts/07-ownerWithdraw.ts --network arc
 *   npx hardhat run scripts/07-ownerWithdraw.ts --network arc --pool-id 1
 */

async function main() {
  console.log("💸 Owner Withdrawing Funds...\n");

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
  
  // Get treasury status
  const treasuryStatus = await bondSeries.getTreasuryStatus();
  const treasuryBalance = treasuryStatus[0];
  const requiredReserve = treasuryStatus[1];
  const withdrawable = treasuryStatus[2];
  
  console.log("🏦 Treasury Status:");
  console.log("   Current Balance:", ethers.formatUnits(treasuryBalance, 6), "USDC");
  console.log("   Required Reserve (30%):", ethers.formatUnits(requiredReserve, 6), "USDC");
  console.log("   Withdrawable (70%):", ethers.formatUnits(withdrawable, 6), "USDC");
  
  if (withdrawable === 0n) {
    console.log("\n⚠️ No funds available to withdraw!");
    console.log("   Treasury balance is at or below required reserve.");
    return;
  }
  
  // Amount to withdraw (default: max withdrawable, can edit this)
  const WITHDRAW_AMOUNT = withdrawable; // Withdraw all available
  // Or set custom amount: const WITHDRAW_AMOUNT = ethers.parseUnits("50", 6); // 50 USDC
  
  console.log("\n💰 Withdraw Request:");
  console.log("   Amount:", ethers.formatUnits(WITHDRAW_AMOUNT, 6), "USDC");
  
  if (WITHDRAW_AMOUNT > withdrawable) {
    console.log("\n❌ Cannot withdraw more than withdrawable amount!");
    console.log("   Max allowed:", ethers.formatUnits(withdrawable, 6), "USDC");
    return;
  }
  
  // Get owner balance before
  const ownerBefore = await usdc.balanceOf(signer.address);
  console.log("\n📊 Before withdraw:");
  console.log("   Owner USDC:", ethers.formatUnits(ownerBefore, 6), "USDC");
  console.log("   Treasury USDC:", ethers.formatUnits(treasuryBalance, 6), "USDC");
  
  // Withdraw
  console.log("\n⏳ Withdrawing...");
  const withdrawTx = await bondSeries.ownerWithdraw(WITHDRAW_AMOUNT);
  await withdrawTx.wait();
  console.log("✅ Withdrawn successfully!");
  
  // Get balances after
  const ownerAfter = await usdc.balanceOf(signer.address);
  const treasuryAfter = await usdc.balanceOf(BOND_SERIES_ADDRESS);
  
  console.log("\n📊 After withdraw:");
  console.log("   Owner USDC:", ethers.formatUnits(ownerAfter, 6), "USDC");
  console.log("   Treasury USDC:", ethers.formatUnits(treasuryAfter, 6), "USDC");
  
  console.log("\n📈 Changes:");
  console.log("   Owner gained:", ethers.formatUnits(ownerAfter - ownerBefore, 6), "USDC");
  console.log("   Treasury decreased:", ethers.formatUnits(treasuryBalance - treasuryAfter, 6), "USDC");
  
  // Check new withdrawable amount
  const newTreasuryStatus = await bondSeries.getTreasuryStatus();
  console.log("\n🏦 New Treasury Status:");
  console.log("   Remaining Withdrawable:", ethers.formatUnits(newTreasuryStatus[2], 6), "USDC");
  
  console.log("\n🔗 Transaction:", withdrawTx.hash);
  console.log("🔗 Explorer: https://testnet.arcscan.app/tx/" + withdrawTx.hash);
  
  console.log("\n💡 Note:");
  console.log("   Owner can use withdrawn funds for business operations.");
  console.log("   30% reserve remains locked for coupon payments.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});

