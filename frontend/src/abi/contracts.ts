/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
import { BondSeriesABI } from './BondSeriesABI';
import { BondTokenABI } from './BondTokenABI';
import { USDCABI } from './USDCABI';
import { USDCAddresses, getUSDCAddress } from './USDCAddresses';
import { BondFactoryABI } from './BondFactoryABI';
import { BondFactoryAddresses, getBondFactoryAddress } from './BondFactoryAddresses';
import { PoolsAddresses, getPools, getPool, getAllPoolIds, type PoolInfo } from './PoolsAddresses';



// Export tất cả ABIs
export const ABIs = {
  BondSeries: BondSeriesABI.abi,
  BondToken: BondTokenABI.abi,
  USDC: USDCABI.abi,
  BondFactory: BondFactoryABI.abi,
};

// Export tất cả Addresses
export const Addresses = {
  USDC: USDCAddresses,
  BondFactory: BondFactoryAddresses,
  Pools: PoolsAddresses
};

// Export individual contracts
export { BondSeriesABI };
export { BondTokenABI };
export { USDCABI, USDCAddresses, getUSDCAddress };
export { BondFactoryABI, BondFactoryAddresses, getBondFactoryAddress };
export { PoolsAddresses, getPools, getPool, getAllPoolIds };
export type { PoolInfo };

// Arc Testnet chain ID
export const ARC_TESTNET_CHAIN_ID = 5042002;

// Helper to get all addresses for current chain
export function getContractAddresses(chainId: number = ARC_TESTNET_CHAIN_ID) {
  return {
    usdc: getUSDCAddress(chainId),
    bondFactory: getBondFactoryAddress(chainId),
  };
}
