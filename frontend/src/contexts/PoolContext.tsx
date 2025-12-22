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
  const [selectedPoolId, setSelectedPoolIdState] = useState<string | null>(null);
  
  // Query pools from contract (real-time)
  const { data: contractPools, refetch: refetchPools } = useAllPools();
  
  // Convert contract pools to PoolInfo format
  const contractPoolsMap = useMemo(() => {
    if (!contractPools || !Array.isArray(contractPools)) {
      console.log("[PoolContext] No contract pools or not array:", contractPools);
      return {};
    }
    const map: Record<string, PoolInfo> = {};
    console.log("[PoolContext] Raw contractPools:", contractPools);
    contractPools.forEach((pool: any, index: number) => {
      const poolId = pool.poolId?.toString() || (index + 1).toString();
      map[poolId] = convertContractPoolToPoolInfo(pool, poolId);
      console.log(`[PoolContext] Pool ${poolId}:`, {
        name: pool.name || map[poolId].name,
        bondSeries: map[poolId].bondSeries,
        bondToken: map[poolId].bondToken,
        maturityDate: map[poolId].maturityDate,
      });
    });
    console.log("[PoolContext] contractPoolsMap:", Object.keys(map));
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
    
    console.log("[PoolContext] Final poolIds:", ids);
    return ids;
  }, [contractPoolsMap, filePoolIds]);
  
  // Get default pool (newest factory pool first)
  const defaultPool: PoolInfo | null = useMemo(() => {
    if (chainId !== ARC_TESTNET_CHAIN_ID) return null;
    
    // Try contract pools first (newest first)
    const contractPoolIds = Object.keys(contractPoolsMap).sort((a, b) => {
      const aNum = parseInt(a) || 0;
      const bNum = parseInt(b) || 0;
      return bNum - aNum; // Descending: newest first
    });
    if (contractPoolIds.length > 0) {
      const newestPool = contractPoolsMap[contractPoolIds[0]];
      console.log("[PoolContext] Default pool (newest):", contractPoolIds[0], newestPool);
      return newestPool || null;
    }
    
    // Fallback to file pools
    if (filePoolIds.length > 0) {
      return getPool(chainId, filePoolIds[0]) || null;
    }
    
    return null;
  }, [chainId, contractPoolsMap, filePoolIds]);
  
  // Expose refetch function for manual refresh (e.g., after creating new pool)
  useEffect(() => {
    // Auto-refetch pools every 30 seconds to catch new pools
    const interval = setInterval(() => {
      refetchPools();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchPools]);
  
  // Initialize selected pool when chain or pools change
  useEffect(() => {
    if (chainId === ARC_TESTNET_CHAIN_ID && poolIds.length > 0) {
      // Always use newest pool (first in list, which is sorted by poolId descending)
      const newestPoolId = poolIds[0];
      console.log("[PoolContext] Setting selected pool to newest:", newestPoolId, "from poolIds:", poolIds);
      setSelectedPoolIdState(newestPoolId);
      localStorage.setItem("selectedPoolId", newestPoolId);
    } else {
      // Reset if chain changed or no pools
      setSelectedPoolIdState(null);
      localStorage.removeItem("selectedPoolId");
    }
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
      console.log("[PoolContext] No selectedPoolId or wrong chain, using defaultPool:", defaultPool);
      return defaultPool;
    }
    
    // Try contract pools first (real-time)
    if (contractPoolsMap[selectedPoolId]) {
      const pool = contractPoolsMap[selectedPoolId];
      console.log(`[PoolContext] Using contract pool ${selectedPoolId}:`, {
        name: pool.name,
        bondSeries: pool.bondSeries,
        bondToken: pool.bondToken,
      });
      return pool;
    }
    
    // Fallback to file pools
    const filePool = getPool(chainId, selectedPoolId);
    if (filePool) {
      console.log(`[PoolContext] Using file pool ${selectedPoolId}:`, {
        name: filePool.name,
        bondSeries: filePool.bondSeries,
      });
      return filePool;
    }
    
    console.log(`[PoolContext] Pool ${selectedPoolId} not found, using defaultPool:`, defaultPool);
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

