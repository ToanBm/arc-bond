#!/bin/bash

# ArcBond Backend VPS Setup Script
# Run this script on your VPS to set up the backend

set -e

echo "🚀 ArcBond Backend VPS Setup"
echo "============================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Running as root user."
   echo "⚠️  For better security, consider creating a dedicated user:"
   echo "   adduser arcbond"
   echo "   usermod -aG sudo arcbond"
   echo "   su - arcbond"
   echo ""
   read -p "Continue as root? (y/N): " -n 1 -r
   echo
   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
       exit 1
   fi
   echo ""
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine if we need sudo
SUDO=""
if [ "$EUID" -ne 0 ]; then
    SUDO="sudo"
fi

# Check Node.js
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Installing Node.js 18...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO -E bash -
    $SUDO apt-get install -y nodejs
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

# Check PM2
echo ""
echo "📦 Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 not found. Installing PM2...${NC}"
    if [ "$EUID" -eq 0 ]; then
        npm install -g pm2
    else
        sudo npm install -g pm2
    fi
fi

PM2_VERSION=$(pm2 -v)
echo -e "${GREEN}✅ PM2 version: $PM2_VERSION${NC}"

# Install dependencies
echo ""
echo "📦 Installing npm dependencies..."
npm install

# Create logs directory
echo ""
echo "📁 Creating logs directory..."
mkdir -p logs

# Setup .env file
echo ""
echo "📝 Setting up .env file..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Created .env from .env.example${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env and fill in your values:${NC}"
        echo "   - KEEPER_PRIVATE_KEY (required)"
        echo "   - BOND_SERIES_ADDRESS or BOND_FACTORY_ADDRESS (required)"
        echo "   - DISCORD_WEBHOOK_URL (optional)"
        echo ""
        echo "Run: nano .env"
    else
        echo -e "${RED}❌ .env.example not found!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Setup crontab
echo ""
echo "⏰ Setting up crontab..."
echo ""
echo "Choose crontab setup method:"
echo "1) Use PM2 cron (recommended)"
echo "2) Use system crontab"
echo -n "Enter choice [1-2]: "
read CRON_CHOICE

case $CRON_CHOICE in
    1)
        echo ""
        echo "📝 Setting up PM2 cron..."
        echo ""
        echo "To add cron jobs with PM2, run these commands:"
        echo ""
        echo "  # Snapshot (daily at 00:00 UTC)"
        echo "  pm2 cron '0 0 * * *' 'node $(pwd)/src/snapshot.js' arcbond-snapshot"
        echo ""
        echo "  # Monitor (hourly)"
        echo "  pm2 cron '0 * * * *' 'node $(pwd)/src/monitor.js' arcbond-monitor"
        echo ""
        echo "Or use crontab + PM2 (see option 2)"
        ;;
    2)
        echo ""
        echo "📝 Setting up system crontab..."
        
        # Create crontab entries
        CRON_SNAPSHOT="0 0 * * * cd $(pwd) && /usr/bin/node src/snapshot.js >> logs/snapshot-cron.log 2>&1"
        CRON_MONITOR="0 * * * * cd $(pwd) && /usr/bin/node src/monitor.js >> logs/monitor-cron.log 2>&1"
        
        # Check if already in crontab
        (crontab -l 2>/dev/null | grep -q "arcbond-snapshot") || (crontab -l 2>/dev/null; echo "$CRON_SNAPSHOT") | crontab -
        (crontab -l 2>/dev/null | grep -q "arcbond-monitor") || (crontab -l 2>/dev/null; echo "$CRON_MONITOR") | crontab -
        
        echo -e "${GREEN}✅ Crontab entries added${NC}"
        echo ""
        echo "View crontab: crontab -l"
        echo "Edit crontab: crontab -e"
        ;;
    *)
        echo -e "${YELLOW}⚠️  Skipping crontab setup${NC}"
        ;;
esac

echo ""
echo "============================"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration:"
echo "   nano .env"
echo ""
echo "2. Test snapshot manually:"
echo "   npm run snapshot"
echo ""
echo "3. Test monitor manually:"
echo "   npm run monitor"
echo ""
echo "4. Start with PM2 (if using PM2 for monitoring):"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup  # Run the command it outputs"
echo ""
echo "5. Check logs:"
echo "   pm2 logs"
echo "   # or"
echo "   tail -f logs/*.log"
echo ""

