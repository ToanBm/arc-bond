"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { usePortfolioData } from "@/hooks";
import { useDeposit } from "@/hooks/useBondSeries";
import { useApproveUSDC } from "@/hooks/useUSDC";
import toast from "react-hot-toast";

export default function DepositCard() {
  const [amount, setAmount] = useState("");
  const { usdcBalance, hasAllowance, allowance, isConnected } = usePortfolioData();

  const { approve, isPending: isApproving, isSuccess: approveSuccess } = useApproveUSDC();
  const { deposit, isPending: isDepositing, isSuccess: depositSuccess, hash } = useDeposit();

  // Auto deposit after approve success
  useEffect(() => {
    if (approveSuccess && amount) {
      deposit(amount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveSuccess]);

  // Show success toast
  useEffect(() => {
    if (depositSuccess && hash) {
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            <span>Deposited {amount} USDC successfully!</span>
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
      setAmount("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositSuccess, hash]);

  const handleDeposit = () => {
    if (!amount || parseFloat(amount) <= 0) return;

    const amountNum = parseFloat(amount);
    const allowanceNum = parseFloat(allowance);

    // Check if need approval
    if (!hasAllowance || allowanceNum < amountNum) {
      toast.loading("Approving USDC...");
      approve(amount);
    } else {
      toast.loading("Depositing...");
      deposit(amount);
    }
  };

  const isLoading = isApproving || isDepositing;
  const canDeposit = isConnected && amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(usdcBalance);

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center justify-between">
        <span>Deposit</span>
        <Image src="/usdc.svg" alt="USDC" width={24} height={24} />
      </h3>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 mb-2 block">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={!isConnected || isLoading}
              className="w-full px-4 py-2 border border-custom rounded-lg focus:outline-none font-bold disabled:opacity-50 disabled:bg-gray-50"
            />
            <div className="absolute right-3 top-2.5 text-gray-500">USDC</div>
          </div>
          <div className="text-sm text-gray-600 mt-1 flex items-center justify-between">
            <span>Balance: {usdcBalance}</span>
            <button
              type="button"
              onClick={() => setAmount(usdcBalance)}
              disabled={!isConnected || isLoading}
              className="text-gray-600 font-bold disabled:opacity-50"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border border-custom rounded-lg p-3">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-600">You will receive:</span>
            <span className="text-base font-bold text-gray-900">
              {amount ? (parseFloat(amount) * 10).toFixed(1) : "0.0"} <span className="text-sm text-gray-500">arcUSDC</span>
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Rate: 1 USDC = 10 arcUSDC
          </div>
        </div>

        <button
          onClick={handleDeposit}
          disabled={!canDeposit || isLoading}
          className="w-full btn-primary font-medium py-2 px-4 disabled:opacity-50"
        >
          {!isConnected
            ? "Connect wallet to deposit"
            : isLoading
              ? (isApproving ? "Approving..." : "Depositing...")
              : "Deposit"}
        </button>
      </div>
    </div>
  );
}

