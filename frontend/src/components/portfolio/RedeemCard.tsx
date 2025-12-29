"use client";

import { useEffect, useState, useMemo } from "react";
import { usePortfolioData } from "@/hooks";
import { useDashboardData } from "@/hooks";
import { useRedeem } from "@/hooks/useBondSeries";
import { useMaturePools } from "@/hooks/useMaturePools";
import { usePool } from "@/contexts/PoolContext";
import toast from "react-hot-toast";

export default function RedeemCard() {
  const { abondBalance, abondBalanceRaw, redeemableAmount, isConnected } = usePortfolioData();
  const { hasMatured, timeToMaturity } = useDashboardData();
  const { selectedPool } = usePool();
  const { maturePools, isLoading: loadingMaturePools } = useMaturePools();

  // Selected pool for redeem (from dropdown)
  const [selectedRedeemPoolId, setSelectedRedeemPoolId] = useState<string | null>(null);

  // Get selected redeem pool info
  const selectedRedeemPool = useMemo(() => {
    if (selectedRedeemPoolId) {
      return maturePools.find(p => p.poolId === selectedRedeemPoolId) || null;
    }
    // Default to current pool if it's mature
    if (hasMatured && selectedPool && parseFloat(abondBalance) > 0) {
      return {
        poolId: selectedPool.poolId,
        name: selectedPool.name || "Current Pool",
        symbol: selectedPool.symbol || "arcUSDC",
        bondSeries: selectedPool.bondSeries,
        bondToken: selectedPool.bondToken,
        balance: abondBalance,
        balanceRaw: abondBalanceRaw || BigInt(0),
        redeemableAmount,
        isMature: true,
        maturityDate: Number(selectedPool.maturityDate || 0),
      };
    }
    // Or first mature pool
    return maturePools.length > 0 ? maturePools[0] : null;
  }, [selectedRedeemPoolId, maturePools, hasMatured, selectedPool, abondBalance, abondBalanceRaw, redeemableAmount]);

  // Update selected pool when mature pools change
  useEffect(() => {
    if (maturePools.length > 0 && !selectedRedeemPoolId) {
      // Auto-select first mature pool
      setSelectedRedeemPoolId(maturePools[0].poolId);
    }
  }, [maturePools, selectedRedeemPoolId]);

  const { redeem, isPending, isSuccess, hash } = useRedeem(selectedRedeemPool?.bondSeries);

  // Show success toast
  useEffect(() => {
    if (isSuccess && hash && selectedRedeemPool) {
      toast.success(
        <div className="flex flex-col gap-1">
          <div>✅ Redeemed {selectedRedeemPool.redeemableAmount} USDC from {selectedRedeemPool.name} successfully!</div>
          <a
            href={`https://testnet.arcscan.app/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-base font-medium text-blue-600 hover:underline"
          >
            View on Explorer!
          </a>
        </div>
      );
    }
  }, [isSuccess, hash, selectedRedeemPool]);

  const handleRedeem = () => {
    if (!selectedRedeemPool || !selectedRedeemPool.balanceRaw) return;
    toast.loading("Redeeming principal...");
    redeem(selectedRedeemPool.balance); // Pass formatted amount, hook will parse it
  };

  const canRedeem = isConnected && selectedRedeemPool && parseFloat(selectedRedeemPool.balance) > 0;

  // Check if current pool is mature (for display)
  const showCurrentPoolInfo = hasMatured && selectedPool && parseFloat(abondBalance) > 0;

  // Show message if no mature pools
  if (isConnected && !loadingMaturePools && maturePools.length === 0 && !showCurrentPoolInfo) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Redeem Principal</h3>
          {!hasMatured && (
            <div className="text-sm text-gray-600">
              ⏰ Matures in: {timeToMaturity}
            </div>
          )}
        </div>
        <div className="bg-gray-50 border border-custom rounded-lg p-4 text-center text-gray-500">
          No mature pools with balance to redeem
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Redeem Principal</h3>
        {selectedRedeemPool && (
          <div className="text-sm text-green-600">
            ✅ Matured
          </div>
        )}
        {!selectedRedeemPool && !hasMatured && (
          <div className="text-sm text-gray-600">
            ⏰ Matures in: {timeToMaturity}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Dropdown and Redeemable side by side */}
        {maturePools.length > 0 ? (
          <>
            <div className="flex gap-4 items-stretch">
              {/* Select Pool - Left (50%) */}
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">Select Pool</div>
                <select
                  value={selectedRedeemPoolId || maturePools[0]?.poolId || ""}
                  onChange={(e) => setSelectedRedeemPoolId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-[42px] bg-white"
                >
                  {maturePools.map((pool) => (
                    <option key={pool.poolId} value={pool.poolId}>
                      {pool.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Redeemable - Right (50%) */}
              {selectedRedeemPool && (
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">Redeemable Amount</div>
                  <div className="bg-gray-50 border border-custom rounded-lg px-3 py-2 text-center flex items-center justify-center h-[42px]">
                    <span className="font-bold text-gray-900">{selectedRedeemPool.redeemableAmount} USDC</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : showCurrentPoolInfo ? (
          /* Fallback: Show current pool if no mature pools but current is mature */
          <div className="bg-gray-50 border border-custom rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600">
              Redeemable: <span className="font-semibold">{redeemableAmount} USDC</span>
            </div>
          </div>
        ) : null}

        <button
          onClick={handleRedeem}
          disabled={!canRedeem || isPending}
          className="w-full btn-primary font-medium py-2 px-4 disabled:opacity-50"
        >
          {!isConnected
            ? "Connect wallet to redeem"
            : isPending
              ? "Redeeming..."
              : "Redeem All"}
        </button>
      </div>
    </div>
  );
}

