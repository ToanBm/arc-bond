"use client";

import { useEffect } from "react";
import { usePortfolioData } from "@/hooks";
import { useClaimCoupon } from "@/hooks/useBondSeries";
import toast from "react-hot-toast";

export default function ClaimCard() {
  const { claimableAmount, usdcBalance, isConnected } = usePortfolioData();
  const { claimCoupon, isPending, isSuccess, hash } = useClaimCoupon();

  // Format amounts to 2 decimal places
  const formattedClaimable = parseFloat(claimableAmount || "0").toFixed(2);
  const formattedClaimed = parseFloat(usdcBalance || "0").toFixed(2);

  // Show success toast
  useEffect(() => {
    if (isSuccess && hash) {
      toast.success(
        <div className="flex flex-col gap-1">
          <div>✅ Claimed {formattedClaimable} USDC successfully!</div>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, hash, formattedClaimable]);

  const handleClaim = () => {
    toast.loading("Claiming coupon...");
    claimCoupon();
  };

  const canClaim = isConnected && parseFloat(claimableAmount) > 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Claim Coupon</h3>
        <div className="text-sm text-gray-600">
          ℹ️ Coupons are paid daily at 1% per day
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          {/* Claimable Amount - Left (50%) */}
          <div className="flex-1 bg-gray-50 border border-custom rounded-lg px-4 py-2 text-center flex items-center justify-center">
            <div className="text-sm text-gray-600">
              Claimable Amount: <span className="text-base font-bold text-gray-900">{formattedClaimable} USDC</span>
            </div>
          </div>

          {/* Total Claimed - Right (50%) */}
          <div className="flex-1 bg-gray-50 border border-custom rounded-lg px-4 py-2 text-center flex items-center justify-center">
            <div className="text-sm text-gray-600">
              Total Claimed: <span className="text-base font-bold text-gray-900">{formattedClaimed} USDC</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleClaim}
          disabled={!canClaim || isPending}
          className="w-full btn-primary font-medium py-2 px-4 disabled:opacity-50"
        >
          {!isConnected 
            ? "Connect wallet to claim"
            : isPending 
              ? "Claiming..." 
              : "Claim Coupon"}
        </button>
      </div>
    </div>
  );
}

