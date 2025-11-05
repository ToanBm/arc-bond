# 🏦 ArcBond

**Decentralized Fixed-Rate Bond Platform on Arc Testnet**

A DeFi bond system enabling issuers to borrow USDC from investors with transparent terms and automated coupon distribution.

---

## 🎯 Overview

**For Investors:**
- Deposit USDC → Receive arcUSDC (bond tokens)
- Earn 1% daily coupons (365% APY)
- Redeem principal at maturity (14 days)

**For Issuers (Protocol Owner):**
- Withdraw up to 70% of deposited USDC
- Distribute coupons to bondholders
- 30% reserve locked on-chain for safety

---

## ✨ Key Features

- **Fixed Rate**: 1% daily coupon (365% APY)
- **Mint Ratio**: 1 USDC = 10 arcUSDC tokens
- **Maturity**: 14 days from deployment
- **Reserve Ratio**: 30% minimum locked
- **Max Cap**: 100,000 USDC TVL
- **Snapshot System**: Daily automated snapshots
- **Claim-based Coupons**: Users claim when ready
- **Emergency Mode**: Auto-enabled if owner defaults (3+ days late)
- **Pausable**: Owner can pause deposits in emergency

---

## 🏗️ Architecture

### Smart Contracts
- **BondSeries.sol** - Core bond logic
- **BondToken.sol** - arcUSDC ERC20 token (6 decimals)
- **USDC** - Circle's USDC on Arc Testnet

### Backend (Node.js on Render.com)
- **Snapshot Cron** - Records snapshots daily at 00:00 UTC
- **Monitor Cron** - Health checks every hour

### Frontend (Next.js)
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

```bash
cd arc/arc-00/contracts
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

| Contract | Address | Symbol |
|----------|---------|--------|
| **USDC** | `0x3600000000000000000000000000000000000000` | USDC |
| **BondToken** | [See deployments/bond-system.json] | arcUSDC |
| **BondSeries** | [See deployments/bond-system.json] | - |

**Explorer:** https://testnet.arcscan.app

---

## ⚙️ Configuration

### Contract Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Mint Ratio** | 1:10 | 1 USDC → 10 arcUSDC |
| **Coupon Rate** | 1% per day | 365% APY |
| **Snapshot Interval** | 1 day | Daily snapshots |
| **Maturity** | 336 hours | 14 days |
| **Reserve Ratio** | 30% | Minimum locked |
| **Max Cap** | 100,000 USDC | TVL limit |
| **Decimals** | 6 | Same as USDC |

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

```bash
cd contracts

# View system status
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

### Frontend Development

```bash
cd frontend

# Generate ABIs from deployed contracts
npm run genabi

# Run dev server
npm run dev

# Build for production
npm run build
```

### Backend Deployment

**Deploy to Render.com:**
1. Push code to GitHub
2. Connect repository to Render
3. Set environment variables:
   - `ARC_RPC_URL`
   - `KEEPER_PRIVATE_KEY`
   - `BOND_SERIES_ADDRESS`
   - `DISCORD_WEBHOOK_URL` (optional)
4. Deploy using `render.yaml` config

**Cron Jobs:**
- Snapshot: Daily at 00:00 UTC
- Monitor: Every hour

---

## 📚 User Flows

### Investor Flow

1. **Connect Wallet** → Arc Testnet
2. **Get USDC** → Circle Faucet
3. **Approve USDC** → Allow BondSeries to spend
4. **Deposit** → Receive arcUSDC (1:10 ratio)
5. **Wait** → Earn 1% daily coupons
6. **Claim Coupons** → Anytime after distribution
7. **Redeem** → At maturity (14 days), get USDC back

### Owner Flow

1. **Withdraw USDC** → Up to 70% for use
2. **Distribute Coupons** → After each daily snapshot
3. **Monitor Solvency** → Keep ≥30% reserve
4. **Pause if needed** → Emergency control

---

## 🛠️ Tech Stack

**Smart Contracts:**
- Solidity 0.8.20
- Hardhat
- OpenZeppelin (AccessControl, Pausable, ReentrancyGuard)

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

---

## 📝 Roles & Permissions

| Role | Address | Permissions |
|------|---------|-------------|
| **DEFAULT_ADMIN_ROLE** | Owner | Distribute coupons, withdraw, pause, grant roles |
| **KEEPER_ROLE** | Backend | Record snapshots only |

---

## 🔐 Security Features

- ✅ **Reserve Ratio**: Owner cannot withdraw if solvency <30%
- ✅ **Pause Mechanism**: Stop deposits in emergency (claims/redeems still work)
- ✅ **ReentrancyGuard**: All fund transfers protected
- ✅ **Emergency Redeem**: Auto-enabled if owner defaults 3+ days
- ✅ **AccessControl**: Role-based permissions
- ✅ **6-decimal precision**: Zero precision loss with USDC

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

## 📄 License

MIT License

---

## 🤝 Contributing

This is a testnet project for demonstration purposes.

---

**Built with ❤️ on Arc Testnet**
