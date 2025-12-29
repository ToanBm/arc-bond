import { ethers } from "hardhat";
import { getPoolAddresses } from "./utils/getAddresses";

/**
 * Script: Owner deposit USDC into treasury
 * Usage: 
 *   npx hardhat run scripts/ownerDepositUSDC.ts --network arc
 *   npx hardhat run scripts/ownerDepositUSDC.ts --network arc --pool-id 1
 * 
 * Use case: Replenish treasury to ensure enough funds for redemptions
 */

async function main() {
  console.log("💰 Owner Depositing USDC to Treasury...\n");

  const [owner] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Get pool ID from args
  const poolIdArg = process.argv.find(arg => arg.startsWith("--pool-id"));
  const poolId = poolIdArg ? (poolIdArg.split("=")[1] || process.argv[process.argv.indexOf(poolIdArg) + 1]) : undefined;
  
  console.log("📍 Owner address:", owner.address);

  // Get contract addresses from Factory
  const { USDC_ADDRESS, BOND_SERIES_ADDRESS, POOL_ID } = await getPoolAddresses(chainId, poolId);
  console.log("📍 Pool ID:", POOL_ID);
  
  // Get contracts
  const usdc = await ethers.getContractAt("contracts/IERC20.sol:IERC20", USDC_ADDRESS);
  const bondSeries = await ethers.getContractAt("BondSeries", BOND_SERIES_ADDRESS);
  
  // Amount to deposit (CHANGE THIS)
  const AMOUNT_USDC = 2; // 2 USDC
  const amountInWei = ethers.parseUnits(AMOUNT_USDC.toString(), 6);
  
  console.log("💵 Deposit amount:", AMOUNT_USDC, "USDC");
  console.log("");
  
  // Get treasury status before
  const treasuryStatus = await bondSeries.getTreasuryStatus();
  const treasuryBefore = treasuryStatus[0];
  
  console.log("📊 Before deposit:");
  console.log("   Treasury Balance:", ethers.formatUnits(treasuryBefore, 6), "USDC");
  
  // Check owner balance
  const ownerBalance = await usdc.balanceOf(owner.address);
  console.log("   Owner Balance:", ethers.formatUnits(ownerBalance, 6), "USDC");
  
  if (ownerBalance < amountInWei) {
    console.log("\n❌ Insufficient USDC balance!");
    console.log("   Need:", ethers.formatUnits(amountInWei, 6), "USDC");
    console.log("   Have:", ethers.formatUnits(ownerBalance, 6), "USDC");
    return;
  }
  
  // Transfer USDC to BondSeries contract
  console.log("\n⏳ Transferring USDC to treasury...");
  const tx = await usdc.transfer(BOND_SERIES_ADDRESS, amountInWei);
  await tx.wait();
  console.log("✅ Transfer successful!");
  
  // Get treasury status after
  const treasuryStatusAfter = await bondSeries.getTreasuryStatus();
  const treasuryAfter = treasuryStatusAfter[0];
  
  console.log("\n📊 After deposit:");
  console.log("   Treasury Balance:", ethers.formatUnits(treasuryAfter, 6), "USDC");
  console.log("   Increase:", ethers.formatUnits(treasuryAfter - treasuryBefore, 6), "USDC");
  
  console.log("\n🔗 Transaction:", tx.hash);
  console.log("🔗 Explorer: https://testnet.arcscan.app/tx/" + tx.hash);
  
  console.log("\n✅ Treasury replenished! Users can now redeem their principal.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});

