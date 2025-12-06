import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying BondFactory System...\n");

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

  // ==================== 2. Deploy BondFactory ====================
  console.log("2️⃣ Deploying BondFactory...");
  const BondFactory = await ethers.getContractFactory("BondFactory");
  const bondFactory = await BondFactory.deploy(
    usdcAddress,
    deployer.address // Admin (will have DEFAULT_ADMIN_ROLE and POOL_CREATOR_ROLE)
  );
  await bondFactory.waitForDeployment();
  const bondFactoryAddress = await bondFactory.getAddress();
  console.log("✅ BondFactory deployed to:", bondFactoryAddress);
  console.log("");

  // ==================== 3. Save Deployments ====================
  console.log("3️⃣ Saving deployment info...");
  const outDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(outDir, { recursive: true });

  // Read existing deployment file or create new structure
  const deploymentPath = path.join(outDir, "bond-factory.json");
  let deploymentData: any = {};

  if (fs.existsSync(deploymentPath)) {
    deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }

  // Save Factory deployment
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
      BondFactory: {
        address: bondFactoryAddress
      }
    }
  };

  // Save ABIs
  deploymentData.abis = {
    USDC: (await hre.artifacts.readArtifact("contracts/IERC20.sol:IERC20")).abi,
    BondToken: (await hre.artifacts.readArtifact("BondToken")).abi,
    BondSeries: (await hre.artifacts.readArtifact("BondSeries")).abi,
    BondFactory: (await hre.artifacts.readArtifact("BondFactory")).abi
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));

  console.log("✅ Deployment info saved to deployments/bond-factory.json");
  console.log("");

  // ==================== Summary ====================
  console.log("=" .repeat(60));
  console.log("🎉 BondFactory Deployed Successfully!");
  console.log("=" .repeat(60));
  console.log("");
  console.log("📋 Contract Addresses:");
  console.log("   USDC (Arc):    ", usdcAddress);
  console.log("   BondFactory:   ", bondFactoryAddress);
  console.log("");
  console.log("⚙️  Features:");
  console.log("   - Create unlimited bond pools");
  console.log("   - Each pool gets unique BondToken and BondSeries");
  console.log("   - Automatic ownership transfer");
  console.log("   - Pool management and query functions");
  console.log("");
  console.log("🔑 Roles:");
  console.log("   Admin:         ", deployer.address);
  console.log("   Pool Creator:  ", deployer.address);
  console.log("");
  console.log("📝 Next Steps:");
  console.log("   1. Copy factory address to .env file");
  console.log("   2. Create first pool using createPool() function");
  console.log("   3. Example: await bondFactory.createPool(");
  console.log("        'ArcBond USDC Series 1',");
  console.log("        'arcUSDC-1',");
  console.log("        keeperAddress,");
  console.log("        336 // 14 days");
  console.log("      )");
  console.log("");
  console.log("🔗 Explorer:");
  console.log("   https://testnet.arcscan.app/address/" + bondFactoryAddress);
  console.log("");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});

