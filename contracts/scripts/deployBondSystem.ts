import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying ArcBond System...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`📍 Network: ${network.name} (Chain ID: ${chainId})\n`);

  // ==================== 1. USDC Address ====================
  // Official Arc Testnet USDC
  const usdcAddress = "0x3600000000000000000000000000000000000000";
  console.log("1️⃣ Using Arc Testnet USDC:", usdcAddress);
  console.log("");

  // ==================== 2. Deploy BondToken ====================
  console.log("2️⃣ Deploying BondToken...");
  const BondToken = await ethers.getContractFactory("BondToken");
  const bondToken = await BondToken.deploy(
    "ArcBond USDC",
    "arcUSDC",
    deployer.address // Temporary owner
  );
  await bondToken.waitForDeployment();
  const bondTokenAddress = await bondToken.getAddress();
  console.log("✅ BondToken deployed to:", bondTokenAddress);
  console.log("");

  // ==================== 3. Deploy BondSeries ====================
  console.log("3️⃣ Deploying BondSeries...");
  const MATURITY_MINUTES = 15; // 15 minutes for testing
  const BondSeries = await ethers.getContractFactory("BondSeries");
  const bondSeries = await BondSeries.deploy(
    bondTokenAddress,
    usdcAddress,
    deployer.address, // Keeper (can change later)
    MATURITY_MINUTES
  );
  await bondSeries.waitForDeployment();
  const bondSeriesAddress = await bondSeries.getAddress();
  console.log("✅ BondSeries deployed to:", bondSeriesAddress);
  console.log("");

  // ==================== 4. Transfer BondToken Ownership ====================
  console.log("4️⃣ Transferring BondToken ownership to BondSeries...");
  const transferTx = await bondToken.transferOwnership(bondSeriesAddress);
  await transferTx.wait();
  console.log("✅ Ownership transferred");
  console.log("");

  // ==================== 5. Save Deployments ====================
  console.log("5️⃣ Saving deployment info...");
  const outDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(outDir, { recursive: true });

  const deploymentData: any = {};

  // Save each contract deployment
  deploymentData[chainId.toString()] = {
    chainId: chainId,
    chainName: network.name,
    deployedAt: new Date().toISOString(),
    contracts: {
      USDC: {
        address: usdcAddress,
        decimals: 6,
        name: "USDC",
        symbol: "USDC"
      },
      BondToken: {
        address: bondTokenAddress,
        decimals: 6,
        name: "ArcBond USDC",
        symbol: "arcUSDC"
      },
      BondSeries: {
        address: bondSeriesAddress,
        maturityMinutes: MATURITY_MINUTES
      }
    }
  };

  // Save ABIs
  deploymentData.abis = {
    USDC: (await hre.artifacts.readArtifact("contracts/IERC20.sol:IERC20")).abi, // Standard ERC20 interface
    BondToken: (await hre.artifacts.readArtifact("BondToken")).abi,
    BondSeries: (await hre.artifacts.readArtifact("BondSeries")).abi
  };

  const deploymentPath = path.join(outDir, "bond-system.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));

  console.log("✅ Deployment info saved to deployments/bond-system.json");
  console.log("");

  // ==================== Summary ====================
  console.log("=" .repeat(60));
  console.log("🎉 ArcBond System Deployed Successfully!");
  console.log("=" .repeat(60));
  console.log("");
  console.log("📋 Contract Addresses:");
  console.log("   USDC (Arc):  ", usdcAddress);
  console.log("   BondToken:   ", bondTokenAddress);
  console.log("   BondSeries:  ", bondSeriesAddress);
  console.log("");
  console.log("⚙️  Configuration:");
  console.log("   Mint Ratio:  1 USDC → 10 arcUSDC");
  console.log("   Decimals:    6 (arcUSDC) = 6 (USDC) - Zero precision loss!");
  console.log("   Coupon Rate: 1% per day (365% APY)");
  console.log("   Snapshot:    Every 5 minutes (for testing)");
  console.log("   Maturity:    " + MATURITY_MINUTES + " minutes");
  console.log("   Reserve:     30%");
  console.log("   Cap:         100,000 USDC");
  console.log("");
  console.log("🔑 Roles:");
  console.log("   Owner:       ", deployer.address);
  console.log("   Keeper:      ", deployer.address);
  console.log("");
  console.log("📝 Next Steps:");
  console.log("   1. Copy addresses to .env file");
  console.log("   2. Update keeper address if using backend automation");
  console.log("   3. Get USDC from Arc faucet or bridge");
  console.log("   4. Approve USDC: await usdc.approve(bondSeriesAddress, amount)");
  console.log("   5. Test deposit: await bondSeries.deposit(100e6)");
  console.log("");
  console.log("🔗 Explorer:");
  console.log("   https://testnet.arcscan.app/address/" + bondSeriesAddress);
  console.log("");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});

