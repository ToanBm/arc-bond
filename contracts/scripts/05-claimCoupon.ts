import { ethers } from "hardhat";
import { getPoolAddresses } from "./utils/getAddresses";

/**
 * Script: Claim accumulated coupon (User function)
 * Usage: 
 *   npx hardhat run scripts/05-claimCoupon.ts --network arc
 *   npx hardhat run scripts/05-claimCoupon.ts --network arc --pool-id 1
 */

async function main() {
  console.log("💰 Claiming Interest...\n");

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

  // Check user holdings
  const bondBalance = await bondToken.balanceOf(signer.address);
  console.log("🎫 Your BondToken balance:", ethers.formatUnits(bondBalance, 6), "ABOND");

  if (bondBalance === 0n) {
    console.log("\n⚠️ You don't have any BondTokens!");
    console.log("💡 Run: npx hardhat run scripts/02-deposit.ts --network arc");
    return;
  }

  // Check claimable amount
  const claimable = await bondSeries.claimableAmount(signer.address);
  console.log("💵 Claimable interest:", ethers.formatUnits(claimable, 6), "USDC");

  if (claimable === 0n) {
    console.log("\n⚠️ No interest to claim yet!");
    console.log("💡 Either:");
    console.log("   1. Owner hasn't deposited USDC yet (run script 04)");
    console.log("   2. You already claimed all available interest");
    console.log("   3. Interest hasn't accrued yet (need time to pass)");
    return;
  }

  // Get balances before
  const usdcBefore = await usdc.balanceOf(signer.address);
  const currentIndex = await bondSeries.getCurrentIndex();
  const claimedIndex = await bondSeries.claimedIndex(signer.address);

  console.log("\n📊 Before claim:");
  console.log("   USDC balance:", ethers.formatUnits(usdcBefore, 6), "USDC");
  console.log("   Current Index:", ethers.formatUnits(currentIndex, 6));
  console.log("   Your Claimed Index:", ethers.formatUnits(claimedIndex, 6));

  // Claim interest
  console.log("\n⏳ Claiming interest...");
  const claimTx = await bondSeries.claimInterest();
  await claimTx.wait();
  console.log("✅ Interest claimed!");

  // Get balances after
  const usdcAfter = await usdc.balanceOf(signer.address);
  const claimedIndexAfter = await bondSeries.claimedIndex(signer.address);

  console.log("\n📊 After claim:");
  console.log("   USDC balance:", ethers.formatUnits(usdcAfter, 6), "USDC");
  console.log("   USDC received:", ethers.formatUnits(usdcAfter - usdcBefore, 6), "USDC");
  console.log("   Your Claimed Index:", ethers.formatUnits(claimedIndexAfter, 6));

  console.log("\n🔗 Transaction:", claimTx.hash);
  console.log("🔗 Explorer: https://testnet.arcscan.app/tx/" + claimTx.hash);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});

