# 🤖 ArcBond Backend

Automated keeper service for ArcBond - records daily snapshots and monitors system health.

---

## 🎯 Features

- ✅ **Daily Snapshots** - Automated snapshot recording
- ✅ **Health Monitoring** - Track distributions and solvency
- ✅ **Discord Alerts** - Real-time notifications
- ✅ **Emergency Detection** - Auto-alert on defaults
- ✅ **Gas Monitoring** - Low balance warnings
- ✅ **Event Tracking** - Monitor all contract activity

---

## 🚀 Quick Start

### Installation

```bash
npm install
cp .env.example .env
# Edit .env with your values
```

### Local Testing

```bash
# Test snapshot once
npm run snapshot

# Test monitor once
npm run monitor

# Run cron locally (dev only)
npm start
```

---

## ⚙️ Configuration

### Environment Variables

```bash
ARC_RPC_URL=https://rpc.testnet.arc.network
CHAIN_ID=5042002
KEEPER_PRIVATE_KEY=0x...
BOND_SERIES_ADDRESS=0x...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... # Optional
```

### Keeper Wallet Setup

**1. Generate wallet:**
```bash
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address, '\nKey:', w.privateKey);"
```

**2. Fund with USDC** (Arc uses USDC as gas token)
- Send ~10 USDC to keeper address
- Enough for 100+ snapshots

**3. Grant KEEPER_ROLE** (from contracts folder):
```bash
npx hardhat run scripts/grantKeeperRole.ts --network arc
```

---

## 🌐 Render.com Deployment

### Using Blueprint (Recommended)

1. **Push to GitHub**
2. **Connect to Render** → New Blueprint
3. **Render reads `render.yaml`** → Creates 2 cron jobs automatically:
   - `arcbond-snapshot` - Daily at 00:00 UTC
   - `arcbond-monitor` - Every hour
4. **Set environment variables** in Render dashboard
5. **Deploy** → Services start automatically

### Manual Deploy

Create 2 cron jobs in Render dashboard:

**Snapshot Service:**
- Name: `arcbond-snapshot`
- Command: `node src/snapshot.js`
- Schedule: `0 0 * * *` (daily at midnight UTC)

**Monitor Service:**
- Name: `arcbond-monitor`
- Command: `node src/monitor.js`
- Schedule: `0 * * * *` (hourly)

---

## 📊 Services

### Snapshot Cron

**Schedule:** Daily at 00:00 UTC

**Function:**
- Check if 24 hours passed since last snapshot
- Call `recordSnapshot()` on BondSeries contract
- Calculate coupon due (0.001 USDC per arcUSDC)
- Send Discord notification

**Logs:**
```
📸 Recording snapshot #5
💰 Coupon Due: 10.50 USDC
✅ Success! TX: 0x...
```

### Monitor Cron

**Schedule:** Every hour

**Function:**
- Check keeper balance (alert if <2 USDC)
- Check pending distributions (alert if ≥1)
- Detect emergency mode
- Monitor recent events (deposits, claims, redeems)

**Logs:**
```
🔍 Health Check
📊 Pending: 0 | Balance: 8.5 USDC
✅ All systems normal
```

---

## 🔔 Discord Notifications

### Snapshot Alerts
- ✅ Snapshot recorded successfully
- ❌ Snapshot failed (with error details)
- ⏰ Too soon (need to wait)

### Monitor Alerts
- 🚨 **Emergency mode activated**
- ⚠️ **Missed distributions** (1, 2, 3+ levels)
- ⚠️ **Low keeper balance** (<2 USDC)
- 💰 Coupons distributed
- 🎉 Bond maturity reached
- 📊 Daily stats summary

---

## 🔧 Troubleshooting

### "TooSoon" Error

**Cause:** Contract enforces 24-hour interval

**Solution:** Wait for next scheduled time. This is normal behavior.

### "Insufficient funds"

**Cause:** Keeper has no USDC for gas

**Solution:** Send USDC to keeper wallet

### "AccessControl: account is missing role"

**Cause:** Keeper doesn't have KEEPER_ROLE

**Solution:** Owner must grant role via contract

### Cron not running on Render

**Cause:** Free tier limitations

**Solution:** 
- Check cron schedule syntax
- Use "Manual Trigger" to test
- Check logs for errors

---

## 🔐 Security

### Keeper Permissions

**CAN do:**
- ✅ Call `recordSnapshot()` only

**CANNOT do:**
- ❌ Distribute coupons
- ❌ Withdraw funds
- ❌ Pause contract
- ❌ Grant/revoke roles

### If Keeper Compromised

**Impact:** Minimal - can only spam snapshots (limited by 24h cooldown)

**Recovery:**
1. Owner revokes KEEPER_ROLE
2. Generate new keeper wallet
3. Grant role to new keeper
4. Update environment variables

---

## 📚 Resources

- **Render Docs**: https://render.com/docs/cronjobs
- **Arc Network**: https://docs.arc.network
- **ArcBond Contracts**: `../arc-00/contracts/`

---

## 📄 License

MIT License
