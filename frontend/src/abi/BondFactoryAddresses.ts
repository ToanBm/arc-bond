/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondFactoryAddresses = {
  "5042002": {
    chainId: 5042002,
    chainName: "arc",
    address: "0x1374E95C3867F7b54F3d2517e1C3a6Ba18c98eAd" as const
  }
} as const;

export function getBondFactoryAddress(chainId: number): `0x${string}` {
  const chain = BondFactoryAddresses[chainId.toString() as keyof typeof BondFactoryAddresses];
  if (!chain) {
    throw new Error(`BondFactory not deployed on chain ${chainId}`);
  }
  return chain.address;
}
