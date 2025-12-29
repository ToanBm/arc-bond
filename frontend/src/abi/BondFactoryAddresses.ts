/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondFactoryAddresses = {
  "5042002": {
    chainId: 5042002,
    chainName: "arc",
    address: "0x4fA228e2eADF00248D770527bfb15c536a8A40bF" as const
  }
} as const;

export function getBondFactoryAddress(chainId: number): `0x${string}` {
  const chain = BondFactoryAddresses[chainId.toString() as keyof typeof BondFactoryAddresses];
  if (!chain) {
    throw new Error(`BondFactory not deployed on chain ${chainId}`);
  }
  return chain.address;
}
