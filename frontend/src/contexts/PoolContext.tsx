"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useChainId } from "wagmi";
import { getPool, getAllPoolIds, type PoolInfo } from "@/abi/PoolsAddresses";
import { ARC_TESTNET_CHAIN_ID } from "@/abi/contracts";

type PoolContextType = {
  selectedPoolId: string | null;
  selectedPool: PoolInfo | null;
  setSelectedPoolId: (poolId: string | null) => void;
  poolIds: string[];
};

const PoolContext = createContext<PoolContextType | undefined>(undefined);

export function PoolProvider({ children }: { children: ReactNode }) {
  const chainId = useChainId();
  const [selectedPoolId, setSelectedPoolIdState] = useState<string | null>(null);
  
  // Get available pool IDs based on current chain
  const poolIds: string[] = chainId === ARC_TESTNET_CHAIN_ID ? getAllPoolIds(chainId) : [];
  
  // Get default pool (first pool if available)
  const defaultPool: PoolInfo | null = poolIds.length > 0 && chainId === ARC_TESTNET_CHAIN_ID
    ? (getPool(chainId, poolIds[0]) || null)
    : null;
  
  // Initialize selected pool when chain or pools change
  useEffect(() => {
    if (chainId === ARC_TESTNET_CHAIN_ID && poolIds.length > 0) {
      // Load from localStorage or use first pool
      const savedPoolId = localStorage.getItem("selectedPoolId");
      if (savedPoolId && poolIds.includes(savedPoolId)) {
        setSelectedPoolIdState(savedPoolId);
      } else if (!selectedPoolId) {
        setSelectedPoolIdState(poolIds[0]);
      }
    } else {
      // Reset if chain changed or no pools
      setSelectedPoolIdState(null);
    }
  }, [chainId, poolIds.join(","), selectedPoolId]);

  const setSelectedPoolId = (poolId: string | null) => {
    setSelectedPoolIdState(poolId);
    if (poolId) {
      localStorage.setItem("selectedPoolId", poolId);
    } else {
      localStorage.removeItem("selectedPoolId");
    }
  };

  // Get selected pool info
  const selectedPool = selectedPoolId && chainId === ARC_TESTNET_CHAIN_ID
    ? (getPool(chainId, selectedPoolId) || null)
    : defaultPool;

  return (
    <PoolContext.Provider value={{ 
      selectedPoolId: selectedPoolId || poolIds[0] || null, 
      selectedPool, 
      setSelectedPoolId, 
      poolIds 
    }}>
      {children}
    </PoolContext.Provider>
  );
}

export function usePool() {
  const context = useContext(PoolContext);
  if (context === undefined) {
    throw new Error("usePool must be used within a PoolProvider");
  }
  return context;
}

