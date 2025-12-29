"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { useCreatePool, useIsPoolCreator, usePoolCount } from "@/hooks/useBondFactory";
import { getBondFactoryAddress, ARC_TESTNET_CHAIN_ID } from "@/abi/contracts";
import { usePool } from "@/contexts/PoolContext";
import toast from "react-hot-toast";

export default function CreatePoolCard() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: isPoolCreator, isLoading: checkingRole } = useIsPoolCreator(address);
  const { data: poolCount } = usePoolCount();
  const { createPool, hash, isLoading, isSuccess } = useCreatePool();
  const { refetchPools } = usePool();

  // Form state
  const [poolName, setPoolName] = useState("");
  const [maturityHours, setMaturityHours] = useState("168"); // 168 hours (1 week) default

  // Check if factory exists
  const hasFactory = (() => {
    try {
      getBondFactoryAddress(chainId || ARC_TESTNET_CHAIN_ID);
      return true;
    } catch {
      return false;
    }
  })();

  // Show success toast and refresh pools
  useEffect(() => {
    if (isSuccess && hash) {
      // Refresh pools from contract (real-time)
      // Try multiple times to ensure it's indexed
      const refreshInterval = setInterval(() => {
        refetchPools();
      }, 2000);

      // Stop after 10 seconds (5 attempts)
      setTimeout(() => {
        clearInterval(refreshInterval);
      }, 10000);

      toast.success(
        <div className="flex flex-col gap-1">
          <div>✅ Pool created successfully!</div>
          <a
            href={`https://testnet.arcscan.app/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-base font-medium text-blue-600 hover:underline"
          >
            View on Explorer!
          </a>
          <div className="text-sm text-gray-500 mt-1">
            Pool list will update automatically...
          </div>
        </div>,
        { duration: 8000 }
      );
      // Reset form
      setPoolName("");
      setMaturityHours("168");
    }
  }, [isSuccess, hash, refetchPools]);

  const handleCreatePool = () => {
    if (!poolName.trim() || !maturityHours) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    const hours = parseInt(maturityHours);
    if (isNaN(hours) || hours <= 0) {
      toast.error("Maturity hours must be a positive number");
      return;
    }

    toast.loading("Creating new pool...");
    createPool(
      poolName.trim(),
      address,
      hours
    );
  };

  if (!hasFactory) {
    return (
      <div className="card">
        <h3 className="text-lg font-bold mb-4 text-gray-900">Create New Pool</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-gray-700">
          ⚠️ BondFactory not deployed. Please deploy factory first using:
          <code className="block mt-2 p-2 bg-gray-100 rounded">
            npx hardhat run scripts/deployFactory.ts --network arc
          </code>
        </div>
      </div>
    );
  }

  if (checkingRole) {
    return (
      <div className="card">
        <h3 className="text-lg font-bold mb-4 text-gray-900">Create New Pool</h3>
        <div className="text-gray-500">Checking permissions...</div>
      </div>
    );
  }

  if (!isPoolCreator) {
    return (
      <div className="card">
        <h3 className="text-lg font-bold mb-4 text-gray-900">Create New Pool</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-gray-700">
          ❌ You don&apos;t have POOL_CREATOR_ROLE. Contact admin to grant permission.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Create New Pool</h3>
        {poolCount !== undefined && (
          <div className="text-sm text-gray-600">
            Current Pools: {poolCount?.toString() || "0"}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pool Name
          </label>
          <input
            type="text"
            value={poolName}
            onChange={(e) => setPoolName(e.target.value)}
            placeholder="ArcBond USDC Series 2"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maturity Hours
          </label>
          <input
            type="number"
            value={maturityHours}
            onChange={(e) => setMaturityHours(e.target.value)}
            placeholder="168"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            {maturityHours && !isNaN(parseInt(maturityHours))
              ? `${parseInt(maturityHours)} hours`
              : "Enter hours (e.g., 168 = 1 week)"}
          </div>
        </div>


        <button
          onClick={handleCreatePool}
          disabled={isLoading || !poolName.trim() || !maturityHours.trim() || !address}
          className="w-full btn-primary font-medium py-2 px-4 disabled:opacity-50"
        >
          {isLoading ? "Creating Pool..." : "Create Pool"}
        </button>
      </div>
    </div>
  );
}

