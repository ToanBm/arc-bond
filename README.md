# 🏦 ArcBond

**Decentralized Fixed-Rate Bond Platform on Arc Testnet**

A DeFi bond system enabling issuers to borrow USDC from investors with transparent terms and automated coupon distribution.

---

## 🎯 Overview

**For Investors:**
- Deposit USDC → Receive arcUSDC (bond tokens)
- Earn 1% daily coupons (365% APY)
- Redeem principal at maturity (7 days)

**For Issuers (Protocol Owner):**
- Withdraw up to 70% of deposited USDC
- Distribute coupons to bondholders
- 30% reserve locked on-chain for safety

---

## ✨ Key Features

- **Fixed Rate**: 1% daily coupon (365% APY)
- **Mint Ratio**: 1 USDC = 10 arcUSDC tokens
- **Maturity**: 7 days from deployment
- **Reserve Ratio**: 30% minimum locked
- **Max Cap**: 10,000 USDC TVL per pool
- **Snapshot System**: Daily automated snapshots
- **Claim-based Coupons**: Users claim when ready
- **Emergency Mode**: Auto-enabled if owner defaults (3+ days late)
- **Pausable**: Owner can pause deposits in emergency

---

## 🏗️ Architecture

### Smart Contracts
- **BondFactory.sol** - Factory contract to create and manage multiple bond pools
- **BondSeries.sol** - Core bond logic (one instance per pool)
- **BondToken.sol** - arcUSDC ERC20 token (6 decimals, one instance per pool)
- **USDC** - Circle's USDC on Arc Testnet

### Backend (Node.js on Render.com)
- **Snapshot Cron** - Records snapshots daily at 00:00 UTC
- **Monitor Cron** - Health checks every hour

### Frontend (Next.js)
- **PoolContext** - Manages selected bond pool dynamically
- **Deposit Tab** - Deposit USDC for arcUSDC
- **Portfolio Tab** - View holdings, claim coupons, redeem
- **Details Tab** - System metrics and treasury status
- **Admin Tab** - Distribute coupons, withdraw, emergency controls (owner only)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask with Arc Testnet configured
- USDC tokens from [Circle Faucet](https://faucet.circle.com/)

### Installation

```bash
# Clone repository
cd arc/arc-00

# Install contracts
cd contracts
npm install

# Install frontend
cd ../frontend
npm install

# Install backend
cd ../../../arc-backend
npm install
```

### Deploy Contracts

**Factory Pattern (Recommended):**

```bash
cd arc/arc-00/contracts

# 1. Deploy BondFactory
npx hardhat run scripts/deployFactory.ts --network arc

# 2. Create a new bond pool
npx hardhat run scripts/createPool.ts --network arc

# 3. List all pools (optional)
npx hardhat run scripts/listPools.ts --network arc
```

**Legacy (Single Pool):**

```bash
# Old deployment method (still supported)
npx hardhat run scripts/deployBondSystem.ts --network arc
```

### Run Frontend

```bash
cd arc/arc-00/frontend
npm run dev
# Open http://localhost:3000
```

---

## 📦 Contract Addresses (Arc Testnet)

| Contract | Address | Notes |
|----------|---------|-------|
| **USDC** | `0x3600000000000000000000000000000000000000` | Shared across all pools |
| **BondFactory** | [See deployments/bond-factory.json] | Factory to create pools |
| **BondToken** | [Per pool in bond-factory.json] | Unique token per pool |
| **BondSeries** | [Per pool in bond-factory.json] | Unique series per pool |

**Address Files:**
- `contracts/deployments/bond-factory.json` - Factory and all pools
- `frontend/src/abi/PoolsAddresses.ts` - Auto-generated pool addresses for frontend

**Explorer:** https://testnet.arcscan.app

---

## ⚙️ Configuration

### Contract Parameters (Per Pool)

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Mint Ratio** | 1:10 | 1 USDC → 10 arcUSDC |
| **Coupon Rate** | 1% per day | 365% APY |
| **Snapshot Interval** | 1 day | Daily snapshots |
| **Maturity** | Configurable (hours) | Default 168 hours (7 days) |
| **Reserve Ratio** | 30% | Minimum locked |
| **Max Cap** | 10,000 USDC | TVL limit per pool |
| **Decimals** | 6 | Same as USDC |
| **Deposit Restriction** | ✅ Enabled | Cannot deposit after maturity |

### Factory Configuration

When creating a new pool via `createPool.ts`, you can specify:
- **Name** - Pool name (e.g., "ArcBond USDC Series 1")
- **Symbol** - Token symbol (e.g., "arcUSDC-1")
- **Keeper** - Address with KEEPER_ROLE for snapshots
- **Maturity Hours** - Time until maturity (e.g., 168 = 7 days)

### Network Details

```
Network Name: Arc Testnet
Chain ID: 5042002
RPC URL: https://rpc.testnet.arc.network
Currency Symbol: USDC
Block Explorer: https://testnet.arcscan.app
```

---

## 🔧 Development

### Test Scripts

**Factory Management:**
```bash
cd contracts

# Deploy BondFactory
npx hardhat run scripts/deployFactory.ts --network arc

# Create new bond pool
npx hardhat run scripts/createPool.ts --network arc

# List all pools
npx hardhat run scripts/listPools.ts --network arc
```

**Pool Operations (Update scripts to use pool addresses):**
```bash
# View system status (update with pool address)
npx hardhat run scripts/00-viewStatus.ts --network arc

# Deposit USDC
npx hardhat run scripts/02-deposit.ts --network arc

# Record snapshot (keeper)
npx hardhat run scripts/03-recordSnapshot.ts --network arc

# Distribute coupon (owner)
npx hardhat run scripts/04-distributeCoupon.ts --network arc

# Claim coupon (user)
npx hardhat run scripts/05-claimCoupon.ts --network arc

# Redeem at maturity (user)
npx hardhat run scripts/06-redeem.ts --network arc

# Test pause mechanism
npx hardhat run scripts/08-testPause.ts --network arc
```

**Note:** After creating pools via Factory, update the scripts in `utils/getAddresses.ts` or pass pool addresses directly.

### Frontend Development

```bash
cd frontend

# Generate ABIs from deployed contracts
# Reads from bond-factory.json and generates:
# - BondFactoryABI.ts, BondFactoryAddresses.ts
# - PoolsAddresses.ts (all pools)
# - contracts.ts (aggregated exports)
npm run genabi

# Run dev server
npm run dev

# Build for production
npm run build
```

**Frontend Architecture:**
- **PoolContext** - Manages selected pool state (defaults to first pool)
- **Hooks** - All hooks (`useBondSeries`, `useBondToken`, `useUSDC`) automatically use selected pool addresses
- **Pool Selection** - Users can switch between pools via `usePool()` hook

### Backend Deployment

**Deploy to Render.com:**
1. Push code to GitHub
2. Connect repository to Render
3. Set environment variables:
   - `ARC_RPC_URL`
   - `KEEPER_PRIVATE_KEY`
   - `BOND_FACTORY_ADDRESS` (or `BOND_SERIES_ADDRESS` for legacy)
   - `POOL_IDS` (comma-separated, e.g., "1,2,3") - Optional, for monitoring multiple pools
   - `DISCORD_WEBHOOK_URL` (optional)
4. Deploy using `render.yaml` config

**Cron Jobs:**
- Snapshot: Daily at 00:00 UTC (per pool)
- Monitor: Every hour (can monitor multiple pools)

**Note:** Backend can monitor multiple pools by iterating through `POOL_IDS` or querying the Factory for all active pools.

---

## 📚 User Flows

### Investor Flow

1. **Connect Wallet** → Arc Testnet
2. **Select Pool** → Choose which bond pool to interact with (auto-selected: first pool)
3. **Get USDC** → Circle Faucet
4. **Approve USDC** → Allow BondSeries to spend (per pool)
5. **Deposit** → Receive arcUSDC (1:10 ratio) - **Cannot deposit after maturity**
6. **Wait** → Earn 1% daily coupons
7. **Claim Coupons** → Anytime after distribution
8. **Redeem** → At maturity, get USDC back

### Owner Flow (Per Pool)

1. **Create Pool** → Use Factory to create new bond series
2. **Withdraw USDC** → Up to 70% for use (per pool)
3. **Distribute Coupons** → After each daily snapshot (per pool)
4. **Monitor Solvency** → Keep ≥30% reserve (per pool)
5. **Pause if needed** → Emergency control (per pool)

---

## 🏭 Factory Pattern

### Overview

ArcBond uses a **Factory Pattern** to manage multiple bond pools. Each pool is isolated with its own:
- `BondToken` instance (unique arcUSDC token)
- `BondSeries` instance (unique bond logic)
- Maturity date and parameters
- Independent reserve and treasury

### Benefits

- ✅ **Scalability**: Create unlimited pools
- ✅ **Isolation**: Risk is separated per pool
- ✅ **Flexibility**: Different maturity dates and terms per pool
- ✅ **Long-term**: New pools can be created after previous pools mature

### Creating New Pools

```bash
# After deploying Factory once, create pools as needed
npx hardhat run scripts/createPool.ts --network arc
```

Each pool gets a unique `poolId` (auto-incrementing). Frontend automatically detects new pools via `PoolsAddresses.ts`.

### Frontend Integration

- Frontend uses `PoolContext` to manage selected pool
- All hooks (`useBondSeries`, `useBondToken`) automatically switch addresses based on selected pool
- Users can switch pools (UI can be enhanced to show pool selector)

---

## 🛠️ Tech Stack

**Smart Contracts:**
- Solidity 0.8.20
- Hardhat
- OpenZeppelin (AccessControl, Pausable, ReentrancyGuard, Ownable)
- Solidity Optimizer (enabled, runs: 200)

**Backend:**
- Node.js + node-cron
- ethers.js v6
- Deployed on Render.com

**Frontend:**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- wagmi + viem
- react-hot-toast
- React Context API (PoolContext)

---

## 📝 Roles & Permissions

### BondFactory Roles

| Role | Permissions |
|------|-------------|
| **POOL_CREATOR_ROLE** | Create new bond pools via Factory |

### BondSeries Roles (Per Pool)

| Role | Permissions |
|------|-------------|
| **DEFAULT_ADMIN_ROLE** | Distribute coupons, withdraw, pause, grant roles (per pool) |
| **KEEPER_ROLE** | Record snapshots only (per pool) |

---

## 🔐 Security Features

- ✅ **Reserve Ratio**: Owner cannot withdraw if solvency <30%
- ✅ **Pause Mechanism**: Stop deposits in emergency (claims/redeems still work)
- ✅ **Maturity Check**: Cannot deposit after pool maturity date
- ✅ **ReentrancyGuard**: All fund transfers protected
- ✅ **Emergency Redeem**: Auto-enabled if owner defaults 3+ days
- ✅ **AccessControl**: Role-based permissions (per pool)
- ✅ **6-decimal precision**: Zero precision loss with USDC
- ✅ **Factory Pattern**: Isolated pools, each with independent risk

---

## 📊 System Health Indicators

| Status | Condition | Action |
|--------|-----------|--------|
| **Healthy** | All distributions on time | ✅ Normal |
| **Warning** | 1-2 snapshots pending | ⚠️ Monitor |
| **Critical** | 3+ snapshots pending | 🚨 Emergency redeem enabled |


---

## 📖 Resources

- **Circle Faucet**: https://faucet.circle.com/
- **Arc Testnet Docs**: https://docs.arc.network
- **Block Explorer**: https://testnet.arcscan.app

---

## 🔄 Migration Notes

### From Legacy to Factory Pattern

If you previously deployed using `deployBondSystem.ts`:

1. **Legacy deployment** is still supported via `bond-system.json`
2. **New deployments** should use Factory pattern (`deployFactory.ts` + `createPool.ts`)
3. Frontend supports both:
   - Legacy: Reads from `bond-system.json` if exists
   - Factory: Reads from `bond-factory.json` (preferred)

### File Structure

```
contracts/deployments/
  ├── bond-factory.json    # Factory + all pools (preferred)
  └── bond-system.json     # Legacy single pool (optional)

frontend/src/abi/
  ├── PoolsAddresses.ts    # All pool addresses (from factory)
  ├── BondFactoryABI.ts    # Factory contract ABI
  └── contracts.ts         # Aggregated exports
```

---

## 📄 License

MIT License

---

## 🤝 Contributing

This is a testnet project for demonstration purposes.

---

**Built with ❤️ on Arc Testnet**
