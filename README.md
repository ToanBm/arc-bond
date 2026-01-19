# 🏦 ArcBond: Fixed Yield RWA Protocol

> **Institutional-grade Decentralized Fixed Yield Protocol** built on the Arc Testnet. ArcBond enables users to deposit USDC into bond series to earn a predictable daily yield (APY ~365% on testnet) with automated transparency and liquidity.

---

## 🌟 Core Features

- 🏛️ **Fixed Yield Bonds**: Predictable high-yield returns distributed daily through snapshots.
- ⛓️ **RWA Focused**: Designed for Real-World Asset representation and institutional yield mechanics.
- 📊 **Real-time Analytics**: Live TVL growth tracking, solvency monitoring, and health status.
- 🔄 **Automated Keeper**: Backend service ensures daily snapshots and interest accrual.
- 🌉 **Integrated Bridge**: Seamlessly move USDC between Arc and other testnets (Ethereum, Base, etc.).
- 🤝 **P2P Marketplace**: Gasless marketplace using EIP-712 signatures for secondary bond trading.

---

## 🏗️ Project Structure

```bash
arc-bond/
├── contracts/  # Hardhat & Solidity - Core logic & P2P Market
├── frontend/   # Next.js & Wagmi - Modern UI & Analytics Dashboard
└── backend/    # Node.js Keeper - Automated snapshots & health monitoring
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MetaMask or any EIP-1193 wallet
- USDC on Arc Testnet (Gas is paid in USDC)

### 1. Smart Contracts
```bash
cd contracts
npm install
npx hardhat compile
# Deployment: npx hardhat run scripts/deployBondSystem.ts --network arc
```

### 2. Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 3. Backend Keeper (Optional)
```bash
cd backend
npm install
npm start
```

---

## 🌐 Network Information

| Property | Value |
|----------|-------|
| **Network** | Arc Testnet |
| **Chain ID** | 5042002 |
| **Currency** | USDC |
| **Explorer** | [ArcScan](https://testnet.arcscan.app) |

---

## 🛠️ Tech Stack

- **Solidity**: Smart contracts (OpenZeppelin base)
- **Hardhat**: Development & testing environment
- **Next.js 15**: Modern frontend framework with Turbopack
- **Wagmi / Viem**: Robust Ethereum hooks and utilities
- **Recharts**: High-performance data visualization
- **Circle Bridge Kit**: Interoperability for USDC bridging

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
