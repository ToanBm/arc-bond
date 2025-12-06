import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ABIs, getContractAddresses } from '@/abi/contracts';
import { parseUnits } from 'viem';
import { usePool } from '@/contexts/PoolContext';
import { useMemo } from 'react';

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
  });
}

// Get allowance (how much BondSeries can spend)
export function useUSDCAllowance(ownerAddress?: `0x${string}`) {
  const bondSeriesAddress = useBondSeriesAddressForAllowance();
  return useReadContract({
    address: USDC_ADDRESS,
    abi: ABIs.USDC,
    functionName: 'allowance',
    args: ownerAddress && bondSeriesAddress ? [ownerAddress, bondSeriesAddress] : undefined,
    query: { enabled: !!ownerAddress && !!bondSeriesAddress },
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
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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

