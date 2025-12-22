/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const BondFactoryAddresses = {
  "5042002": {
    chainId: 5042002,
    chainName: "arc",
    address: "0x44D4fc306B1cefe1108FdDD8BfF9994Eef4e7eA6" as const
  }
} as const;

export function getBondFactoryAddress(chainId: number): `0x${string}` {
  const chain = BondFactoryAddresses[chainId.toString() as keyof typeof BondFactoryAddresses];
  if (!chain) {
    throw new Error(`BondFactory not deployed on chain ${chainId}`);
  }
  return chain.address;
}
