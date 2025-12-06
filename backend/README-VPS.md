# 🖥️ ArcBond Backend - VPS Deployment Guide

Hướng dẫn deploy ArcBond backend trên VPS (Ubuntu/Debian).

---

## 📋 Yêu Cầu

- **OS**: Ubuntu 20.04+ hoặc Debian 11+
- **Node.js**: 18.x hoặc cao hơn
- **PM2**: Để quản lý process (optional nhưng recommended)
- **Keeper Wallet**: Có private key và đã được grant KEEPER_ROLE

---

## 🚀 Quick Setup

### 1. Clone Repository

```bash
cd ~
git clone <your-repo-url>
cd arcbond-backend  # hoặc tên folder của bạn
```

### 2. Run Setup Script

```bash
chmod +x setup-vps.sh
./setup-vps.sh
```

Script sẽ tự động:
- Kiểm tra và cài Node.js nếu chưa có
- Cài PM2 nếu chưa có
- Install npm dependencies
- Tạo logs directory
- Setup .env file
- Hướng dẫn setup crontab

### 3. Configure Environment

```bash
nano .env
```

Điền các giá trị:
```bash
ARC_RPC_URL=https://rpc.testnet.arc.network
CHAIN_ID=5042002
KEEPER_PRIVATE_KEY=0x...  # REQUIRED
BOND_SERIES_ADDRESS=0x...  # Legacy single-pool
# HOẶC
BOND_FACTORY_ADDRESS=0x...  # Factory pattern
POOL_IDS=1,2,3  # Optional: comma-separated pool IDs
DISCORD_WEBHOOK_URL=https://...  # Optional
```

### 4. Test Manually

```bash
# Test snapshot
npm run snapshot

# Test monitor
npm run monitor
```

---

## ⏰ Crontab Setup

### Option 1: System Crontab (Recommended)

```bash
crontab -e
```

Thêm các dòng sau:
```cron
# Snapshot - Daily at 00:00 UTC
0 0 * * * cd /path/to/backend && /usr/bin/node src/snapshot.js >> logs/snapshot-cron.log 2>&1

# Monitor - Every hour
0 * * * * cd /path/to/backend && /usr/bin/node src/monitor.js >> logs/monitor-cron.log 2>&1
```

**Lưu ý**: Thay `/path/to/backend` bằng đường dẫn thực tế của bạn.

### Option 2: PM2 Cron Module

```bash
# Install PM2 cron module
pm2 install pm2-cron

# Add cron jobs via PM2
pm2 cron "0 0 * * *" "node $(pwd)/src/snapshot.js" arcbond-snapshot
pm2 cron "0 * * * *" "node $(pwd)/src/monitor.js" arcbond-monitor
```

---

## 🔍 Monitoring & Logs

### View Logs

```bash
# System crontab logs
tail -f logs/snapshot-cron.log
tail -f logs/monitor-cron.log

# PM2 logs (if using PM2)
pm2 logs arcbond-snapshot
pm2 logs arcbond-monitor

# All logs
pm2 logs
```

### Check Crontab

```bash
# View crontab
crontab -l

# Check cron service
sudo systemctl status cron
```

### PM2 Commands

```bash
# Start apps
pm2 start ecosystem.config.js

# Stop apps
pm2 stop all

# Restart apps
pm2 restart all

# View status
pm2 status

# View logs
pm2 logs

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

---

## 🔧 Troubleshooting

### Cron Jobs Not Running

1. **Check cron service:**
   ```bash
   sudo systemctl status cron
   sudo systemctl start cron
   ```

2. **Check cron logs:**
   ```bash
   sudo grep CRON /var/log/syslog
   ```

3. **Test manually:**
   ```bash
   node src/snapshot.js
   node src/monitor.js
   ```

4. **Check file paths in crontab:**
   - Đảm bảo đường dẫn đầy đủ (use `which node` để tìm node path)
   - Đảm bảo `cd` đúng directory

### Permission Errors

```bash
# Ensure .env file is readable
chmod 600 .env

# Ensure logs directory is writable
chmod 755 logs
```

### "KEEPER_PRIVATE_KEY is required" Error

- Kiểm tra `.env` file có `KEEPER_PRIVATE_KEY` chưa
- Đảm bảo không có spaces hoặc quotes thừa
- Format: `KEEPER_PRIVATE_KEY=0x1234...`

### Keeper Has No Role

```bash
# From contracts folder
npx hardhat run scripts/grantKeeperRole.ts --network arc
```

---

## 📊 Health Checks

### Manual Health Check

```bash
# Run monitor manually
npm run monitor
```

Sẽ hiển thị:
- Keeper balance
- Contract status
- Emergency mode status
- Pending distributions
- Recent events

### Discord Notifications

Nếu setup `DISCORD_WEBHOOK_URL`, bạn sẽ nhận được:
- ✅ Snapshot thành công
- ❌ Snapshot failed
- 🚨 Emergency mode activated
- ⚠️ Missed distributions
- ⚠️ Low keeper balance

---

## 🔐 Security Best Practices

1. **Protect .env file:**
   ```bash
   chmod 600 .env
   ```

2. **Don't commit .env:**
   - Đảm bảo `.env` trong `.gitignore`

3. **Use non-root user:**
   - Không chạy với root
   - Tạo user riêng cho backend

4. **Firewall:**
   ```bash
   sudo ufw allow ssh
   sudo ufw enable
   ```

5. **Regular Updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   npm update
   ```

---

## 🏭 Factory Pattern Support

Nếu dùng Factory pattern (nhiều pools):

1. **Set BOND_FACTORY_ADDRESS** trong `.env`:
   ```bash
   BOND_FACTORY_ADDRESS=0x...
   ```

2. **Optionally set POOL_IDS**:
   ```bash
   POOL_IDS=1,2,3
   ```
   
   Nếu không set, sẽ monitor tất cả pools từ Factory.

3. **Backend sẽ tự động:**
   - Query Factory để lấy danh sách pools
   - Monitor tất cả pools
   - Record snapshot cho mỗi pool khi đến giờ

---

## 📝 Maintenance

### Update Code

```bash
git pull origin main
npm install
pm2 restart all  # Nếu dùng PM2
```

### Rotate Logs

```bash
# Install logrotate
sudo apt install logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/arcbond-backend
```

Content:
```
/path/to/backend/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

---

## 🆘 Support

- **Issues**: Check logs first
- **Discord**: Check webhook notifications
- **Contract Issues**: Check Arc Testnet explorer

---

**Happy Deploying! 🚀**

