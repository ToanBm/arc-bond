import dotenv from 'dotenv';
dotenv.config();

// Network config
export const RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
export const CHAIN_ID = process.env.CHAIN_ID || '5042002';

// Keeper wallet
export const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;

// Contract addresses (update after deployment)
// Option 1: Single pool (legacy)
export const BOND_SERIES_ADDRESS = process.env.BOND_SERIES_ADDRESS;

// Option 2: Factory pattern (recommended)
export const BOND_FACTORY_ADDRESS = process.env.BOND_FACTORY_ADDRESS;

// Pool IDs to monitor (comma-separated, e.g., "1,2,3")
// If not set and using Factory, will monitor all active pools
export const POOL_IDS = process.env.POOL_IDS ? 
  process.env.POOL_IDS.split(',').map(id => id.trim()) : 
  null;

// Cron schedule (for local index.js only - Render uses render.yaml)
export const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 0 * * *'; // Every day at 00:00 UTC

// Discord webhook
export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Determine mode: Factory or single pool
export const USE_FACTORY = !!BOND_FACTORY_ADDRESS;

// BondSeries ABI (functions + events we need)
export const BOND_SERIES_ABI = [
  // Functions
  "function recordSnapshot() external",
  "function nextRecordTime() external view returns (uint256)",
  "function recordCount() external view returns (uint256)",
  "function snapshots(uint256) external view returns (uint256 recordId, uint256 timestamp, uint256 totalSupply, uint256 treasuryBalance)",
  "function lastDistributedRecord() external view returns (uint256)",
  "function getSeriesInfo() external view returns (uint256 maturityDate, uint256 totalDeposited, uint256 totalSupply, uint256 recordCount, uint256 cumulativeCouponIndex, bool emergencyMode)",
  
  // Events
  "event SnapshotRecorded(uint256 indexed recordId, uint256 totalSupply, uint256 treasuryBalance, uint256 timestamp)",
  "event CouponDistributed(uint256 indexed recordId, uint256 amount, uint256 newIndex, uint256 timestamp)",
  "event EmergencyRedeemEnabled(uint256 timestamp)",
  "event Deposited(address indexed user, uint256 usdcAmount, uint256 bondAmount, uint256 timestamp)",
  "event CouponClaimed(address indexed user, uint256 amount, uint256 timestamp)",
  "event Redeemed(address indexed user, uint256 bondAmount, uint256 usdcAmount, uint256 timestamp)"
];

// BondFactory ABI (functions we need)
export const BOND_FACTORY_ABI = [
  // Functions
  "function poolCount() external view returns (uint256)",
  "function pools(uint256) external view returns (uint256 poolId, address bondToken, address bondSeries, uint256 maturityDate, uint256 createdAt, bool isActive, string memory name, string memory symbol)",
  "function getPool(uint256 poolId) external view returns (uint256 poolId, address bondToken, address bondSeries, uint256 maturityDate, uint256 createdAt, bool isActive, string memory name, string memory symbol)",
  "function getActivePools() external view returns (uint256[] memory)",
  "function getAllPools() external view returns ((uint256 poolId, address bondToken, address bondSeries, uint256 maturityDate, uint256 createdAt, bool isActive, string memory name, string memory symbol)[] memory)",
  
  // Events
  "event PoolCreated(uint256 indexed poolId, address indexed bondToken, address indexed bondSeries, uint256 maturityDate, string name, string symbol)"
];

// Validation
if (!KEEPER_PRIVATE_KEY) {
  throw new Error('❌ KEEPER_PRIVATE_KEY is required in .env');
}

if (!USE_FACTORY && !BOND_SERIES_ADDRESS) {
  throw new Error('❌ Either BOND_FACTORY_ADDRESS or BOND_SERIES_ADDRESS is required in .env');
}

console.log('✅ Config loaded:');
console.log('   RPC:', RPC_URL);
console.log('   Chain ID:', CHAIN_ID);
console.log('   Mode:', USE_FACTORY ? 'Factory Pattern' : 'Single Pool');
if (USE_FACTORY) {
  console.log('   BondFactory:', BOND_FACTORY_ADDRESS);
  console.log('   Pool IDs:', POOL_IDS ? POOL_IDS.join(', ') : 'All active pools');
} else {
  console.log('   BondSeries:', BOND_SERIES_ADDRESS);
}
console.log('   Cron:', CRON_SCHEDULE);
console.log('   Discord:', DISCORD_WEBHOOK_URL ? 'Enabled' : 'Disabled');

