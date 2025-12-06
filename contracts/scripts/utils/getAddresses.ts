import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";

/**
 * Get deployed contract addresses from deployments folder
 */
export async function getDeployedAddresses() {
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  const deploymentPath = path.join(__dirname, "../../deployments/bond-system.json");
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("❌ Deployment file not found! Run deployBondSystem.ts first.");
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  
  if (!deploymentData[chainId.toString()]) {
    throw new Error(`❌ No deployment found for chain ID ${chainId}`);
  }
  
  const contracts = deploymentData[chainId.toString()].contracts;
  
  return {
    USDC_ADDRESS: contracts.USDC.address,
    BOND_TOKEN_ADDRESS: contracts.BondToken.address,
    BOND_SERIES_ADDRESS: contracts.BondSeries.address,
    chainId: chainId,
    chainName: network.name
  };
}

/**
 * Get addresses from deployment file (generic function)
 */
export function getAddresses(chainId: number, filename: string) {
  const deploymentPath = path.join(__dirname, "../../deployments", filename);
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`❌ Deployment file not found: ${filename}`);
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  
  if (!deploymentData[chainId.toString()]) {
    throw new Error(`❌ No deployment found for chain ID ${chainId} in ${filename}`);
  }
  
  const contracts = deploymentData[chainId.toString()].contracts;
  
  return {
    USDC: contracts.USDC?.address,
    BondFactory: contracts.BondFactory?.address,
    BondToken: contracts.BondToken?.address,
    BondSeries: contracts.BondSeries?.address,
    pools: contracts.pools || {},
    chainId: chainId
  };
}

