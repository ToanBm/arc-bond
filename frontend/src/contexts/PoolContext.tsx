"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from "react";
import { useChainId } from "wagmi";
import { getPool, getAllPoolIds, type PoolInfo } from "@/abi/PoolsAddresses";
import { ARC_TESTNET_CHAIN_ID } from "@/abi/contracts";
import { useAllPools } from "@/hooks/useBondFactory";

type PoolContextType = {
  selectedPoolId: string | null;
  selectedPool: PoolInfo | null;
  setSelectedPoolId: (poolId: string | null) => void;
  poolIds: string[];
  refetchPools: () => void;
};

const PoolContext = createContext<PoolContextType | undefined>(undefined);

// Convert contract PoolInfo to frontend PoolInfo format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertContractPoolToPoolInfo(contractPool: any, poolId: string): PoolInfo {
  return {
    poolId: poolId,
    name: contractPool.name || "",
    symbol: contractPool.symbol || "",
    bondToken: contractPool.bondToken as `0x${string}`,
    bondSeries: contractPool.bondSeries as `0x${string}`,
    maturityDate: contractPool.maturityDate?.toString() || "0",
    createdAt: contractPool.createdAt?.toString() || "0",
    isActive: contractPool.isActive ?? true,
  };
}

export function PoolProvider({ children }: { children: ReactNode }) {
  const chainId = useChainId();
  // Initialize from localStorage if available
  const [selectedPoolId, setSelectedPoolIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("selectedPoolId");
    }
    return null;
  });

  // Query pools from contract (real-time)
  const { data: contractPools, refetch: refetchPools } = useAllPools();

  // Convert contract pools to PoolInfo format
  const contractPoolsMap = useMemo(() => {
    const map: Record<string, PoolInfo> = {};
    if (contractPools && Array.isArray(contractPools)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contractPools.forEach((pool: any, index: number) => {
        const poolId = pool.poolId?.toString() || (index + 1).toString();
        map[poolId] = convertContractPoolToPoolInfo(pool, poolId);
      });
    }
    return map;
  }, [contractPools]);

  // Fallback: Get pools from file (if contract query fails)
  const filePoolIds: string[] = useMemo(() => {
    try {
      return chainId === ARC_TESTNET_CHAIN_ID ? getAllPoolIds(chainId) : [];
    } catch {
      return [];
    }
  }, [chainId]);

  // Combine pool IDs: factory pools first (newest first)
  const poolIds = useMemo(() => {
    const ids: string[] = [];

    // Add contract pools first (real-time, sorted by poolId descending - newest first)
    const contractPoolIds = Object.keys(contractPoolsMap).sort((a, b) => {
      const aNum = parseInt(a) || 0;
      const bNum = parseInt(b) || 0;
      return bNum - aNum; // Descending: newest first
    });
    ids.push(...contractPoolIds);

    // Add file pools that aren't already in contract pools
    filePoolIds.forEach(id => {
      if (!ids.includes(id)) {
        ids.push(id);
      }
    });

    return ids;
  }, [contractPoolsMap, filePoolIds]);

  // Get default pool (newest factory pool first)
  const defaultPool: PoolInfo | null = useMemo(() => {
    if (chainId !== ARC_TESTNET_CHAIN_ID) return null;

    // Try contract pools first
    const contractPoolIds = Object.keys(contractPoolsMap).sort((a, b) => {
      const aNum = parseInt(a) || 0;
      const bNum = parseInt(b) || 0;
      return bNum - aNum;
    });

    if (contractPoolIds.length > 0) {
      return contractPoolsMap[contractPoolIds[0]] || null;
    }

    // Fallback to file pools
    if (filePoolIds.length > 0) {
      return getPool(chainId, filePoolIds[0]) || null;
    }

    return null;
  }, [chainId, contractPoolsMap, filePoolIds]);

  // Auto-refetch pools
  useEffect(() => {
    const interval = setInterval(() => {
      refetchPools();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchPools]);

  // Initialize or Update selected pool to always be the newest one
  useEffect(() => {
    if (chainId === ARC_TESTNET_CHAIN_ID && poolIds.length > 0) {
      const newestPoolId = poolIds[0];

      // If no pool selected OR current selected is NOT the newest one -> Switch to newest
      if (selectedPoolId !== newestPoolId) {
        setSelectedPoolIdState(newestPoolId);
        localStorage.setItem("selectedPoolId", newestPoolId);
      }
    } else if (chainId !== ARC_TESTNET_CHAIN_ID) {
      setSelectedPoolIdState(null);
      localStorage.removeItem("selectedPoolId");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, poolIds.join(",")]);

  const setSelectedPoolId = (poolId: string | null) => {
    setSelectedPoolIdState(poolId);
    if (poolId) {
      localStorage.setItem("selectedPoolId", poolId);
    } else {
      localStorage.removeItem("selectedPoolId");
    }
  };

  // Get selected pool info
  const selectedPool = useMemo(() => {
    if (!selectedPoolId || chainId !== ARC_TESTNET_CHAIN_ID) {
      return defaultPool;
    }

    if (contractPoolsMap[selectedPoolId]) {
      return contractPoolsMap[selectedPoolId];
    }

    const filePool = getPool(chainId, selectedPoolId);
    if (filePool) {
      return filePool;
    }

    return defaultPool;
  }, [selectedPoolId, chainId, contractPoolsMap, defaultPool]);

  return (
    <PoolContext.Provider value={{
      selectedPoolId: selectedPoolId || poolIds[0] || null,
      selectedPool,
      setSelectedPoolId,
      poolIds,
      refetchPools
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
