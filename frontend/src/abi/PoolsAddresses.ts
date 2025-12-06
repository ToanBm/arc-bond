/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export type PoolInfo = {
  poolId: string;
  name: string;
  symbol: string;
  bondToken: `0x${string}`;
  bondSeries: `0x${string}`;
  maturityDate: string;
  createdAt: string;
  isActive: boolean;
};

export const PoolsAddresses = {
  "5042002": {
    chainId: 5042002,
    chainName: "arc",
    pools: {
    "1": {
      poolId: "1",
      name: "ArcBond USDC Series 1",
      symbol: "arcUSDC-1",
      bondToken: "0xCcBC116c212C3DB7a715e32Af5b009D2fccB1B7c" as const,
      bondSeries: "0x73363003d9b5faa45b35A9877a24b1FF8bb65228" as const,
      maturityDate: "1765615451",
      createdAt: "1765010651",
      isActive: true
    }
    }
  }
} as const;

export function getPools(chainId: number): Record<string, PoolInfo> {
  const chain = PoolsAddresses[chainId.toString() as keyof typeof PoolsAddresses];
  if (!chain) {
    throw new Error(`Pools not found on chain ${chainId}`);
  }
  return chain.pools as Record<string, PoolInfo>;
}

export function getPool(chainId: number, poolId: string): PoolInfo | undefined {
  const pools = getPools(chainId);
  return pools[poolId];
}

export function getAllPoolIds(chainId: number): string[] {
  const pools = getPools(chainId);
  return Object.keys(pools);
}
