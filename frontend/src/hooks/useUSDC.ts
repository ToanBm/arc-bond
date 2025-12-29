import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { ABIs, getContractAddresses } from '@/abi/contracts';
import { parseUnits } from 'viem';
import { usePool } from '@/contexts/PoolContext';

const { usdc: USDC_ADDRESS } = getContractAddresses();

// Helper to get BondSeries address from pool for allowance
function useBondSeriesAddressForAllowance() {
  const { selectedPool } = usePool();
  return useMemo(() => selectedPool?.bondSeries || undefined, [selectedPool]);
}

/**
 * Read Hooks for USDC
 */

// Get user USDC balance
export function useUSDCBalance(address?: `0x${string}`) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: ABIs.USDC,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 30000, // Refetch every 30s as backup
    },
  });
}

// Get allowance (how much a spender can spend)
export function useUSDCAllowance(ownerAddress?: `0x${string}`, spenderAddress?: `0x${string}`) {
  const bondSeriesAddressFromContext = useBondSeriesAddressForAllowance();
  const spender = spenderAddress || bondSeriesAddressFromContext;

  return useReadContract({
    address: USDC_ADDRESS,
    abi: ABIs.USDC,
    functionName: 'allowance',
    args: ownerAddress && spender ? [ownerAddress, spender] : undefined,
    query: {
      enabled: !!ownerAddress && !!spender,
      refetchInterval: 30000, // Refetch every 30s as backup
    },
  });
}

// Get USDC decimals
export function useUSDCDecimals() {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: ABIs.USDC,
    functionName: 'decimals',
  });
}

// Get USDC symbol
export function useUSDCSymbol() {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: ABIs.USDC,
    functionName: 'symbol',
  });
}

/**
 * Write Hooks for USDC
 */

// Approve BondSeries to spend USDC
export function useApproveUSDC() {
  const bondSeriesAddress = useBondSeriesAddressForAllowance();
  const queryClient = useQueryClient();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Invalidate queries immediately after successful approve
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const approve = (amount: string) => {
    if (!bondSeriesAddress) return;
    writeContract({
      address: USDC_ADDRESS,
      abi: ABIs.USDC,
      functionName: 'approve',
      args: [bondSeriesAddress, parseUnits(amount, 6)],
    });
  };

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// Approve unlimited (max uint256)
export function useApproveUSDCMax() {
  const bondSeriesAddress = useBondSeriesAddressForAllowance();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approveMax = () => {
    if (!bondSeriesAddress) return;
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    writeContract({
      address: USDC_ADDRESS,
      abi: ABIs.USDC,
      functionName: 'approve',
      args: [bondSeriesAddress, MAX_UINT256],
    });
  };

  return {
    approveMax,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// Approve USDC for any spender (for Market contract)
export function useApproveUSDCForMarket() {
  const queryClient = useQueryClient();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const approve = (spender: `0x${string}`, amount: bigint) => {
    writeContract({
      address: USDC_ADDRESS,
      abi: ABIs.USDC,
      functionName: 'approve',
      args: [spender, amount],
    });
  };

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
