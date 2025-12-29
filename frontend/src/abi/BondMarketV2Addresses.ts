/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondMarketV2Addresses = {
  "5042002": {
    chainId: 5042002,
    chainName: "arc",
    address: "0x62906520e18E0828C81c7e3482625B2267307490" as const,
    usdcAddress: "0x3600000000000000000000000000000000000000" as const,
    version: "2.0"
  }
} as const;

export function getBondMarketV2Address(chainId: number): `0x${string}` {
  const chain = BondMarketV2Addresses[chainId.toString() as keyof typeof BondMarketV2Addresses];
  if (!chain) {
    throw new Error(`BondMarketV2 not deployed on chain ${chainId}`);
  }
  return chain.address;
}
