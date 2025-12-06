"use client";

import { useDashboardData } from "@/hooks";
import { useTreasuryStatus, useBondSeriesInfo } from "@/hooks/useBondSeries";
import { formatUnits } from "viem";
import HealthStatus from "./HealthStatus";

export default function DashboardOverview() {
  const { 
    totalDeposited, 
    totalSupply,
    timeToMaturity, 
    isLoading 
  } = useDashboardData();
  
  const { data: treasuryStatus } = useTreasuryStatus();
  const { data: seriesInfo } = useBondSeriesInfo();
  
  // Treasury metrics
  const treasuryBalance = treasuryStatus?.[0] ? formatUnits(treasuryStatus[0], 6) : "0";
  const reserved = treasuryStatus?.[1] ? formatUnits(treasuryStatus[1], 6) : "0";
  const withdrawable = treasuryStatus?.[2] ? formatUnits(treasuryStatus[2], 6) : "0";
  
  // Calculate metrics
  const solvencyRatio = parseFloat(totalDeposited) > 0 
    ? ((parseFloat(treasuryBalance) / parseFloat(totalDeposited)) * 100).toFixed(0)
    : "0";
  
  // Total AUM (Assets Under Management)
  const tvl = totalDeposited;
  
  // Total Coupons Paid = Cumulative Index × Total Supply
  const cumulativeIndex = seriesInfo?.[4] ? formatUnits(seriesInfo[4], 6) : "0";
  const totalCouponsPaid = (parseFloat(cumulativeIndex) * parseFloat(totalSupply)).toFixed(2);
  
  // Record count
  const recordCount = seriesInfo?.[3]?.toString() ?? "0";
  
  // APY
  const apy = "365%";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[60%] mx-auto space-y-6">
      {/* Health Status */}
      <HealthStatus />
      
      {/* Primary Metrics */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4 text-gray-900">Key Metrics</h3>
        <div className="bg-gray-50 border border-custom rounded-lg p-4">
          <div className="grid grid-cols-4 gap-6">
            <MetricItem label="Total AUM" value={tvl} unit="USDC" />
            <MetricItem label="Total Supply" value={totalSupply} unit="arcUSDC" />
            <MetricItem label="APY" value={apy} unit="" />
            <MetricItem label="Solvency Ratio" value={`${solvencyRatio}%`} unit="" />
          </div>
        </div>
      </div>
      
      {/* Treasury Details */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4 text-gray-900">Treasury Details</h3>
        <div className="bg-gray-50 border border-custom rounded-lg p-4">
          <div className="grid grid-cols-3 gap-6">
            <MetricItem label="Treasury Balance" value={treasuryBalance} unit="USDC" />
            <MetricItem label="Reserved (30%)" value={reserved} unit="USDC" />
            <MetricItem label="Owner Withdrawable" value={withdrawable} unit="USDC" />
          </div>
        </div>
      </div>
      
      {/* Activity Metrics */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4 text-gray-900">Activity</h3>
        <div className="bg-gray-50 border border-custom rounded-lg p-4">
          <div className="grid grid-cols-3 gap-6">
            <MetricItem label="Snapshots Recorded" value={recordCount} unit="" />
            <MetricItem label="Total Coupons Paid" value={totalCouponsPaid} unit="USDC" />
            <MetricItem 
              label={timeToMaturity === 'Matured' ? 'Status' : 'Time to Maturity'} 
              value={timeToMaturity === 'Matured' ? '✅ Matured' : timeToMaturity} 
              unit="" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricItem({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="text-center">
      <div className="text-sm text-gray-600 mb-2">{label}</div>
      <div className="text-lg font-bold text-gray-900">
        {value} {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
    </div>
  );
}

