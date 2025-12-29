"use client";

import { useState, useEffect } from "react";
import { useDistributeInterest } from "@/hooks/useBondSeries";
import { useApproveUSDC } from "@/hooks/useUSDC";
import { useAdminData } from "@/hooks";
import toast from "react-hot-toast";

export default function DistributeCard() {
  const [amount, setAmount] = useState("");

  const { approve, isPending: isApproving, isSuccess: approveSuccess } = useApproveUSDC();
  const { distributeInterest, isPending: isDistributing, isSuccess: distributeSuccess, hash } = useDistributeInterest();

  const { currentIndex, lastDistributionTime } = useAdminData();
  const now = Math.floor(Date.now() / 1000);
  const timeSinceLastDistribution = (lastDistributionTime > 0 && lastDistributionTime <= now)
    ? (now - lastDistributionTime)
    : 0;

  // Auto distribute after approve
  useEffect(() => {
    if (approveSuccess && amount) {
      distributeInterest(amount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveSuccess]);

  // Show success toast
  useEffect(() => {
    if (distributeSuccess && hash) {
      toast.success(
        <div className="flex flex-col gap-1">
          <div>✅ Distributed {amount} USDC successfully!</div>
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
      setAmount(""); // Reset amount after success
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distributeSuccess, hash]);

  const handleDistribute = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    toast.loading("Approving USDC for distribution...");
    approve(amount);
  };

  const isLoading = isApproving || isDistributing;

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Distribute Interest</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 border border-custom rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-1">Current Index</div>
            <div className="text-lg font-bold text-gray-900">
              {currentIndex}
            </div>
          </div>
          <div className="bg-gray-50 border border-custom rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-1">Time Since Last Distribution</div>
            <div className="text-lg font-bold text-gray-900">
              {timeSinceLastDistribution > 0
                ? `${Math.floor(timeSinceLastDistribution / 86400)}d ${Math.floor((timeSinceLastDistribution % 86400) / 3600)}h`
                : "N/A"}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-2 block">Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 border border-custom rounded-lg focus:outline-none font-bold"
            disabled={isLoading}
            step="0.000001"
            min="0"
          />
          <div className="text-xs text-gray-500 mt-1">
            Enter the amount of USDC to deposit for interest payments
          </div>
        </div>

        <button
          onClick={handleDistribute}
          disabled={!amount || parseFloat(amount) <= 0 || isLoading}
          className="w-full btn-primary font-medium py-2 px-4 disabled:opacity-50"
        >
          {isLoading ? (isApproving ? "Approving..." : "Distributing...") : "Distribute Interest"}
        </button>
      </div>
    </div>
  );
}
