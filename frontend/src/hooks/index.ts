/**
 * ArcBond Wagmi Hooks
 * 
 * Usage:
 * import { useBondSeriesInfo, useDeposit, useDashboardData } from '@/hooks';
 */

// BondSeries hooks
export {
  // Read
  useBondSeriesInfo,
  useNextRecordTime,
  useRecordCount,
  useLastDistributedRecord,
  useClaimableAmount,
  useTreasuryStatus,
  useIsPaused,
  useEmergencyRedeemEnabled,
  useIsAdmin,

  // Write (User)
  useDeposit,
  useClaimCoupon,
  useRedeem,

  // Write (Admin)
  useRecordSnapshot,
  useDistributeCoupon,
  useOwnerWithdraw,
  usePause,
  useUnpause,
} from './useBondSeries';

// BondToken hooks
export {
  useBondTokenBalance,
  useBondTokenTotalSupply,
  useBondTokenDecimals,
  useBondTokenSymbol,
  useBondTokenName,
} from './useBondToken';

// USDC hooks
export {
  useUSDCBalance,
  useUSDCAllowance,
  useUSDCDecimals,
  useUSDCSymbol,
  useApproveUSDC,
  useApproveUSDCMax,
  useApproveUSDCForMarket,
} from './useUSDC';

// Combined helper hooks
export {
  useDashboardData,
  usePortfolioData,
  useAdminData,
} from './useArcBond';

// Bridge hooks
export { useBridge, type SupportedChain } from './useBridge';

// BondFactory hooks
export {
  useCreatePool,
  useIsPoolCreator,
  usePoolCount,
  useAllPools,
  usePoolById,
} from './useBondFactory';

// Mature pools hooks
export {
  useMaturePools,
  type MaturePoolInfo,
} from './useMaturePools';

// BondMarketV2 hooks (P2P Marketplace)
export {
  useMatchOrder,
  useCancelOrder,
  useIsValidNonce,
  useMarketUSDC,
} from './useBondMarketV2';

// EIP-712 Signing hooks
export {
  useSignOrder,
  type OrderData,
} from './useSignOrder';

// Bond Token Approval
export {
  useApproveBondToken,
} from './useApproveBondToken';
