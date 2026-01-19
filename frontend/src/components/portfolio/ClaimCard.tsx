"use client";

import { useEffect, useState } from "react";
import { usePortfolioData } from "@/hooks";
import { useClaimInterest } from "@/hooks/useBondSeries";
import toast from "react-hot-toast";

export default function ClaimCard() {
  const { claimableAmount, interestReceived, isConnected } = usePortfolioData();
  const { claimInterest, isPending, isSuccess, hash } = useClaimInterest();

  // Format amounts to 4 decimal places for consistency
  const formattedClaimable = parseFloat(claimableAmount || "0").toFixed(4);
  const formattedInterestReceived = parseFloat(interestReceived || "0").toFixed(4);

  const [claimingAmount, setClaimingAmount] = useState<string | null>(null);

  // Show success toast
  useEffect(() => {
    if (isSuccess && hash && claimingAmount) {
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            <span>Claimed {claimingAmount} USDC interest successfully!</span>
          </div>
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
      setClaimingAmount(null); // Clear after showing
    }
  }, [isSuccess, hash, claimingAmount]);

  const handleClaim = () => {
    setClaimingAmount(formattedClaimable);
    toast.loading("Claiming interest...");
    claimInterest();
  };

  const canClaim = isConnected && parseFloat(claimableAmount) > 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Claim Interest</h3>
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-custom-indigo">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Interest accrues real-time at 1% per day
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          {/* Claimable Amount - Left (50%) */}
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">Claimable Amount</div>
            <div className="bg-gray-50 border border-custom rounded-lg px-4 py-2 text-center">
              <span className="text-base font-bold text-gray-900">{formattedClaimable} USDC</span>
            </div>
          </div>

          {/* Interest Received - Right (50%) */}
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">Interest Received</div>
            <div className="bg-gray-50 border border-custom rounded-lg px-4 py-2 text-center">
              <span className="text-base font-bold text-gray-900">{formattedInterestReceived} USDC</span>
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
              : "Claim Interest"}
        </button>
      </div>
    </div>
  );
}
