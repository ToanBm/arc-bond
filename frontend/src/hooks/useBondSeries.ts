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

// Get all series info (maturityDate, totalDeposited, totalSupply, lastDistributionIndex, lastDistributionTime, emergencyMode)
export function useBondSeriesInfo() {
  const bondSeriesAddress = useBondSeriesAddress();
  return useReadContract({
    address: bondSeriesAddress,
    abi: ABIs.BondSeries,
    functionName: 'getSeriesInfo',
    query: {
      enabled: !!bondSeriesAddress,
      refetchInterval: 30000,
    },
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
      refetchInterval: 30000,
    },
  });
}

// Get total interest received amount for user
export function useInterestReceived(address?: `0x${string}`) {
  const bondSeriesAddress = useBondSeriesAddress();
  return useReadContract({
    address: bondSeriesAddress,
    abi: ABIs.BondSeries,
    functionName: 'interestReceived',
    args: address ? [address] : undefined,
    query: {
      enabled: !!bondSeriesAddress && !!address,
      refetchInterval: 30000,
    },
  });
}

// Get treasury status [balance, required, withdrawable]
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
      args: [parseUnits(usdcAmount, 6)],
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

// Claim interest
export function useClaimInterest() {
  const bondSeriesAddress = useBondSeriesAddress();
  const queryClient = useQueryClient();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const claimInterest = () => {
    if (!bondSeriesAddress) return;
    writeContract({
      address: bondSeriesAddress,
      abi: ABIs.BondSeries,
      functionName: 'claimInterest',
    });
  };

  return {
    claimInterest,
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

  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
      queryClient.invalidateQueries({ queryKey: ['readContracts'] });
    }
  }, [isSuccess, hash, queryClient]);

  const redeem = (bondAmount: string) => {
    if (!targetAddress) return;
    writeContract({
      address: targetAddress,
      abi: ABIs.BondSeries,
      functionName: 'redeem',
      args: [parseUnits(bondAmount, 6)],
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

// Distribute interest (Owner only)
export function useDistributeInterest() {
  const bondSeriesAddress = useBondSeriesAddress();
  const queryClient = useQueryClient();
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const distributeInterest = (amount: string) => {
    if (!bondSeriesAddress) return;
    writeContract({
      address: bondSeriesAddress,
      abi: ABIs.BondSeries,
      functionName: 'distributeInterest',
      args: [parseUnits(amount, 6)],
    });
  };

  return {
    distributeInterest,
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
