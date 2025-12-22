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
      name: "Bond 1",
      symbol: "arcUSDC",
      bondToken: "0xfD6889438570fFe23275993293f41b524126eE7F" as const,
      bondSeries: "0x2BB213E558E4b582261Ae978b2cddc8928e9468d" as const,
      maturityDate: "1766392320",
      createdAt: "1766391420",
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
