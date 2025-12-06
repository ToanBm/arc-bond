#!/bin/bash

echo "🧪 ArcBond Backend - Local Testing"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Create .env from ENV_TEMPLATE.md first"
    echo ""
    echo "Quick setup:"
    echo "  1. cp ENV_TEMPLATE.md .env"
    echo "  2. Edit .env with your values"
    echo "  3. Run this script again"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "1️⃣ Testing Snapshot Script"
echo "--------------------------"
npm run snapshot
SNAPSHOT_EXIT=$?

echo ""
echo ""

echo "2️⃣ Testing Monitor Script"
echo "--------------------------"
npm run monitor
MONITOR_EXIT=$?

echo ""
echo ""
echo "=================================="
echo "📊 Test Results"
echo "=================================="

if [ $SNAPSHOT_EXIT -eq 0 ]; then
    echo "✅ Snapshot: PASSED"
else
    echo "❌ Snapshot: FAILED (exit code: $SNAPSHOT_EXIT)"
fi

if [ $MONITOR_EXIT -eq 0 ]; then
    echo "✅ Monitor: PASSED"
else
    echo "❌ Monitor: FAILED (exit code: $MONITOR_EXIT)"
fi

echo ""

if [ $SNAPSHOT_EXIT -eq 0 ] && [ $MONITOR_EXIT -eq 0 ]; then
    echo "🎉 All tests passed! Ready to deploy to Render."
    echo ""
    echo "Next steps:"
    echo "  1. Push to GitHub"
    echo "  2. Connect to Render.com"
    echo "  3. Deploy via Blueprint (render.yaml)"
    exit 0
else
    echo "⚠️ Some tests failed. Check errors above."
    echo ""
    echo "Common fixes:"
    echo "  - Verify KEEPER_PRIVATE_KEY in .env"
    echo "  - Verify BOND_SERIES_ADDRESS is correct"
    echo "  - Check keeper has KEEPER_ROLE granted"
    echo "  - Check keeper has USDC for gas"
    exit 1
fi

