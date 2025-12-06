import { ethers } from 'ethers';
import { 
  RPC_URL, 
  KEEPER_PRIVATE_KEY, 
  BOND_SERIES_ADDRESS,
  BOND_FACTORY_ADDRESS,
  USE_FACTORY,
  POOL_IDS,
  BOND_SERIES_ABI,
  BOND_FACTORY_ABI
} from '../config.js';

/**
 * Get contract instance for a specific BondSeries
 */
export function getBondSeriesContract(bondSeriesAddress = null) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const keeper = new ethers.Wallet(KEEPER_PRIVATE_KEY, provider);
  const address = bondSeriesAddress || BOND_SERIES_ADDRESS;
  
  if (!address) {
    throw new Error('BondSeries address not provided and BOND_SERIES_ADDRESS not set');
  }
  
  const contract = new ethers.Contract(address, BOND_SERIES_ABI, keeper);
  
  return { contract, keeper, provider };
}

/**
 * Get Factory contract instance
 */
export function getBondFactoryContract() {
  if (!USE_FACTORY || !BOND_FACTORY_ADDRESS) {
    throw new Error('Factory mode not enabled or BOND_FACTORY_ADDRESS not set');
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const keeper = new ethers.Wallet(KEEPER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(BOND_FACTORY_ADDRESS, BOND_FACTORY_ABI, keeper);
  
  return { contract, keeper, provider };
}

/**
 * Get all pools to monitor
 * Returns array of { poolId, bondSeries, name, symbol, maturityDate, isActive }
 */
export async function getAllPoolsToMonitor() {
  if (!USE_FACTORY) {
    // Single pool mode
    return [{
      poolId: '0',
      bondSeries: BOND_SERIES_ADDRESS,
      name: 'ArcBond USDC',
      symbol: 'arcUSDC',
      maturityDate: null, // Will be fetched from contract
      isActive: true
    }];
  }
  
  // Factory mode
  const { contract } = getBondFactoryContract();
  
  // Get all pools
  const poolCount = await contract.poolCount();
  
  // If POOL_IDS specified, use those; otherwise get all active pools
  let poolIdsToMonitor = [];
  
  if (POOL_IDS && POOL_IDS.length > 0) {
    // Use specified pool IDs
    poolIdsToMonitor = POOL_IDS.map(id => Number(id));
  } else {
    // Get all active pools
    try {
      const activePools = await contract.getActivePools();
      poolIdsToMonitor = activePools.map(id => Number(id));
      console.log(`   Found ${poolIdsToMonitor.length} active pools via getActivePools()`);
    } catch (error) {
      // Fallback: iterate through all pools and filter by isActive
      console.log('   getActivePools() not available, iterating through all pools...');
      for (let i = 1; i <= Number(poolCount); i++) {
        poolIdsToMonitor.push(i);
      }
    }
  }
  
  // Fetch pool info
  const pools = [];
  for (const poolId of poolIdsToMonitor) {
    try {
      const poolInfo = await contract.getPool(poolId);
      // Only add active pools (or if using POOL_IDS, respect user's choice)
      if (POOL_IDS && POOL_IDS.length > 0) {
        // User specified pools - add even if inactive (they might want to monitor inactive pools)
        pools.push({
          poolId: poolInfo.poolId.toString(),
          bondSeries: poolInfo.bondSeries,
          bondToken: poolInfo.bondToken,
          name: poolInfo.name,
          symbol: poolInfo.symbol,
          maturityDate: poolInfo.maturityDate,
          createdAt: poolInfo.createdAt,
          isActive: poolInfo.isActive
        });
      } else if (poolInfo.isActive) {
        // Auto-discovery mode - only add active pools
        pools.push({
          poolId: poolInfo.poolId.toString(),
          bondSeries: poolInfo.bondSeries,
          bondToken: poolInfo.bondToken,
          name: poolInfo.name,
          symbol: poolInfo.symbol,
          maturityDate: poolInfo.maturityDate,
          createdAt: poolInfo.createdAt,
          isActive: poolInfo.isActive
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Failed to fetch pool ${poolId}:`, error.message);
    }
  }
  
  console.log(`   Monitoring ${pools.length} pool(s)`);
  
  return pools;
}

/**
 * Get keeper balance
 */
export async function getKeeperBalance() {
  const { keeper, provider } = getBondSeriesContract();
  const balance = await provider.getBalance(keeper.address);
  return balance;
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp) {
  return new Date(Number(timestamp) * 1000).toISOString();
}

/**
 * Calculate time left until next record
 */
export function getTimeLeft(nextRecordTime) {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = Number(nextRecordTime) - now;
  
  return {
    seconds: timeLeft,
    hours: timeLeft / 3600,
    canRecord: timeLeft <= 0
  };
}

