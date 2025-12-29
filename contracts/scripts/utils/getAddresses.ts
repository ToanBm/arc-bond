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

/**
 * Get pool addresses from Factory (with pool ID selection)
 * @param chainId Chain ID
 * @param poolId Pool ID (optional, defaults to newest pool)
 * @returns Pool addresses and USDC address
 */
export async function getPoolAddresses(chainId: number, poolId?: string) {
  const addresses = getAddresses(chainId, "bond-factory.json");
  
  if (!addresses.pools || Object.keys(addresses.pools).length === 0) {
    throw new Error("❌ No pools found in bond-factory.json. Create a pool first.");
  }
  
  // Get pool ID
  let selectedPoolId = poolId;
  if (!selectedPoolId) {
    // Get newest pool (highest ID)
    const poolIds = Object.keys(addresses.pools).sort((a, b) => Number(b) - Number(a));
    selectedPoolId = poolIds[0];
  }
  
  const pool = addresses.pools[selectedPoolId];
  if (!pool) {
    throw new Error(`❌ Pool ${selectedPoolId} not found. Available pools: ${Object.keys(addresses.pools).join(", ")}`);
  }
  
  return {
    USDC_ADDRESS: addresses.USDC!,
    BOND_SERIES_ADDRESS: pool.bondSeries,
    BOND_TOKEN_ADDRESS: pool.bondToken,
    POOL_ID: selectedPoolId,
    chainId: chainId
  };
}

