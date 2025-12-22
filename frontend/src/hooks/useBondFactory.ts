import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { ABIs, getBondFactoryAddress, ARC_TESTNET_CHAIN_ID } from '@/abi/contracts';
import { useAccount } from 'wagmi';
import { useChainId } from 'wagmi';

/**
 * Hook to create a new bond pool
 */
export function useCreatePool() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const chainId = useChainId();

  const createPool = (
    name: string,
    keeper: `0x${string}`,
    maturityMinutes: number
  ) => {
    const factoryAddress = getBondFactoryAddress(chainId || ARC_TESTNET_CHAIN_ID);
    
    writeContract({
      address: factoryAddress,
      abi: ABIs.BondFactory,
      functionName: 'createPool',
      args: [name, keeper, BigInt(maturityMinutes)],
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
  const chainId = useChainId();
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  const factoryAddress = getBondFactoryAddress(chainId || ARC_TESTNET_CHAIN_ID);

  // Get POOL_CREATOR_ROLE constant
  const { data: poolCreatorRole } = useReadContract({
    address: factoryAddress,
    abi: ABIs.BondFactory,
    functionName: 'POOL_CREATOR_ROLE',
  });

  // Check if user has role
  const { data: hasRole } = useReadContract({
    address: factoryAddress,
    abi: ABIs.BondFactory,
    functionName: 'hasRole',
    args: poolCreatorRole && targetAddress ? [poolCreatorRole, targetAddress] : undefined,
    query: { enabled: !!poolCreatorRole && !!targetAddress },
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
  const chainId = useChainId();
  const factoryAddress = getBondFactoryAddress(chainId || ARC_TESTNET_CHAIN_ID);

  return useReadContract({
    address: factoryAddress,
    abi: ABIs.BondFactory,
    functionName: 'poolCount',
  });
}

/**
 * Get all pools from Factory contract (real-time)
 */
export function useAllPools() {
  const chainId = useChainId();
  const factoryAddress = getBondFactoryAddress(chainId || ARC_TESTNET_CHAIN_ID);
  
  const result = useReadContract({
    address: factoryAddress,
    abi: ABIs.BondFactory,
    functionName: 'getAllPools',
    query: { 
      enabled: !!factoryAddress,
      refetchInterval: 10000, // Refetch every 10 seconds
      staleTime: 0, // Always consider data stale
    },
  });
  
  // Debug logs
  if (result.data) {
    console.log("[useAllPools] Factory address:", factoryAddress);
    console.log("[useAllPools] Pools count:", Array.isArray(result.data) ? result.data.length : "not array");
    console.log("[useAllPools] Pools data:", result.data);
  }
  
  return result;
}

/**
 * Get single pool by ID from Factory contract
 */
export function usePoolById(poolId: bigint | number | string | null) {
  const chainId = useChainId();
  const factoryAddress = getBondFactoryAddress(chainId || ARC_TESTNET_CHAIN_ID);
  const poolIdBigInt = poolId ? BigInt(poolId) : null;

  return useReadContract({
    address: factoryAddress,
    abi: ABIs.BondFactory,
    functionName: 'getPool',
    args: poolIdBigInt ? [poolIdBigInt] : undefined,
    query: { enabled: !!factoryAddress && !!poolIdBigInt },
  });
}

