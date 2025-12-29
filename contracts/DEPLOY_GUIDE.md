# 🚀 Hướng Dẫn Deploy & Test BondSeries (Auto-Interest)

## 📋 Tổng Quan

Contract mới đã được update để:
- ✅ **Bỏ snapshot mechanism** - Không cần keeper/automation nữa
- ✅ **Interest tự động tích lũy** - Tính theo `block.timestamp` liên tục
- ✅ **Owner deposit USDC** - Bất kỳ lúc nào để fund coupon payments
- ✅ **User claim** - Tính lãi real-time khi claim

---

## 🔧 Bước 1: Setup Environment

```bash
cd arc-00/contracts

# Đảm bảo có .env file với:
# - PRIVATE_KEY (owner wallet)
# - ARC_RPC_URL=https://rpc.testnet.arc.network
```

---

## 📦 Bước 2: Compile Contract

```bash
npx hardhat compile
```

Kiểm tra xem có lỗi compile không. Nếu thành công, sẽ thấy:
```
✅ Compiled successfully
```

---

## 🚀 Bước 3: Deploy Contract

```bash
npx hardhat run scripts/deployBondSystem.ts --network arc
```

**Expected Output:**
```
🚀 Deploying ArcBond System...

📍 Deploying with account: 0x...
📍 Network: arc (Chain ID: 5042002)

1️⃣ Using Arc Testnet USDC: 0x3600000000000000000000000000000000000000

2️⃣ Deploying BondToken...
✅ BondToken deployed to: 0x...

3️⃣ Deploying BondSeries...
✅ BondSeries deployed to: 0x...

4️⃣ Transferring BondToken ownership to BondSeries...
✅ Ownership transferred

📋 Contract Addresses:
   BondToken:   0x...
   BondSeries:  0x...

⚙️  Configuration:
   Mint Ratio:  1 USDC → 10 arcUSDC
   Interest:    Continuous accrual (no snapshot required)
   ...
```

**Lưu ý:** Addresses sẽ tự động save vào `deployments/bond-system.json`

---

## 💰 Bước 4: Get USDC (Owner)

**Trên Arc Testnet, USDC address:** `0x3600000000000000000000000000000000000000`

Có 2 cách để có USDC:
1. **Arc Faucet/Bridge** - Lấy USDC từ faucet hoặc bridge vào testnet
2. **Existing wallet** - Nếu wallet đã có USDC

Kiểm tra balance:
```bash
npx hardhat run scripts/00-viewStatus.ts --network arc
```

Nếu chưa có USDC, bạn cần lấy từ faucet hoặc bridge trước khi tiếp tục.

---

## 💼 Bước 5: User Deposit (Investor)

```bash
# Đổi .env sang investor wallet (nếu khác owner)
npx hardhat run scripts/02-deposit.ts --network arc
```

**Expected Output:**
```
💼 Depositing USDC to BondSeries...
💵 USDC balance: 10000 USDC
🎫 BondToken balance: 0 ABOND

⏳ Approving 100 USDC...
✅ Approved
⏳ Depositing 100 USDC...
✅ Deposited successfully!

📊 Results:
💵 USDC balance: 9900 USDC
🎫 BondToken balance: 1000 ABOND
📈 BondToken received: 1000 ABOND
```

---

## 📊 Bước 6: Check Status

```bash
npx hardhat run scripts/00-viewStatus.ts --network arc
```

**Expected Output:**
```
📊 ArcBond System Status
============================================================

🏦 SERIES INFORMATION
------------------------------------------------------------
Maturity Date: 2025-01-XX...
Status: ⏳ ACTIVE
Emergency Mode: ✅ Normal

💰 FINANCIAL STATUS
------------------------------------------------------------
Total Deposited: 100 USDC
Total BondToken Supply: 1000 ABOND
Treasury Balance: 100 USDC

📈 COUPON INDEX (Continuous Accrual)
------------------------------------------------------------
Current Index: 0
Last Distribution Time: 2025-01-XX...
Time Since Last Distribution: 0.00 days
```

---

## 💸 Bước 7: Owner Distribute Coupon

**Lưu ý:** KHÔNG CẦN snapshot nữa! Owner có thể deposit bất kỳ lúc nào.

```bash
# Đổi .env về owner wallet
npx hardhat run scripts/04-distributeCoupon.ts --network arc
```

**Expected Output:**
```
💸 Distributing Coupon (Owner deposit)...

📊 Current Status:
   Total Supply: 1000 ABOND
   Current Index: 0
   Last Distribution Time: 2025-01-XX...
   Time Elapsed: 0.00 days

💰 Recommended deposit:
   Per day (1% of totalSupply): 1 USDC

💵 Amount to deposit: 1 USDC
   Owner Balance: 9900 USDC

⏳ Approving USDC...
✅ Approved
⏳ Depositing USDC and snapshotting index...
✅ Distribution complete!

📊 After distribution:
   Index Snapshot: 0
   Last Distribution Time: 2025-01-XX...
```

---

## ⏰ Bước 8: Wait (Để lãi tích lũy)

Chờ một khoảng thời gian (ví dụ: 1 giờ, 1 ngày) để lãi tích lũy.

Index sẽ tự động tăng theo công thức:
```
currentIndex = lastDistributionIndex + (timeElapsed * INDEX_RATE_PER_SECOND)
```

Ví dụ sau 1 ngày (86400 seconds):
- Index tăng = 86400 * INDEX_RATE_PER_SECOND
- Với 1000 tokens, claimable ≈ 1 USDC

---

## 💰 Bước 9: User Claim Coupon

```bash
# Đổi .env về investor wallet
npx hardhat run scripts/05-claimCoupon.ts --network arc
```

**Expected Output:**
```
💰 Claiming Coupon...
🎫 Your BondToken balance: 1000 ABOND
💵 Claimable coupon: 1.0 USDC

📊 Before claim:
   USDC balance: 9900 USDC
   Current Index: 0.001
   Your Claimed Index: 0

⏳ Claiming coupon...
✅ Coupon claimed!

📊 After claim:
   USDC balance: 9901 USDC
   USDC received: 1 USDC
   Your Claimed Index: 0.001
```

---

## 🔄 Bước 10: Repeat (Owner Distribute → User Claim)

Owner có thể deposit thêm USDC bất kỳ lúc nào:

```bash
# Owner
npx hardhat run scripts/04-distributeCoupon.ts --network arc

# User (sau khi đợi lãi tích lũy)
npx hardhat run scripts/05-claimCoupon.ts --network arc
```

**Flow:**
1. Owner deposit USDC → Snapshot current index
2. Time passes → Index tự động tăng
3. User claim → Tính lãi dựa trên current index

---

## 🎯 Bước 11: Test Scenarios

### Test 1: Multiple Users
```bash
# User 1 deposit 100 USDC
npx hardhat run scripts/02-deposit.ts --network arc

# User 2 deposit 200 USDC (đổi wallet)
npx hardhat run scripts/02-deposit.ts --network arc

# Owner distribute
npx hardhat run scripts/04-distributeCoupon.ts --network arc

# Both users claim (lãi chia theo tỷ lệ token)
npx hardhat run scripts/05-claimCoupon.ts --network arc
```

### Test 2: Time-based Accrual
```bash
# Check status ngay sau deposit
npx hardhat run scripts/00-viewStatus.ts --network arc
# Current Index: 0

# Đợi 1 giờ, check lại
npx hardhat run scripts/00-viewStatus.ts --network arc
# Current Index: ~0.00004167 (1 giờ / 24 giờ * 0.001)

# Owner distribute → snapshot index
npx hardhat run scripts/04-distributeCoupon.ts --network arc

# Đợi thêm 1 giờ, index lại tăng
npx hardhat run scripts/00-viewStatus.ts --network arc
# Current Index: ~0.00008333
```

### Test 3: Emergency Mode
```bash
# Đợi >3 days mà không distribute
# Check status
npx hardhat run scripts/00-viewStatus.ts --network arc
# Emergency Mode: 🚨 ENABLED

# Owner distribute → reset emergency mode
npx hardhat run scripts/04-distributeCoupon.ts --network arc
# Emergency Mode: ✅ Normal
```

---

## 🔍 Troubleshooting

### "Insufficient USDC balance"
- Lấy USDC từ Arc faucet/bridge
- Hoặc transfer từ wallet khác
- USDC address trên Arc Testnet: `0x3600000000000000000000000000000000000000`

### "No coupon to claim yet"
- Check xem owner đã distribute chưa
- Check xem đã có thời gian để lãi tích lũy chưa
- View status: `npx hardhat run scripts/00-viewStatus.ts --network arc`

### Contract address không đúng
- Check file `deployments/bond-system.json`
- Hoặc manual update trong `.env`:
  ```
  BOND_SERIES_ADDRESS=0x...
  BOND_TOKEN_ADDRESS=0x...
  ```

---

## 📝 Checklist Deploy

- [ ] Compile contract thành công
- [ ] Deploy BondToken và BondSeries
- [ ] Có USDC trong wallet (từ faucet/bridge)
- [ ] User deposit USDC → nhận BondToken
- [ ] Owner distribute coupon
- [ ] Đợi lãi tích lũy (hoặc fast-forward time nếu testnet)
- [ ] User claim coupon thành công
- [ ] Check status mọi thứ OK

---

## 🎉 Success!

Nếu tất cả steps trên thành công, bạn đã deploy và test thành công contract với auto-interest logic!

**Key Differences từ version cũ:**
- ❌ Không cần snapshot/keeper automation
- ✅ Interest tự động tích lũy theo thời gian
- ✅ Owner deposit bất kỳ lúc nào
- ✅ User claim tính real-time

