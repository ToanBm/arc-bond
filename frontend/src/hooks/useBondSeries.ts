import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { ABIs, getBondFactoryAddress, ARC_TESTNET_CHAIN_ID } from '@/abi/contracts';
import { parseUnits } from 'viem';
import { usePool } from '@/contexts/PoolContext';
import { useChainId } from 'wagmi';

// Helper to get BondSeries address from pool
function useBondSeriesAddress() {
  const { selectedPool } = usePool();
  return useMemo(() => selectedPool?.bondSeries || undefined, [selectedPool]);
}

/**
 * Read Hooks
 */

// Get all series info (maturityDate, totalDeposited, totalSupply, recordCount, cumulativeIndex, emergencyMode)
export function useBondSeriesInfo() {
  const bondSeriesAddress = useBondSeriesAddress();
  return useReadContract({
    address: bondSeriesAddress,
    abi: ABIs.BondSeries,
    functionName: 'getSeriesInfo',
    query: { 
      enabled: !!bondSeriesAddress,
      refetchInterval: 30000, // Refetch every 30s as backup
    },
  });
}

// Get next record time
export function useNextRecordTime() {
  const bondSeriesAddress = useBondSeriesAddress();
  return useReadContract({
    address: bondSeriesAddress,
    abi: ABIs.BondSeries,
    functionName: 'nextRecordTime',
    query: { enabled: !!bondSeriesAddress },
  });
}

// Get record count
export function useRecordCount() {
  const bondSeriesAddress = useBondSeriesAddress();
  return useReadContract({
    address: bondSeriesAddress,
    abi: ABIs.BondSeries,
    functionName: 'recordCount',
    query: { enabled: !!bondSeriesAddress },
  });
}

// Get last distributed record
export function useLastDistributedRecord() {
  const bondSeriesAddress = useBondSeriesAddress();
  return useReadContract({
    address: bondSeriesAddress,
    abi: ABIs.BondSeries,
    functionName: 'lastDistributedRecord',
    query: { enabled: !!bondSeriesAddress },
  });
}

// Get claimable amount for user
export function useClaimableAmount(address?: `0x${string}`) {
  const bondSeriesAddress = useBondSeriesAddress();
  return useReadContract({
    address: bondSeriesAddress,
    abi: ABIs.BondSeries,
    functionName: 'claimableAmount',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!bondSeriesAddress && !!address,
      refetchInterval: 30000, // Refetch every 30s as backup
    },
  });
}

// Get treasury status [balance, reserved, withdrawable]
export function useTreasuryStatus() {
  const bondSeriesAddress = useBondSeriesAddress();
  return useReadContract({
    address: bondSeriesAddress,
    abi: ABIs.BondSeries,
    functionName: 'getTreasuryStatus',
    query: { enabled: !!bondSeriesAddress },
  });
}

// Get paused status
export function useIsPaused() {
  const bondSeriesAddress = useBondSeriesAddress();
  return useReadContract({
    address: bondSeriesAddress,
    abi: ABIs.BondSeries,
    functionName: 'paused',
    query: { enabled: !!bondSeriesAddress },
  });
}

// Get emergency redeem enabled status
export function useEmergencyRedeemEnabled() {
  const bondSeriesAddress = useBondSeriesAddress();
  return useReadContract({
    address: bondSeriesAddress,
    abi: ABIs.BondSeries,
    functionName: 'emergencyRedeemEnabled',
    query: { enabled: !!bondSeriesAddress },
  });
}

// Check if address has DEFAULT_ADMIN_ROLE
// With Factory pattern, check role on Factory (admin role is on Factory, not BondSeries)
export function useIsAdmin(address?: `0x${string}`) {
  const chainId = useChainId();
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
  
  let factoryAddress: `0x${string}` | undefined;
  try {
    factoryAddress = getBondFactoryAddress(chainId || ARC_TESTNET_CHAIN_ID);
  } catch {
    factoryAddress = undefined;
  }
  
  return useReadContract({
    address: factoryAddress,
    abi: ABIs.BondFactory,
    functionName: 'hasRole',
    args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
    query: { enabled: !!factoryAddress && !!address },
  });
}

/**
 * Write Hooks
 */

// Deposit USDC to receive arcUSDC
export function useDeposit() {
  const bondSeriesAddress = useBondSeriesAddress();
  const queryClient = useQueryClient();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Invalidate queries immediately after successful deposit
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const deposit = (usdcAmount: string) => {
    if (!bondSeriesAddress) return;
    writeContract({
      address: bondSeriesAddress,
      abi: ABIs.BondSeries,
      functionName: 'deposit',
      args: [parseUnits(usdcAmount, 6)], // USDC 6 decimals
    });
  };

  return {
    deposit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// Claim coupon
export function useClaimCoupon() {
  const bondSeriesAddress = useBondSeriesAddress();
  const queryClient = useQueryClient();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Invalidate queries immediately after successful claim
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const claimCoupon = () => {
    if (!bondSeriesAddress) return;
    writeContract({
      address: bondSeriesAddress,
      abi: ABIs.BondSeries,
      functionName: 'claimCoupon',
    });
  };

  return {
    claimCoupon,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// Redeem arcUSDC for USDC at maturity
export function useRedeem(bondSeriesAddress?: `0x${string}`) {
  const defaultBondSeriesAddress = useBondSeriesAddress();
  const targetAddress = bondSeriesAddress || defaultBondSeriesAddress;
  const queryClient = useQueryClient();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Invalidate queries immediately after successful redeem
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
      queryClient.invalidateQueries({ queryKey: ['readContracts'] }); // Also invalidate useReadContracts
    }
  }, [isSuccess, hash, queryClient]);

  const redeem = (bondAmount: string) => {
    if (!targetAddress) return;
    writeContract({
      address: targetAddress,
      abi: ABIs.BondSeries,
      functionName: 'redeem',
      args: [parseUnits(bondAmount, 6)], // arcUSDC 6 decimals
    });
  };

  return {
    redeem,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Admin Write Hooks
 */

// Record snapshot (Keeper only)
export function useRecordSnapshot() {
  const bondSeriesAddress = useBondSeriesAddress();
  const queryClient = useQueryClient();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Invalidate queries immediately after successful snapshot
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const recordSnapshot = () => {
    if (!bondSeriesAddress) return;
    writeContract({
      address: bondSeriesAddress,
      abi: ABIs.BondSeries,
      functionName: 'recordSnapshot',
    });
  };

  return {
    recordSnapshot,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// Distribute coupon (Owner only)
export function useDistributeCoupon() {
  const bondSeriesAddress = useBondSeriesAddress();
  const queryClient = useQueryClient();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Invalidate queries immediately after successful distribution
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const distributeCoupon = (amount: string) => {
    if (!bondSeriesAddress) return;
    writeContract({
      address: bondSeriesAddress,
      abi: ABIs.BondSeries,
      functionName: 'distributeCoupon',
      args: [parseUnits(amount, 6)],
    });
  };

  return {
    distributeCoupon,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// Owner withdraw
export function useOwnerWithdraw() {
  const bondSeriesAddress = useBondSeriesAddress();
  const queryClient = useQueryClient();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Invalidate queries immediately after successful withdraw
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const ownerWithdraw = (amount: string) => {
    if (!bondSeriesAddress) return;
    writeContract({
      address: bondSeriesAddress,
      abi: ABIs.BondSeries,
      functionName: 'ownerWithdraw',
      args: [parseUnits(amount, 6)],
    });
  };

  return {
    ownerWithdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// Pause contract
export function usePause() {
  const bondSeriesAddress = useBondSeriesAddress();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const pause = () => {
    if (!bondSeriesAddress) return;
    writeContract({
      address: bondSeriesAddress,
      abi: ABIs.BondSeries,
      functionName: 'pause',
    });
  };

  return {
    pause,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// Unpause contract
export function useUnpause() {
  const bondSeriesAddress = useBondSeriesAddress();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const unpause = () => {
    if (!bondSeriesAddress) return;
    writeContract({
      address: bondSeriesAddress,
      abi: ABIs.BondSeries,
      functionName: 'unpause',
    });
  };

  return {
    unpause,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

