import { ethers } from "hardhat";
import { getPoolAddresses } from "./utils/getAddresses";

/**
 * Script: Deposit USDC to get BondTokens
 * Usage: 
 *   npx hardhat run scripts/02-deposit.ts --network arc
 *   npx hardhat run scripts/02-deposit.ts --network arc --pool-id 1
 */

async function main() {
  console.log("💼 Depositing USDC to BondSeries...\n");

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
  
  // Amount to deposit (change this as needed)
  const AMOUNT_USDC = 2; // 2 USDC
  const amountInWei = ethers.parseUnits(AMOUNT_USDC.toString(), 6);
  
  // Get contracts
  const usdc = await ethers.getContractAt("contracts/IERC20.sol:IERC20", USDC_ADDRESS);
  const bondSeries = await ethers.getContractAt("BondSeries", BOND_SERIES_ADDRESS);
  const bondToken = await ethers.getContractAt("BondToken", BOND_TOKEN_ADDRESS);
  
  // Check balances before
  const usdcBefore = await usdc.balanceOf(signer.address);
  const bondBefore = await bondToken.balanceOf(signer.address);
  
  console.log("💵 USDC balance:", ethers.formatUnits(usdcBefore, 6), "USDC");
  console.log("🎫 BondToken balance:", ethers.formatUnits(bondBefore, 6), "ABOND");
  
  if (usdcBefore < amountInWei) {
    console.log("\n❌ Insufficient USDC balance!");
    console.log("💡 Run: npx hardhat run scripts/01-mintUSDC.ts --network arc");
    return;
  }
  
  // Approve USDC
  console.log(`\n⏳ Approving ${AMOUNT_USDC} USDC...`);
  const approveTx = await usdc.approve(BOND_SERIES_ADDRESS, amountInWei);
  await approveTx.wait();
  console.log("✅ Approved");
  
  // Deposit
  console.log(`⏳ Depositing ${AMOUNT_USDC} USDC...`);
  const depositTx = await bondSeries.deposit(amountInWei);
  await depositTx.wait();
  console.log("✅ Deposited successfully!");
  
  // Check balances after
  const usdcAfter = await usdc.balanceOf(signer.address);
  const bondAfter = await bondToken.balanceOf(signer.address);
  
  console.log("\n📊 Results:");
  console.log("💵 USDC balance:", ethers.formatUnits(usdcAfter, 6), "USDC");
  console.log("🎫 BondToken balance:", ethers.formatUnits(bondAfter, 6), "ABOND");
  console.log("📈 BondToken received:", ethers.formatUnits(bondAfter - bondBefore, 6), "ABOND");
  
  console.log("\n🔗 Transaction:", depositTx.hash);
  console.log("🔗 Explorer: https://testnet.arcscan.app/tx/" + depositTx.hash);
  
  // Get series info
  const seriesInfo = await bondSeries.getSeriesInfo();
  console.log("\n📋 Series Info:");
  console.log("   Total Deposited:", ethers.formatUnits(seriesInfo[1], 6), "USDC");
  console.log("   Total Supply:", ethers.formatUnits(seriesInfo[2], 6), "ABOND");
  console.log("   Current Index:", ethers.formatUnits(seriesInfo[3], 6));
  console.log("   Last Distribution Time:", new Date(Number(seriesInfo[4]) * 1000).toISOString());
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});

