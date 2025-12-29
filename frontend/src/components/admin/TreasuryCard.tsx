"use client";

import { useState, useEffect } from "react";
import { useAdminData } from "@/hooks";
import { useOwnerWithdraw } from "@/hooks/useBondSeries";
import toast from "react-hot-toast";

export default function TreasuryCard() {
  const [amount, setAmount] = useState("");
  const { treasuryBalance, reserved, withdrawable } = useAdminData();
  const { ownerWithdraw, isPending, isSuccess, hash } = useOwnerWithdraw();

  // Show success toast
  useEffect(() => {
    if (isSuccess && hash) {
      toast.success(
        <div className="flex flex-col gap-1">
          <div>✅ Withdrew {amount} USDC successfully!</div>
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
      setAmount("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, hash]);

  const handleWithdraw = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    toast.loading("Withdrawing...");
    ownerWithdraw(amount);
  };

  const canWithdraw = amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(withdrawable);

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Treasury Management</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-custom rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-1">Total Balance (USDC)</div>
            <div className="text-lg font-bold text-gray-900">{treasuryBalance}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-1">Withdrawable (USDC)</div>
            <div className="text-lg font-bold text-green-700">{withdrawable}</div>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-2 block">Withdraw Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={isPending}
              className="w-full px-4 py-2 border border-custom rounded-lg focus:outline-none focus:border-gray-400 font-bold disabled:opacity-50"
            />
            <div className="absolute right-3 top-2.5 text-gray-500">USDC</div>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Max: {withdrawable} USDC
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={!canWithdraw || isPending}
          className="w-full btn-primary font-medium py-2 px-4 disabled:opacity-50"
        >
          {isPending ? "Withdrawing..." : "Withdraw"}
        </button>
      </div>
    </div>
  );
}

