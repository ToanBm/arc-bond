"use client";

import { useEffect } from "react";
import { useAdminData } from "@/hooks";
import { usePause, useUnpause } from "@/hooks/useBondSeries";
import toast from "react-hot-toast";

export default function EmergencyCard() {
  const { isPaused } = useAdminData();
  const { pause, isPending: isPausing, isSuccess: pauseSuccess, hash: pauseHash } = usePause();
  const { unpause, isPending: isUnpausing, isSuccess: unpauseSuccess, hash: unpauseHash } = useUnpause();

  // Show success toasts
  useEffect(() => {
    if (pauseSuccess && pauseHash) {
      toast.success(
        <div className="flex flex-col gap-1">
          <div>✅ Contract paused successfully!</div>
          <a
            href={`https://testnet.arcscan.app/tx/${pauseHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-base font-medium text-blue-600 hover:underline"
          >
            View on Explorer!
          </a>
        </div>
      );
    }
  }, [pauseSuccess, pauseHash]);

  useEffect(() => {
    if (unpauseSuccess && unpauseHash) {
      toast.success(
        <div className="flex flex-col gap-1">
          <div>✅ Contract unpaused successfully!</div>
          <a
            href={`https://testnet.arcscan.app/tx/${unpauseHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-base font-medium text-blue-600 hover:underline"
          >
            View on Explorer!
          </a>
        </div>
      );
    }
  }, [unpauseSuccess, unpauseHash]);

  const handlePause = () => {
    toast.loading("Pausing contract...");
    pause();
  };

  const handleUnpause = () => {
    toast.loading("Unpausing contract...");
    unpause();
  };

  const isLoading = isPausing || isUnpausing;

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Emergency Controls</h3>

      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${isPaused
          ? "bg-red-50 border-red-200"
          : "bg-green-50 border-green-200"
          }`}>
          <div className="font-semibold text-gray-900 mb-1">
            {isPaused ? "Contract PAUSED" : "✅ Contract Active"}
          </div>
          <div className="text-sm text-gray-600">
            {isPaused
              ? "New deposits are disabled. Users can still claim and redeem."
              : "All operations are functioning normally."
            }
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-700">
          ⚠️ <strong>Warning:</strong> Pausing will disable new deposits but allow users to claim and redeem.
        </div>

        {isPaused ? (
          <button
            onClick={handleUnpause}
            disabled={isLoading}
            className="w-full btn-primary font-medium py-2 px-4 disabled:opacity-50"
          >
            {isUnpausing ? "Unpausing..." : "Unpause Contract"}
          </button>
        ) : (
          <button
            onClick={handlePause}
            disabled={isLoading}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {isPausing ? "Pausing..." : "Pause Contract"}
          </button>
        )}
      </div>
    </div>
  );
}

