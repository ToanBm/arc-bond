import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  useBondSeriesInfo,
  useClaimableAmount,
  useInterestReceived,
  useTreasuryStatus,
  useIsPaused,
} from './useBondSeries';
import { useBondTokenBalance } from './useBondToken';
import { useUSDCBalance, useUSDCAllowance } from './useUSDC';

/**
 * Combined hook for Dashboard overview
 */
export function useDashboardData() {
  const { data: seriesInfo, isLoading: loadingSeriesInfo } = useBondSeriesInfo();
  const { data: isPaused } = useIsPaused();

  // Parse seriesInfo
  const maturityDate = seriesInfo?.[0] ? Number(seriesInfo[0]) : 0;
  const totalDeposited = seriesInfo?.[1] ? formatUnits(seriesInfo[1], 6) : '0';
  const totalSupply = seriesInfo?.[2] ? formatUnits(seriesInfo[2], 6) : '0';
  const lastDistributionTime = seriesInfo?.[4] ? Number(seriesInfo[4]) : 0;
  const emergencyMode = seriesInfo?.[5] ?? false;

  // Calculate pending days since last distribution (for health display)
  const now = Math.floor(Date.now() / 1000);
  const timeSinceLast = lastDistributionTime > 0 ? now - lastDistributionTime : 0;
  const daysSinceLast = Math.floor(timeSinceLast / 86400);

  // Calculate time to maturity
  const timeToMaturity = maturityDate - now;
  const hasMatured = timeToMaturity <= 0;
  const hoursToMaturity = Math.floor(Math.max(0, timeToMaturity) / 3600);
  const minutesToMaturity = Math.floor((Math.max(0, timeToMaturity) % 3600) / 60);

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
    daysSinceLast,

    // Health
    healthStatus: emergencyMode ? 'emergency' :
      daysSinceLast >= 3 ? 'critical' :
        daysSinceLast >= 1 ? 'warning' : 'healthy',

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
  const { data: interestReceivedRaw } = useInterestReceived(address);
  const { data: allowance } = useUSDCAllowance(address);

  // Calculate redeemable principal (arcUSDC / 10 = USDC)
  const redeemableAmount = (abondBalance && typeof abondBalance === 'bigint')
    ? formatUnits(abondBalance / BigInt(10), 6)
    : '0';

  return {
    // Balances
    abondBalance: (abondBalance && typeof abondBalance === 'bigint') ? formatUnits(abondBalance, 6) : '0',
    abondBalanceRaw: (abondBalance && typeof abondBalance === 'bigint') ? abondBalance : BigInt(0),
    usdcBalance: (usdcBalance && typeof usdcBalance === 'bigint') ? formatUnits(usdcBalance, 6) : '0',
    usdcBalanceRaw: (usdcBalance && typeof usdcBalance === 'bigint') ? usdcBalance : BigInt(0),

    // Claimable
    claimableAmount: claimableAmount ? formatUnits(claimableAmount, 6) : '0',
    claimableAmountRaw: claimableAmount,

    // Interest Received (from contract state)
    interestReceived: interestReceivedRaw ? formatUnits(interestReceivedRaw, 6) : '0',

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
  const { data: isPaused } = useIsPaused();

  // Treasury data
  const treasuryBalance = treasuryStatus?.[0] ? formatUnits(treasuryStatus[0], 6) : '0';
  const reserved = treasuryStatus?.[1] ? formatUnits(treasuryStatus[1], 6) : '0';
  const withdrawable = treasuryStatus?.[2] ? formatUnits(treasuryStatus[2], 6) : '0';

  const totalSupply = seriesInfo?.[2] ? seriesInfo[2] : BigInt(0);
  const lastDistributionTime = seriesInfo?.[4] ? Number(seriesInfo[4]) : 0;

  // Calculate interest due (0.001 USDC per arcUSDC per day)
  // Simplified for display: just 1 period's worth
  const now = Math.floor(Date.now() / 1000);
  const timeElapsed = lastDistributionTime > 0 ? now - lastDistributionTime : 0;
  const interestDue = totalSupply ? formatUnits((totalSupply * BigInt(1000)) / BigInt(1e6), 6) : '0';

  return {
    // Distribution
    currentIndex: seriesInfo?.[3] ? formatUnits(seriesInfo[3], 6) : '0.000000',
    lastDistributionTime,
    timeElapsedSinceLast: timeElapsed,

    // Treasury
    treasuryBalance,
    reserved,
    withdrawable,
    withdrawableRaw: treasuryStatus?.[2],

    // Status
    isPaused: isPaused ?? false,
    interestDue,
  };
}
