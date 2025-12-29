"use client";

import { useEffect } from "react";
import { useAdminData } from "@/hooks";
import { useDistributeCoupon } from "@/hooks/useBondSeries";
import { useApproveUSDC } from "@/hooks/useUSDC";
import toast from "react-hot-toast";

export default function SnapshotCard() {
  const {
    latestSnapshot,
    lastDistributed,
    pendingDistributions,
    couponDue
  } = useAdminData();

  const { approve, isPending: isApproving, isSuccess: approveSuccess } = useApproveUSDC();
  const { distributeCoupon, isPending: isDistributing, isSuccess: distributeSuccess, hash } = useDistributeCoupon();

  // Auto distribute after approve
  useEffect(() => {
    if (approveSuccess && couponDue) {
      distributeCoupon(couponDue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveSuccess]);

  // Show success toast
  useEffect(() => {
    if (distributeSuccess && hash) {
      toast.success(
        <div className="flex flex-col gap-1">
          <div>✅ Distributed {couponDue} USDC successfully!</div>
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
  }, [distributeSuccess, hash]);

  const handleDistribute = () => {
    if (pendingDistributions === 0) return;
    toast.loading("Approving USDC for distribution...");
    approve(couponDue);
  };

  const isLoading = isApproving || isDistributing;

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Snapshot Management</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 border border-custom rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-1">Latest Snapshot</div>
            <div className="text-lg font-bold text-gray-900">#{latestSnapshot}</div>
          </div>
          <div className="bg-gray-50 border border-custom rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-1">Last Distributed</div>
            <div className="text-lg font-bold text-gray-900">#{lastDistributed}</div>
          </div>
        </div>

        {pendingDistributions > 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="font-semibold text-gray-900 mb-1">
              ⚠️ Pending Distribution
            </div>
            <div className="text-sm text-gray-600">
              {pendingDistributions} snapshot(s) awaiting distribution
            </div>
            <div className="text-sm text-gray-900 font-semibold mt-2">
              Coupon Due: {couponDue} USDC
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-gray-700">
            ✅ All snapshots distributed
          </div>
        )}

        <button
          onClick={handleDistribute}
          disabled={pendingDistributions === 0 || isLoading}
          className="w-full btn-primary font-medium py-2 px-4 disabled:opacity-50"
        >
          {isLoading ? (isApproving ? "Approving..." : "Distributing...") : "Distribute Coupon"}
        </button>
      </div>
    </div>
  );
}

