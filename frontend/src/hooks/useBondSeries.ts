import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ABIs } from '@/abi/contracts';
import { parseUnits } from 'viem';
import { usePool } from '@/contexts/PoolContext';
import { useMemo } from 'react';

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
    query: { enabled: !!bondSeriesAddress },
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
    query: { enabled: !!bondSeriesAddress && !!address },
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
export function useIsAdmin(address?: `0x${string}`) {
  const bondSeriesAddress = useBondSeriesAddress();
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
  
  return useReadContract({
    address: bondSeriesAddress,
    abi: ABIs.BondSeries,
    functionName: 'hasRole',
    args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
    query: { enabled: !!bondSeriesAddress && !!address },
  });
}

/**
 * Write Hooks
 */

// Deposit USDC to receive arcUSDC
export function useDeposit() {
  const bondSeriesAddress = useBondSeriesAddress();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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
export function useRedeem() {
  const bondSeriesAddress = useBondSeriesAddress();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const redeem = (bondAmount: string) => {
    if (!bondSeriesAddress) return;
    writeContract({
      address: bondSeriesAddress,
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
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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

