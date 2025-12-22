import { useAccount } from 'wagmi';
import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { ABIs } from '@/abi/contracts';
import { useAllPools } from './useBondFactory';
import { useMemo } from 'react';
import { ARC_TESTNET_CHAIN_ID, getBondSeriesAddressSafe, getBondTokenAddressSafe } from '@/abi/contracts';
import { useChainId } from 'wagmi';

export type MaturePoolInfo = {
  poolId: string;
  name: string;
  symbol: string;
  bondToken: `0x${string}`;
  bondSeries: `0x${string}`;
  maturityDate: number;
  balance: string; // Formatted balance
  balanceRaw: bigint; // Raw balance
  redeemableAmount: string; // USDC amount
  isMature: boolean;
};

/**
 * Hook to get all mature pools where user has balance
 */
export function useMaturePools() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: allPools } = useAllPools();

  // Convert contract pools to array format
  const poolsArray = useMemo(() => {
    if (!allPools || !Array.isArray(allPools)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return allPools.map((pool: any, index: number) => ({
      poolId: pool.poolId?.toString() || (index + 1).toString(),
      name: pool.name || "",
      symbol: pool.symbol || "",
      bondToken: pool.bondToken as `0x${string}`,
      bondSeries: pool.bondSeries as `0x${string}`,
      maturityDate: Number(pool.maturityDate || 0),
      createdAt: Number(pool.createdAt || 0),
      isActive: pool.isActive ?? true,
    }));
  }, [allPools]);

  // Add legacy pool if exists
  const allPoolsWithLegacy = useMemo(() => {
    const pools = [...poolsArray];
    if (chainId === ARC_TESTNET_CHAIN_ID) {
      const bondSeries = getBondSeriesAddressSafe(chainId);
      const bondToken = getBondTokenAddressSafe(chainId);
      if (bondSeries && bondToken) {
        pools.unshift({
          poolId: "legacy",
          name: "ArcBond USDC (Legacy)",
          symbol: "arcUSDC",
          bondToken,
          bondSeries,
          maturityDate: 0, // Will be fetched from contract
          createdAt: 0,
          isActive: true,
        });
      }
    }
    return pools;
  }, [poolsArray, chainId]);

  // Prepare contract calls for balance and maturity date
  const contractCalls = useMemo(() => {
    if (!address || allPoolsWithLegacy.length === 0) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls: any[] = [];
    allPoolsWithLegacy.forEach((pool) => {
      // Balance query (always)
      calls.push({
        address: pool.bondToken,
        abi: ABIs.BondToken,
        functionName: 'balanceOf' as const,
        args: [address],
      });
      // Maturity date query (only for legacy pool)
      if (pool.poolId === "legacy") {
        calls.push({
          address: pool.bondSeries,
          abi: ABIs.BondSeries,
          functionName: 'maturityDate' as const,
        });
      }
    });
    return calls;
  }, [address, allPoolsWithLegacy]);

  // Query all balances and maturity dates
  const { data: contractResults } = useReadContracts({
    contracts: contractCalls,
    query: {
      enabled: contractCalls.length > 0,
      refetchInterval: 30000, // Refetch every 30s as backup
    },
  });

  // Process results
  const maturePools = useMemo(() => {
    if (!address || !contractResults || allPoolsWithLegacy.length === 0) return [];

    const now = Math.floor(Date.now() / 1000);
    const results: MaturePoolInfo[] = [];
    let resultIndex = 0;

    allPoolsWithLegacy.forEach((pool) => {
      // Get balance (every pool has balance query)
      const balanceResult = contractResults[resultIndex];
      const balance = balanceResult?.result as bigint | undefined;
      resultIndex++;

      // Get maturity date
      let maturityDate = pool.maturityDate;
      if (pool.poolId === "legacy") {
        // Legacy pool has maturity date query
        const maturityResult = contractResults[resultIndex];
        maturityDate = maturityResult?.result ? Number(maturityResult.result) : 0;
        resultIndex++;
      }

      const isMature = maturityDate > 0 && now >= maturityDate;
      const balanceRaw = balance || BigInt(0);
      const balanceFormatted = balanceRaw ? formatUnits(balanceRaw, 6) : '0';
      const redeemableAmount = balanceRaw ? formatUnits(balanceRaw / BigInt(10), 6) : '0';

      // Only include pools that are mature AND have balance > 0
      if (isMature && balanceRaw > BigInt(0)) {
        results.push({
          poolId: pool.poolId,
          name: pool.name,
          symbol: pool.symbol,
          bondToken: pool.bondToken,
          bondSeries: pool.bondSeries,
          maturityDate,
          balance: balanceFormatted,
          balanceRaw,
          redeemableAmount,
          isMature: true,
        });
      }
    });

    return results;
  }, [address, contractResults, allPoolsWithLegacy]);

  return {
    maturePools,
    isLoading: !contractResults && contractCalls.length > 0,
  };
}

