import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path: từ frontend/scripts lên arc-00, vào contracts
const contractsDir = path.resolve(__dirname, "../../contracts");
const deploymentsDir = path.join(contractsDir, "deployments");
const artifactsDir = path.join(contractsDir, "artifacts", "contracts");

// Output: frontend/src/abi
const outdir = path.resolve(__dirname, "../src/abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
}

const line = "\n===================================================================\n";

console.log("🔄 Generating ABIs for ArcBond System...\n");

// ===================== Bond System =====================
const bondSystemFile = path.join(deploymentsDir, "bond-system.json");
const bondFactoryFile = path.join(deploymentsDir, "bond-factory.json");
let bondSystemData = null;
const hasBondSystem = fs.existsSync(bondSystemFile);
const hasBondFactory = fs.existsSync(bondFactoryFile);

// Detect mode
if (hasBondSystem && hasBondFactory) {
  console.log("📋 Detected: Both legacy and factory mode files exist");
  console.log("   Using bond-system.json for ABIs");
  console.log("   Will generate both legacy and factory address files\n");
} else if (hasBondSystem) {
  console.log("📋 Mode: Legacy (single pool)");
  console.log("   Will generate BondSeriesAddresses & BondTokenAddresses\n");
} else if (hasBondFactory) {
  console.log("📋 Mode: Factory (multiple pools)");
  console.log("   Will generate PoolsAddresses (use this for addresses)\n");
} else {
  console.error(`${line}❌ Neither bond-system.json nor bond-factory.json found!${line}`);
  console.error("   Please deploy contracts first:");
  console.error("   - Legacy: npx hardhat run scripts/deployBondSystem.ts --network arc");
  console.error("   - Factory: npx hardhat run scripts/deployFactory.ts --network arc");
  console.error(`${line}`);
  process.exit(1);
}

// Load deployment data for addresses only
if (hasBondSystem) {
  bondSystemData = JSON.parse(fs.readFileSync(bondSystemFile, "utf-8"));
  console.log(`✅ Loaded bond-system.json`);
} else if (hasBondFactory) {
  bondSystemData = JSON.parse(fs.readFileSync(bondFactoryFile, "utf-8"));
  console.log(`✅ Loaded bond-factory.json`);
}

// Helper function to read ABI from deployment JSON (preferred) or artifacts (fallback)
function readABI(contractName, deploymentData) {
  // Try to read from deployment JSON first
  if (deploymentData && deploymentData.abis && deploymentData.abis[contractName]) {
    return deploymentData.abis[contractName];
  }
  
  // Fallback to artifacts if not in deployment JSON
  const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`ABI not found for ${contractName} in deployment JSON or artifacts.\nPlease deploy contracts first or compile: cd contracts && npx hardhat compile`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  return artifact.abi;
}

// Helper function to read IERC20 ABI from deployment JSON or artifacts
function readIERC20ABI(deploymentData) {
  // Try deployment JSON first
  if (deploymentData && deploymentData.abis && deploymentData.abis.USDC) {
    return deploymentData.abis.USDC;
  }
  
  // Fallback to artifacts
  const artifactPath = path.join(artifactsDir, "IERC20.sol", "IERC20.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`IERC20 ABI not found in deployment JSON or artifacts.\nPlease deploy contracts first or compile: cd contracts && npx hardhat compile`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  return artifact.abi;
}

// ===================== Generate BondSeriesABI =====================
console.log("\n📝 Generating BondSeries...");

// Get deployment data for ABI (prefer bond-factory.json, fallback to bond-system.json)
let abiSourceData = null;
if (hasBondFactory) {
  abiSourceData = JSON.parse(fs.readFileSync(bondFactoryFile, "utf-8"));
} else if (hasBondSystem) {
  abiSourceData = bondSystemData;
}

const bondSeriesABI = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondSeriesABI = ${JSON.stringify({ abi: readABI("BondSeries", abiSourceData) }, null, 2)} as const;
`;

fs.writeFileSync(path.join(outdir, "BondSeriesABI.ts"), bondSeriesABI, "utf-8");
console.log(`✅ Generated BondSeriesABI.ts`);

// Generate BondSeriesAddresses (only if bond-system.json exists with addresses)
if (hasBondSystem) {
  const bondSeriesAddresses = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondSeriesAddresses = {
${Object.entries(bondSystemData)
      .filter(([key]) => key !== "abis")
      .filter(([chainId, data]) => data.contracts?.BondSeries?.address)
      .map(([chainId, data]) => `  "${chainId}": {
    chainId: ${data.chainId},
    chainName: "${data.chainName}",
    address: "${data.contracts.BondSeries.address}" as const,
    maturityHours: ${data.contracts.BondSeries.maturityHours || 336}
  }`)
      .join(",\n")}
} as const;

export function getBondSeriesAddress(chainId: number): \`0x\${string}\` {
  const chain = BondSeriesAddresses[chainId.toString() as keyof typeof BondSeriesAddresses];
  if (!chain) {
    throw new Error(\`BondSeries not deployed on chain \${chainId}\`);
  }
  return chain.address;
}
`;

  fs.writeFileSync(path.join(outdir, "BondSeriesAddresses.ts"), bondSeriesAddresses, "utf-8");
  console.log(`✅ Generated BondSeriesAddresses.ts`);
} else {
  console.log(`⚠️  Skipping BondSeriesAddresses.ts (bond-system.json not found, use PoolsAddresses instead)`);
}

// ===================== Generate BondTokenABI =====================
console.log("\n📝 Generating BondToken...");

const bondTokenABI = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondTokenABI = ${JSON.stringify({ abi: readABI("BondToken", abiSourceData) }, null, 2)} as const;
`;

fs.writeFileSync(path.join(outdir, "BondTokenABI.ts"), bondTokenABI, "utf-8");
console.log(`✅ Generated BondTokenABI.ts`);

// Generate BondTokenAddresses (only if bond-system.json exists with addresses)
if (hasBondSystem) {
  const bondTokenAddresses = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondTokenAddresses = {
${Object.entries(bondSystemData)
      .filter(([key]) => key !== "abis")
      .filter(([chainId, data]) => data.contracts?.BondToken?.address)
      .map(([chainId, data]) => `  "${chainId}": {
    chainId: ${data.chainId},
    chainName: "${data.chainName}",
    address: "${data.contracts.BondToken.address}" as const,
    decimals: ${data.contracts.BondToken.decimals || 6},
    name: "${data.contracts.BondToken.name || "ArcBond USDC"}",
    symbol: "${data.contracts.BondToken.symbol || "arcUSDC"}"
  }`)
      .join(",\n")}
} as const;

export function getBondTokenAddress(chainId: number): \`0x\${string}\` {
  const chain = BondTokenAddresses[chainId.toString() as keyof typeof BondTokenAddresses];
  if (!chain) {
    throw new Error(\`BondToken not deployed on chain \${chainId}\`);
  }
  return chain.address;
}
`;

  fs.writeFileSync(path.join(outdir, "BondTokenAddresses.ts"), bondTokenAddresses, "utf-8");
  console.log(`✅ Generated BondTokenAddresses.ts`);
} else {
  console.log(`⚠️  Skipping BondTokenAddresses.ts (bond-system.json not found, use PoolsAddresses instead)`);
}

// ===================== Generate USDCABI =====================
console.log("\n📝 Generating USDC...");

const usdcABI = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const USDCABI = ${JSON.stringify({ abi: readIERC20ABI(abiSourceData) }, null, 2)} as const;
`;

fs.writeFileSync(path.join(outdir, "USDCABI.ts"), usdcABI, "utf-8");
console.log(`✅ Generated USDCABI.ts`);

// Generate USDCAddresses
const usdcAddresses = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const USDCAddresses = {
${Object.entries(bondSystemData)
    .filter(([key]) => key !== "abis")
    .filter(([chainId, data]) => data.contracts?.USDC?.address)
    .map(([chainId, data]) => `  "${chainId}": {
    chainId: ${data.chainId},
    chainName: "${data.chainName}",
    address: "${data.contracts.USDC.address}" as const,
    decimals: ${data.contracts.USDC.decimals || 6},
    name: "${data.contracts.USDC.name || "USDC"}",
    symbol: "${data.contracts.USDC.symbol || "USDC"}"
  }`)
    .join(",\n")}
} as const;

export function getUSDCAddress(chainId: number): \`0x\${string}\` {
  const chain = USDCAddresses[chainId.toString() as keyof typeof USDCAddresses];
  if (!chain) {
    throw new Error(\`USDC not deployed on chain \${chainId}\`);
  }
  return chain.address;
}
`;

fs.writeFileSync(path.join(outdir, "USDCAddresses.ts"), usdcAddresses, "utf-8");
console.log(`✅ Generated USDCAddresses.ts`);

// ===================== Generate BondFactory =====================
if (hasBondFactory) {
  console.log("\n📝 Generating BondFactory...");

  const bondFactoryData = JSON.parse(fs.readFileSync(bondFactoryFile, "utf-8"));
  console.log(`✅ Loaded bond-factory.json`);

  // Generate BondFactoryABI
  const bondFactoryABI = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondFactoryABI = ${JSON.stringify({ abi: readABI("BondFactory", bondFactoryData) }, null, 2)} as const;
`;

  fs.writeFileSync(path.join(outdir, "BondFactoryABI.ts"), bondFactoryABI, "utf-8");
  console.log(`✅ Generated BondFactoryABI.ts`);

  // Generate BondFactoryAddresses
  const bondFactoryAddresses = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondFactoryAddresses = {
${Object.entries(bondFactoryData)
      .filter(([key]) => key !== "abis")
      .map(([chainId, data]) => `  "${chainId}": {
    chainId: ${data.chainId},
    chainName: "${data.chainName}",
    address: "${data.contracts.BondFactory.address}" as const
  }`)
      .join(",\n")}
} as const;

export function getBondFactoryAddress(chainId: number): \`0x\${string}\` {
  const chain = BondFactoryAddresses[chainId.toString() as keyof typeof BondFactoryAddresses];
  if (!chain) {
    throw new Error(\`BondFactory not deployed on chain \${chainId}\`);
  }
  return chain.address;
}
`;

  fs.writeFileSync(path.join(outdir, "BondFactoryAddresses.ts"), bondFactoryAddresses, "utf-8");
  console.log(`✅ Generated BondFactoryAddresses.ts`);

  // Generate PoolsAddresses (all pools from Factory)
  const poolsAddresses = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export type PoolInfo = {
  poolId: string;
  name: string;
  symbol: string;
  bondToken: \`0x\${string}\`;
  bondSeries: \`0x\${string}\`;
  maturityDate: string;
  createdAt: string;
  isActive: boolean;
};

export const PoolsAddresses = {
${Object.entries(bondFactoryData)
      .filter(([key]) => key !== "abis")
      .map(([chainId, data]) => {
        const pools = data.contracts.pools || {};
        const poolsEntries = Object.entries(pools)
          .map(([poolId, pool]) => {
            return `    "${poolId}": {
      poolId: "${pool.poolId}",
      name: "${pool.name.replace(/"/g, '\\"')}",
      symbol: "${pool.symbol.replace(/"/g, '\\"')}",
      bondToken: "${pool.bondToken}" as const,
      bondSeries: "${pool.bondSeries}" as const,
      maturityDate: "${pool.maturityDate}",
      createdAt: "${pool.createdAt}",
      isActive: ${pool.isActive}
    }`;
          })
          .join(",\n");

        return `  "${chainId}": {
    chainId: ${data.chainId},
    chainName: "${data.chainName}",
    pools: {
${poolsEntries}
    }
  }`;
      })
      .join(",\n")}
} as const;

export function getPools(chainId: number): Record<string, PoolInfo> {
  const chain = PoolsAddresses[chainId.toString() as keyof typeof PoolsAddresses];
  if (!chain) {
    throw new Error(\`Pools not found on chain \${chainId}\`);
  }
  return chain.pools as Record<string, PoolInfo>;
}

export function getPool(chainId: number, poolId: string): PoolInfo | undefined {
  const pools = getPools(chainId);
  return pools[poolId];
}

export function getAllPoolIds(chainId: number): string[] {
  const pools = getPools(chainId);
  return Object.keys(pools);
}
`;

  fs.writeFileSync(path.join(outdir, "PoolsAddresses.ts"), poolsAddresses, "utf-8");
  console.log(`✅ Generated PoolsAddresses.ts`);
} else {
  console.log("\n⚠️  bond-factory.json not found, skipping BondFactory generation");
}

// ===================== Generate BondMarketV2 =====================
const bondMarketV2File = path.join(deploymentsDir, "bond-market-v2.json");
if (fs.existsSync(bondMarketV2File)) {
  console.log("\n📝 Generating BondMarketV2...");

  const bondMarketV2Data = JSON.parse(fs.readFileSync(bondMarketV2File, "utf-8"));
  console.log(`✅ Loaded bond-market-v2.json`);

  // Generate BondMarketV2ABI
  const bondMarketV2ABI = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondMarketV2ABI = ${JSON.stringify({ abi: readABI("BondMarketV2", bondMarketV2Data) }, null, 2)} as const;
`;

  fs.writeFileSync(path.join(outdir, "BondMarketV2ABI.ts"), bondMarketV2ABI, "utf-8");
  console.log(`✅ Generated BondMarketV2ABI.ts`);

  // Generate BondMarketV2Addresses
  const bondMarketV2Addresses = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondMarketV2Addresses = {
${Object.entries(bondMarketV2Data)
      .filter(([key]) => key !== "abi")
      .map(([chainId, data]) => `  "${chainId}": {
    chainId: ${data.chainId},
    chainName: "${data.chainName}",
    address: "${data.marketAddress}" as const,
    usdcAddress: "${data.usdcAddress}" as const,
    version: "${data.version}"
  }`)
      .join(",\n")}
} as const;

export function getBondMarketV2Address(chainId: number): \`0x\${string}\` {
  const chain = BondMarketV2Addresses[chainId.toString() as keyof typeof BondMarketV2Addresses];
  if (!chain) {
    throw new Error(\`BondMarketV2 not deployed on chain \${chainId}\`);
  }
  return chain.address;
}
`;

  fs.writeFileSync(path.join(outdir, "BondMarketV2Addresses.ts"), bondMarketV2Addresses, "utf-8");
  console.log(`✅ Generated BondMarketV2Addresses.ts`);
} else {
  console.log("\n⚠️  bond-market-v2.json not found, skipping BondMarketV2 generation");
}

// ===================== Generate contracts.ts (tổng hợp) =====================
// Check if files exist
const hasBondFactoryGenerated = fs.existsSync(path.join(outdir, "BondFactoryABI.ts"));
const hasPools = fs.existsSync(path.join(outdir, "PoolsAddresses.ts"));
const hasBondSeriesAddressesFile = fs.existsSync(path.join(outdir, "BondSeriesAddresses.ts"));
const hasBondTokenAddressesFile = fs.existsSync(path.join(outdir, "BondTokenAddresses.ts"));

// Build addresses content string
let addressesContent = '  USDC: USDCAddresses';
if (hasBondFactoryGenerated) addressesContent += ',\n  BondFactory: BondFactoryAddresses';
if (hasPools) addressesContent += ',\n  Pools: PoolsAddresses';
if (hasBondSeriesAddressesFile) addressesContent += ',\n  BondSeries: BondSeriesAddresses';
if (hasBondTokenAddressesFile) addressesContent += ',\n  BondToken: BondTokenAddresses';

const contractsTs = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
import { BondSeriesABI } from './BondSeriesABI';
import { BondTokenABI } from './BondTokenABI';
import { USDCABI } from './USDCABI';
import { USDCAddresses, getUSDCAddress } from './USDCAddresses';
${hasBondFactoryGenerated ? `import { BondFactoryABI } from './BondFactoryABI';
import { BondFactoryAddresses, getBondFactoryAddress } from './BondFactoryAddresses';` : ''}
${hasPools ? `import { PoolsAddresses, getPools, getPool, getAllPoolIds, type PoolInfo } from './PoolsAddresses';` : ''}
${hasBondSeriesAddressesFile ? `import { BondSeriesAddresses, getBondSeriesAddress } from './BondSeriesAddresses';` : `// BondSeriesAddresses not available (factory-only mode)
let getBondSeriesAddress: ((chainId: number) => \`0x\${string}\`) | null = null;`}
${hasBondTokenAddressesFile ? `import { BondTokenAddresses, getBondTokenAddress } from './BondTokenAddresses';` : `// BondTokenAddresses not available (factory-only mode)
let getBondTokenAddress: ((chainId: number) => \`0x\${string}\`) | null = null;`}

// Export tất cả ABIs
export const ABIs = {
  BondSeries: BondSeriesABI.abi,
  BondToken: BondTokenABI.abi,
  USDC: USDCABI.abi,${hasBondFactoryGenerated ? '\n  BondFactory: BondFactoryABI.abi,' : ''}
};

// Export tất cả Addresses
export const Addresses = {
${addressesContent}
};

// Export individual contracts
export { BondSeriesABI };${hasBondSeriesAddressesFile ? '\nexport { BondSeriesAddresses, getBondSeriesAddress };' : ''}
export { BondTokenABI };${hasBondTokenAddressesFile ? '\nexport { BondTokenAddresses, getBondTokenAddress };' : ''}
export { USDCABI, USDCAddresses, getUSDCAddress };${hasBondFactoryGenerated ? `
export { BondFactoryABI, BondFactoryAddresses, getBondFactoryAddress };` : ''}${hasPools ? `
export { PoolsAddresses, getPools, getPool, getAllPoolIds };
export type { PoolInfo };` : ''}

// Arc Testnet chain ID
export const ARC_TESTNET_CHAIN_ID = 5042002;

// Safe helper functions for legacy mode (return null if not available)
export function getBondSeriesAddressSafe(chainId: number = ARC_TESTNET_CHAIN_ID): \`0x\${string}\` | null {
  ${hasBondSeriesAddressesFile ? `try {
    return getBondSeriesAddress(chainId);
  } catch {
    return null;
  }` : 'return null;'}
}

export function getBondTokenAddressSafe(chainId: number = ARC_TESTNET_CHAIN_ID): \`0x\${string}\` | null {
  ${hasBondTokenAddressesFile ? `try {
    return getBondTokenAddress(chainId);
  } catch {
    return null;
  }` : 'return null;'}
}

// Helper to get all addresses for current chain
export function getContractAddresses(chainId: number = ARC_TESTNET_CHAIN_ID) {
  return {
    usdc: getUSDCAddress(chainId),${hasBondFactoryGenerated ? '\n    bondFactory: getBondFactoryAddress(chainId),' : ''}${hasBondSeriesAddressesFile ? '\n    bondSeries: getBondSeriesAddress(chainId),' : '\n    bondSeries: getBondSeriesAddressSafe(chainId),'}${hasBondTokenAddressesFile ? '\n    bondToken: getBondTokenAddress(chainId),' : '\n    bondToken: getBondTokenAddressSafe(chainId),'}
  };
}
`;

fs.writeFileSync(path.join(outdir, "contracts.ts"), contractsTs, "utf-8");
console.log(`✅ Generated contracts.ts (tổng hợp)`);

// ===================== Cleanup unused files =====================
// Remove files that shouldn't exist based on current mode
const filesToCheck = [
  { file: "BondSeriesAddresses.ts", shouldExist: hasBondSystem, reason: "Only needed for legacy mode (bond-system.json)" },
  { file: "BondTokenAddresses.ts", shouldExist: hasBondSystem, reason: "Only needed for legacy mode (bond-system.json)" },
];

for (const { file, shouldExist, reason } of filesToCheck) {
  const filePath = path.join(outdir, file);
  if (fs.existsSync(filePath) && !shouldExist) {
    fs.unlinkSync(filePath);
    console.log(`🗑️  Removed ${file} (${reason})`);
  }
}

// ===================== Summary =====================
console.log(`\n${line}🎉 All done! Generated files:${line}`);
console.log(`   ✅ BondSeriesABI.ts (always)`);
if (hasBondSystem) {
  console.log(`   ✅ BondSeriesAddresses.ts (legacy mode)`);
} else {
  console.log(`   ⏭️  BondSeriesAddresses.ts (skipped - use PoolsAddresses instead)`);
}
console.log(`   ✅ BondTokenABI.ts (always)`);
if (hasBondSystem) {
  console.log(`   ✅ BondTokenAddresses.ts (legacy mode)`);
} else {
  console.log(`   ⏭️  BondTokenAddresses.ts (skipped - use PoolsAddresses instead)`);
}
console.log(`   ✅ USDCABI.ts (always)`);
console.log(`   ✅ USDCAddresses.ts (always)`);
if (hasBondFactoryGenerated) {
  console.log(`   ✅ BondFactoryABI.ts (factory mode)`);
  console.log(`   ✅ BondFactoryAddresses.ts (factory mode)`);
  if (hasPools) {
    console.log(`   ✅ PoolsAddresses.ts (factory mode)`);
  }
} else {
  console.log(`   ⏭️  BondFactory files (skipped - bond-factory.json not found)`);
}
console.log(`   ✅ contracts.ts (tổng hợp)`);

console.log(`\n📝 Usage example:`);
console.log(`   import { ABIs, getContractAddresses } from '@/abi/contracts';`);
console.log(`   `);
console.log(`   const bondSeriesABI = ABIs.BondSeries;`);
console.log(`   const { bondSeries, bondToken, usdc } = getContractAddresses(5042002);`);
console.log(`   `);
console.log(`   // Use with wagmi:`);
console.log(`   const { data } = useReadContract({`);
console.log(`     address: bondSeries,`);
console.log(`     abi: ABIs.BondSeries,`);
console.log(`     functionName: 'getSeriesInfo'`);
console.log(`   });`);
console.log(`${line}`);

