import { useReadContract } from 'wagmi';
import { ABIs } from '@/abi/contracts';
import { usePool } from '@/contexts/PoolContext';
import { useMemo } from 'react';

// Helper to get BondToken address from pool
function useBondTokenAddress() {
  const { selectedPool } = usePool();
  return useMemo(() => selectedPool?.bondToken || undefined, [selectedPool]);
}

/**
 * Read Hooks for BondToken (arcUSDC)
 */

// Get user arcUSDC balance
export function useBondTokenBalance(address?: `0x${string}`) {
  const bondTokenAddress = useBondTokenAddress();
  return useReadContract({
    address: bondTokenAddress,
    abi: ABIs.BondToken,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!bondTokenAddress && !!address,
      refetchInterval: 30000, // Refetch every 30s as backup
    },
  });
}

// Get total supply
export function useBondTokenTotalSupply() {
  const bondTokenAddress = useBondTokenAddress();
  return useReadContract({
    address: bondTokenAddress,
    abi: ABIs.BondToken,
    functionName: 'totalSupply',
    query: { enabled: !!bondTokenAddress },
  });
}

// Get decimals
export function useBondTokenDecimals() {
  const bondTokenAddress = useBondTokenAddress();
  return useReadContract({
    address: bondTokenAddress,
    abi: ABIs.BondToken,
    functionName: 'decimals',
    query: { enabled: !!bondTokenAddress },
  });
}

// Get symbol
export function useBondTokenSymbol() {
  const bondTokenAddress = useBondTokenAddress();
  return useReadContract({
    address: bondTokenAddress,
    abi: ABIs.BondToken,
    functionName: 'symbol',
    query: { enabled: !!bondTokenAddress },
  });
}

// Get name
export function useBondTokenName() {
  const bondTokenAddress = useBondTokenAddress();
  return useReadContract({
    address: bondTokenAddress,
    abi: ABIs.BondToken,
    functionName: 'name',
    query: { enabled: !!bondTokenAddress },
  });
}

