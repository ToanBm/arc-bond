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
      name: "ArcBond Series 1",
      symbol: "arcUSDC",
      bondToken: "0x8BDDff8591AF59CC6539E3ecDB9EE02D13388e89" as const,
      bondSeries: "0x709F3EE95be6edb7270126021201ff3BF57eBd0A" as const,
      maturityDate: "1767605588",
      createdAt: "1767000788",
      isActive: true
    },
    "2": {
      poolId: "2",
      name: "ArcBond Series 1",
      symbol: "arcUSDC",
      bondToken: "0x46Cd079E8eB39FAC057ab549E5879CCc353E2797" as const,
      bondSeries: "0x58F80ba744c35EE9f488CC57Ef6C96393B4Ea79F" as const,
      maturityDate: "1770005191",
      createdAt: "1768795591",
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
