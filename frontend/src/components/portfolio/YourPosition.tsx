"use client";

import { usePortfolioData } from "@/hooks";

export default function YourPosition() {
  const {
    usdcBalance,
    abondBalance,
    isConnected
  } = usePortfolioData();

  // Format balances to 2 decimals
  const formattedUSDC = parseFloat(usdcBalance).toFixed(2);
  const formattedArcUSDC = parseFloat(abondBalance).toFixed(2);

  // Calculate daily coupon (arcUSDC × 0.001)
  const dailyCoupon = (parseFloat(abondBalance) * 0.001).toFixed(2);

  return (
    <div className="card">
      {!isConnected ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🔌</div>
          <div className="text-lg">Connect wallet to view your position</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">USDC Balance</div>
            <div className="text-lg font-bold text-gray-900">
              {formattedUSDC}
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">arcUSDC Balance</div>
            <div className="text-lg font-bold text-gray-900">
              {formattedArcUSDC}
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">Daily Coupon</div>
            <div className="text-lg font-bold text-gray-900">
              {dailyCoupon} <span className="text-sm text-gray-500">USDC/day</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

