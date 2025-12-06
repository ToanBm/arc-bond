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
  const poolCount = Number(await contract.poolCount());
  console.log(`   Total pools in Factory: ${poolCount}`);
  
  // If POOL_IDS specified, use those; otherwise get all active pools
  let poolIdsToMonitor = [];
  
  if (POOL_IDS && POOL_IDS.length > 0) {
    // Use specified pool IDs, but validate them
    poolIdsToMonitor = POOL_IDS.map(id => Number(id)).filter(id => {
      if (id === 0 || id > poolCount) {
        console.log(`   ⚠️  Pool ${id} does not exist (poolCount: ${poolCount}), skipping`);
        return false;
      }
      return true;
    });
    console.log(`   Monitoring specified pools: ${poolIdsToMonitor.join(', ')}`);
  } else {
    // Get all active pools
    try {
      const activePools = await contract.getActivePools();
      poolIdsToMonitor = activePools.map(id => Number(id)).filter(id => {
        // Validate pool IDs from getActivePools
        if (id === 0 || id > poolCount) {
          console.log(`   ⚠️  Pool ${id} from getActivePools() is invalid (poolCount: ${poolCount}), skipping`);
          return false;
        }
        return true;
      });
      console.log(`   Found ${poolIdsToMonitor.length} valid active pools via getActivePools()`);
    } catch (error) {
      console.log('   getActivePools() failed, iterating through all pools...');
    }
    
    // Fallback: if getActivePools failed or returned invalid pools, iterate through all pools
    if (poolIdsToMonitor.length === 0 && poolCount > 0) {
      console.log(`   Fallback: Checking all pools from 1 to ${poolCount}...`);
      for (let i = 1; i <= poolCount; i++) {
        poolIdsToMonitor.push(i);
      }
    }
  }
  
  if (poolIdsToMonitor.length === 0) {
    console.log('   ⚠️  No valid pools to monitor');
    return [];
  }
  
  // Fetch pool info
  const pools = [];
  for (const poolId of poolIdsToMonitor) {
    try {
      // Try using pools mapping first (more reliable for struct decoding)
      let poolInfo;
      try {
        poolInfo = await contract.pools(poolId);
        console.log(`   [DEBUG] Pool ${poolId} via pools() - Type: ${Array.isArray(poolInfo) ? 'Array' : typeof poolInfo}, Length: ${Array.isArray(poolInfo) ? poolInfo.length : 'N/A'}`);
      } catch (err) {
        // Fallback to getPool if pools() fails
        poolInfo = await contract.getPool(poolId);
        console.log(`   [DEBUG] Pool ${poolId} via getPool() - Type: ${Array.isArray(poolInfo) ? 'Array' : typeof poolInfo}`);
      }
      
      // Handle both array and object return formats
      let pool;
      if (Array.isArray(poolInfo)) {
        // If returned as array/tuple
        pool = {
          poolId: poolInfo[0]?.toString() || poolId.toString(),
          bondToken: poolInfo[1],
          bondSeries: poolInfo[2],
          maturityDate: poolInfo[3],
          createdAt: poolInfo[4],
          isActive: poolInfo[5] ?? true,
          name: poolInfo[6] || `Pool ${poolId}`,
          symbol: poolInfo[7] || `arcUSDC-${poolId}`
        };
      } else {
        // If returned as object
        pool = {
          poolId: poolInfo.poolId?.toString() || poolId.toString(),
          bondSeries: poolInfo.bondSeries,
          bondToken: poolInfo.bondToken,
          name: poolInfo.name || `Pool ${poolId}`,
          symbol: poolInfo.symbol || `arcUSDC-${poolId}`,
          maturityDate: poolInfo.maturityDate,
          createdAt: poolInfo.createdAt,
          isActive: poolInfo.isActive ?? true
        };
      }
      
      // Debug: log decoded pool info
      console.log(`   [DEBUG] Pool ${poolId} decoded:`);
      console.log(`     - Type: ${Array.isArray(poolInfo) ? 'Array' : 'Object'}`);
      console.log(`     - bondSeries: ${pool.bondSeries || 'MISSING/UNDEFINED'}`);
      console.log(`     - bondToken: ${pool.bondToken || 'MISSING/UNDEFINED'}`);
      console.log(`     - name: ${pool.name || 'MISSING'}`);
      
      // Validate bondSeries address before adding to list
      const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
      if (!pool.bondSeries || pool.bondSeries === ZERO_ADDRESS || pool.bondSeries === null || pool.bondSeries === undefined) {
        console.log(`   ❌ Pool ${poolId}: bondSeries address is invalid or missing!`);
        console.log(`   [DEBUG] Full pool object keys:`, Object.keys(pool));
        console.log(`   [DEBUG] poolInfo keys (if object):`, poolInfo && typeof poolInfo === 'object' && !Array.isArray(poolInfo) ? Object.keys(poolInfo) : 'N/A');
        throw new Error(`Pool ${poolId} has invalid bondSeries address: ${pool.bondSeries}`);
      }
      
      // Only add active pools (or if using POOL_IDS, respect user's choice)
      if (POOL_IDS && POOL_IDS.length > 0) {
        // User specified pools - add even if inactive (they might want to monitor inactive pools)
        pools.push(pool);
        console.log(`   ✓ Pool ${poolId}: ${pool.name} (${pool.isActive ? 'Active' : 'Inactive'})`);
      } else if (pool.isActive) {
        // Auto-discovery mode - only add active pools that are not matured
        const now = Math.floor(Date.now() / 1000);
        const maturityTimestamp = Number(pool.maturityDate);
        if (now < maturityTimestamp) {
          pools.push(pool);
          const daysToMaturity = Math.floor((maturityTimestamp - now) / 86400);
          console.log(`   ✓ Pool ${poolId}: ${pool.name} (Active, ${daysToMaturity}d to maturity)`);
        } else {
          console.log(`   ⏭️  Pool ${poolId}: ${pool.name} (Matured, skipping)`);
        }
      } else {
        console.log(`   ⏭️  Pool ${poolId}: ${pool.name} (inactive, skipping)`);
      }
    } catch (error) {
      // Check if it's PoolNotFound error (error code 0x76ecffc0)
      if (error.code === 'CALL_EXCEPTION' || error.message.includes('revert') || error.data === '0x76ecffc0') {
        console.log(`   ❌ Pool ${poolId}: Not found or invalid (poolCount: ${poolCount})`);
        // Continue to next pool instead of failing completely
      } else {
        console.log(`   ⚠️  Failed to fetch pool ${poolId}:`, error.message);
      }
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

