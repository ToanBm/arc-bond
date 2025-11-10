import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  useBondSeriesInfo,
  useClaimableAmount,
  useTreasuryStatus,
  useRecordCount,
  useLastDistributedRecord,
  useIsPaused,
} from './useBondSeries';
import { useBondTokenBalance } from './useBondToken';
import { useUSDCBalance, useUSDCAllowance } from './useUSDC';

/**
 * Combined hook for Dashboard overview
 */
export function useDashboardData() {
  const { data: seriesInfo, isLoading: loadingSeriesInfo } = useBondSeriesInfo();
  const { data: recordCount } = useRecordCount();
  const { data: lastDistributed } = useLastDistributedRecord();
  const { data: isPaused } = useIsPaused();

  // Parse seriesInfo
  const maturityDate = seriesInfo?.[0] ? Number(seriesInfo[0]) : 0;
  const totalDeposited = seriesInfo?.[1] ? formatUnits(seriesInfo[1], 6) : '0';
  const totalSupply = seriesInfo?.[2] ? formatUnits(seriesInfo[2], 6) : '0';
  const emergencyMode = seriesInfo?.[5] ?? false;

  // Calculate pending distributions
  const dashboardRecord = recordCount
    ? (Array.isArray(recordCount) ? Number(recordCount[0]) : Number(recordCount))
    : 0;
  const dashboardLast = lastDistributed
    ? (Array.isArray(lastDistributed) ? Number(lastDistributed[0]) : Number(lastDistributed))
    : 0;
  const pendingDistributions = dashboardRecord > dashboardLast
    ? dashboardRecord - dashboardLast
    : 0;

  // Calculate time to maturity
  const now = Math.floor(Date.now() / 1000);
  const timeToMaturity = maturityDate - now;
  const hasMatured = timeToMaturity <= 0;
  const hoursToMaturity = Math.floor(timeToMaturity / 3600);
  const minutesToMaturity = Math.floor((timeToMaturity % 3600) / 60);

  return {
    // Series info
    totalDeposited,
    totalSupply,
    maturityDate,
    hasMatured,
    timeToMaturity: hasMatured ? 'Matured' : `${hoursToMaturity}h ${minutesToMaturity}m`,
    
    // Status
    emergencyMode,
    isPaused: isPaused ?? false,
    pendingDistributions,
    
    // Health
    healthStatus: emergencyMode ? 'emergency' : 
                  pendingDistributions >= 3 ? 'critical' :
                  pendingDistributions >= 1 ? 'warning' : 'healthy',
    
    // Loading
    isLoading: loadingSeriesInfo,
  };
}

/**
 * Combined hook for user portfolio
 */
export function usePortfolioData() {
  const { address } = useAccount();
  
  const { data: abondBalance } = useBondTokenBalance(address);
  const { data: usdcBalance } = useUSDCBalance(address);
  const { data: claimableAmount } = useClaimableAmount(address);
  const { data: allowance } = useUSDCAllowance(address);

  // Calculate redeemable principal (arcUSDC / 10 = USDC)
  const redeemableAmount = abondBalance 
    ? formatUnits(abondBalance / BigInt(10), 6)
    : '0';

  return {
    // Balances
    abondBalance: abondBalance ? formatUnits(abondBalance, 6) : '0',
    abondBalanceRaw: abondBalance,
    usdcBalance: usdcBalance ? formatUnits(usdcBalance, 6) : '0',
    usdcBalanceRaw: usdcBalance,
    
    // Claimable
    claimableAmount: claimableAmount ? formatUnits(claimableAmount, 6) : '0',
    claimableAmountRaw: claimableAmount,
    
    // Redeemable
    redeemableAmount,
    
    // Allowance
    hasAllowance: allowance ? allowance > BigInt(0) : false,
    allowance: allowance ? formatUnits(allowance, 6) : '0',
    
    // Address
    address,
    isConnected: !!address,
  };
}

/**
 * Combined hook for admin panel
 */
export function useAdminData() {
  const { data: seriesInfo } = useBondSeriesInfo();
  const { data: treasuryStatus } = useTreasuryStatus();
  const { data: recordCount } = useRecordCount();
  const { data: lastDistributed } = useLastDistributedRecord();
  const { data: isPaused } = useIsPaused();

  // Treasury data
  const treasuryBalance = treasuryStatus?.[0] ? formatUnits(treasuryStatus[0], 6) : '0';
  const reserved = treasuryStatus?.[1] ? formatUnits(treasuryStatus[1], 6) : '0';
  const withdrawable = treasuryStatus?.[2] ? formatUnits(treasuryStatus[2], 6) : '0';

  // Snapshot data
  const totalSupply = seriesInfo?.[2] ? seriesInfo[2] : BigInt(0);
  const adminRecord = recordCount
    ? (Array.isArray(recordCount) ? Number(recordCount[0]) : Number(recordCount))
    : 0;
  const adminLast = lastDistributed
    ? (Array.isArray(lastDistributed) ? Number(lastDistributed[0]) : Number(lastDistributed))
    : 0;
  const pendingDistributions = adminRecord > adminLast
    ? adminRecord - adminLast
    : 0;

  // Calculate coupon due (0.001 USDC per arcUSDC)
  const couponDue = totalSupply ? formatUnits((totalSupply * BigInt(1000)) / BigInt(1e6), 6) : '0';

  return {
    // Snapshot
    latestSnapshot: recordCount?.toString() ?? '0',
    lastDistributed: lastDistributed?.toString() ?? '0',
    pendingDistributions,
    couponDue,
    
    // Treasury
    treasuryBalance,
    reserved,
    withdrawable,
    withdrawableRaw: treasuryStatus?.[2],
    
    // Status
    isPaused: isPaused ?? false,
  };
}

