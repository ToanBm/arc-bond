import { ethers } from "hardhat";
import { getPoolAddresses } from "./utils/getAddresses";

/**
 * Script: Redeem BondTokens for USDC principal at maturity
 * Usage: 
 *   npx hardhat run scripts/06-redeem.ts --network arc
 *   npx hardhat run scripts/06-redeem.ts --network arc --pool-id 1
 */

async function main() {
  console.log("🔄 Redeeming BondTokens...\n");

  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Get pool ID from args
  const poolIdArg = process.argv.find(arg => arg.startsWith("--pool-id"));
  const poolId = poolIdArg ? (poolIdArg.split("=")[1] || process.argv[process.argv.indexOf(poolIdArg) + 1]) : undefined;
  
  console.log("📍 Your address:", signer.address);

  // Get contract addresses from Factory
  const { USDC_ADDRESS, BOND_SERIES_ADDRESS, BOND_TOKEN_ADDRESS, POOL_ID } = await getPoolAddresses(chainId, poolId);
  console.log("📍 Pool ID:", POOL_ID);
  
  // Get contracts
  const usdc = await ethers.getContractAt("contracts/IERC20.sol:IERC20", USDC_ADDRESS);
  const bondSeries = await ethers.getContractAt("BondSeries", BOND_SERIES_ADDRESS);
  const bondToken = await ethers.getContractAt("BondToken", BOND_TOKEN_ADDRESS);
  
  // Check maturity
  const seriesInfo = await bondSeries.getSeriesInfo();
  const maturityDate = seriesInfo[0];
  const now = Math.floor(Date.now() / 1000);
  
  console.log("⏰ Current time:", new Date(now * 1000).toISOString());
  console.log("⏰ Maturity date:", new Date(Number(maturityDate) * 1000).toISOString());
  
  if (now < Number(maturityDate)) {
    const timeLeft = Number(maturityDate) - now;
    const daysLeft = Math.floor(timeLeft / 86400);
    const hoursLeft = Math.floor((timeLeft % 86400) / 3600);
    console.log("\n⚠️ Not matured yet! Need to wait:");
    console.log(`   ${daysLeft} days ${hoursLeft} hours`);
    console.log("\n💡 For testnet, you can:");
    console.log("   1. Wait until maturity");
    console.log("   2. Or test with emergencyRedeem if default scenario");
    return;
  }
  
  // Check user holdings
  const bondBalance = await bondToken.balanceOf(signer.address);
  console.log("\n🎫 Your BondToken balance:", ethers.formatUnits(bondBalance, 6), "ABOND");
  
  if (bondBalance === 0n) {
    console.log("\n⚠️ You don't have any BondTokens to redeem!");
    return;
  }
  
  // Check claimable coupon before redeem
  const claimable = await bondSeries.claimableAmount(signer.address);
  if (claimable > 0n) {
    console.log("💰 You have unclaimed coupon:", ethers.formatUnits(claimable, 6), "USDC");
    console.log("   (Will be auto-claimed during redeem)");
  }
  
  // Amount to redeem (default: all balance)
  const redeemAmount = bondBalance;
  const expectedUSDC = redeemAmount / BigInt(10); // 0.1 USDC per token (both 6 decimals)
  
  console.log("\n📊 Redemption preview:");
  console.log("   BondTokens to burn:", ethers.formatUnits(redeemAmount, 6), "ABOND");
  console.log("   USDC to receive:", ethers.formatUnits(expectedUSDC, 6), "USDC");
  
  // Get balances before
  const usdcBefore = await usdc.balanceOf(signer.address);
  const bondBefore = await bondToken.balanceOf(signer.address);
  
  console.log("\n📊 Before redeem:");
  console.log("   USDC balance:", ethers.formatUnits(usdcBefore, 6), "USDC");
  console.log("   BondToken balance:", ethers.formatUnits(bondBefore, 6), "ABOND");
  
  // Redeem
  console.log("\n⏳ Redeeming...");
  const redeemTx = await bondSeries.redeem(redeemAmount);
  await redeemTx.wait();
  console.log("✅ Redeemed successfully!");
  
  // Get balances after
  const usdcAfter = await usdc.balanceOf(signer.address);
  const bondAfter = await bondToken.balanceOf(signer.address);
  
  console.log("\n📊 After redeem:");
  console.log("   USDC balance:", ethers.formatUnits(usdcAfter, 6), "USDC");
  console.log("   BondToken balance:", ethers.formatUnits(bondAfter, 6), "ABOND");
  console.log("\n📈 Changes:");
  console.log("   USDC gained:", ethers.formatUnits(usdcAfter - usdcBefore, 6), "USDC");
  console.log("   BondToken burned:", ethers.formatUnits(bondBefore - bondAfter, 6), "ABOND");
  
  console.log("\n🔗 Transaction:", redeemTx.hash);
  console.log("🔗 Explorer: https://testnet.arcscan.app/tx/" + redeemTx.hash);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});

