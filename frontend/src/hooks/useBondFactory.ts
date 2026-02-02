import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { ABIs, getBondFactoryAddress, ARC_TESTNET_CHAIN_ID, BondFactoryAddresses } from '@/abi/contracts';
import { useAccount, useChainId } from 'wagmi';
import { ENVIO_GRAPHQL_ENDPOINT, ENVIO_QUERIES } from '@/config/envio';

/**
 * Helper to get a safe chain ID
 * If current chain is supported (has BondFactory), use it.
 * Otherwise, fallback to Arc Testnet.
 */
function useSafeChainId() {
  const chainId = useChainId();
  const isSupported = !!BondFactoryAddresses[chainId?.toString() as keyof typeof BondFactoryAddresses];
  return isSupported ? chainId : ARC_TESTNET_CHAIN_ID;
}

/**
 * Hook to create a new bond pool
 */
export function useCreatePool() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  // For write, we might want to prompt switch, but avoiding crash is priority.
  // If we default to Arc address, wallet will likely prompt network switch when writing.
  const safeChainId = useSafeChainId();

  const createPool = (
    name: string,
    keeper: `0x${string}`,
    maturityHours: number
  ) => {
    const factoryAddress = getBondFactoryAddress(safeChainId);

    writeContract({
      address: factoryAddress,
      abi: ABIs.BondFactory,
      functionName: 'createPool',
      args: [name, keeper, BigInt(maturityHours)],
      chainId: safeChainId, // Explicitly target the chain
    });
  };

  return {
    createPool,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isLoading: isPending || isConfirming,
    error,
  };
}

/**
 * Check if user has POOL_CREATOR_ROLE
 */
export function useIsPoolCreator(address?: `0x${string}`) {
  const safeChainId = useSafeChainId();
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  const factoryAddress = getBondFactoryAddress(safeChainId);

  // Get POOL_CREATOR_ROLE constant
  const { data: poolCreatorRole } = useReadContract({
    address: factoryAddress,
    abi: ABIs.BondFactory,
    functionName: 'POOL_CREATOR_ROLE',
    chainId: safeChainId,
  });

  // Check if user has role
  const { data: hasRole } = useReadContract({
    address: factoryAddress,
    abi: ABIs.BondFactory,
    functionName: 'hasRole',
    args: poolCreatorRole && targetAddress ? [poolCreatorRole, targetAddress] : undefined,
    query: { enabled: !!poolCreatorRole && !!targetAddress },
    chainId: safeChainId,
  });

  return {
    data: hasRole ?? false,
    isLoading: !poolCreatorRole || !targetAddress,
  };
}

/**
 * Get pool count
 */
export function usePoolCount() {
  const safeChainId = useSafeChainId();
  const factoryAddress = getBondFactoryAddress(safeChainId);

  return useReadContract({
    address: factoryAddress,
    abi: ABIs.BondFactory,
    functionName: 'poolCount',
    chainId: safeChainId,
  });
}

/**
 * Get all pools from Envio Indexer (fast and synced)
 */
export function useAllPools() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPools = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(ENVIO_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ENVIO_QUERIES.GET_POOLS
        })
      });

      const result = await response.json();
      const pools = result.data?.Pool || [];

      // Format to match the expected format in PoolContext
      const formattedPools = pools.map((p: any) => ({
        poolId: BigInt(p.poolId),
        bondToken: p.bondToken,
        bondSeries: p.bondSeries,
        maturityDate: BigInt(p.maturityDate),
        name: p.name,
        symbol: p.symbol,
        createdAt: BigInt(p.createdAt),
        isActive: true
      }));

      setData(formattedPools);
    } catch (error) {
      console.error("Failed to fetch Envio pools:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
    const interval = setInterval(fetchPools, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, isLoading, refetch: fetchPools };
}

/**
 * Get single pool by ID from Factory contract
 */
export function usePoolById(poolId: bigint | number | string | null) {
  const safeChainId = useSafeChainId();
  const factoryAddress = getBondFactoryAddress(safeChainId);
  const poolIdBigInt = poolId ? BigInt(poolId) : null;

  return useReadContract({
    address: factoryAddress,
    abi: ABIs.BondFactory,
    functionName: 'getPool',
    args: poolIdBigInt ? [poolIdBigInt] : undefined,
    query: { enabled: !!factoryAddress && !!poolIdBigInt },
    chainId: safeChainId,
  });
}

