import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

async function main() {
    console.log("🚀 Deploying BondMarketV2 (Gasless Listings)...\n");

    const [deployer] = await ethers.getSigners();
    console.log("📍 Deployer:", deployer.address);

    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    console.log("📍 Network:", network.name, `(Chain ID: ${chainId})\n`);

    // Hardcoded USDC Address from mockusdc.json
    // Arc Testnet: 0x3600000000000000000000000000000000000000
    let USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

    // If local hardhat network, deploy a mock USDC first
    if (chainId === 31337) {
        console.log("⚠️ Local network detected. Deploying Mock USDC...");
        const Mock = await ethers.getContractFactory("BondToken");
        const mock = await Mock.deploy("USDC", "USDC", deployer.address);
        USDC_ADDRESS = await mock.getAddress();
        console.log("✅ Mock USDC deployed:", USDC_ADDRESS);
    }

    console.log("📋 Configuration:");
    console.log("   USDC:", USDC_ADDRESS);
    console.log("");

    // Deploy market
    console.log("⏳ Deploying BondMarketV2...");
    const Market = await ethers.getContractFactory("BondMarketV2");
    const market = await Market.deploy(USDC_ADDRESS);
    await market.waitForDeployment();

    const marketAddress = await market.getAddress();
    console.log("✅ BondMarketV2 deployed:", marketAddress);
    console.log("");

    // Save deployment
    const deploymentData: any = {
        [chainId]: {
            chainId,
            chainName: network.name,
            deployedAt: new Date().toISOString(),
            marketAddress,
            usdcAddress: USDC_ADDRESS,
            version: "2.0"
        }
    };

    // Save ABI
    try {
        deploymentData.abi = (await hre.artifacts.readArtifact("BondMarketV2")).abi;
    } catch (e) {
        console.warn("⚠️ Could not read artifact abi");
    }

    const outDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir);
    }

    const deploymentPath = path.join(outDir, "bond-market-v2.json");

    // Read existing file if any to preserve other chains
    let finalData = deploymentData;
    if (fs.existsSync(deploymentPath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
            finalData = { ...existing, ...deploymentData };
        } catch (e) { }
    }

    fs.writeFileSync(deploymentPath, JSON.stringify(finalData, null, 2));

    console.log(`✅ Deployment saved to deployments/bond-market-v2.json`);
    console.log("");
    console.log("=".repeat(60));
    console.log("🔗 Explorer:");
    console.log("   https://testnet.arcscan.app/address/" + marketAddress);
    console.log("=".repeat(60));
}

main().catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exitCode = 1;
});
