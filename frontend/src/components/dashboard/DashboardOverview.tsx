"use client";

import { useDashboardData } from "@/hooks";
import { useTreasuryStatus } from "@/hooks/useBondSeries";
import { formatUnits } from "viem";

export default function DashboardOverview() {
  const {
    totalDeposited,
    timeToMaturity,
    isLoading,
    pendingDistributions,
    emergencyMode
  } = useDashboardData();

  const { data: treasuryStatus } = useTreasuryStatus();

  // Treasury metrics
  const treasuryBalance = treasuryStatus?.[0] ? formatUnits(treasuryStatus[0], 6) : "0";

  // Calculate metrics
  const solvencyRatio = parseFloat(totalDeposited) > 0
    ? ((parseFloat(treasuryBalance) / parseFloat(totalDeposited)) * 100).toFixed(0)
    : "0";

  // APY (Fixed for now)
  const apy = "365%";

  // --- Health Status Logic ---
  const getStatusColor = () => {
    if (emergencyMode) return "text-red-600 bg-red-50 border-red-200";
    if (pendingDistributions >= 3) return "text-orange-600 bg-orange-50 border-orange-200";
    if (pendingDistributions >= 1) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getStatusIcon = () => {
    if (emergencyMode) return "🚨";
    if (pendingDistributions >= 3) return "⚠️";
    if (pendingDistributions >= 1) return "⚠️";
    return "✅";
  };

  const getStatusText = () => {
    if (emergencyMode) return "EMERGENCY MODE: Owner defaulted!";
    if (pendingDistributions >= 3) return "CRITICAL: 3+ snapshots without distribution";
    if (pendingDistributions >= 1) return "WARNING: Pending distribution";
    return "System Healthy"; // Shortened for cleaner UI
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="text-gray-500 text-center py-4">Loading stats...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header outside card */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 px-1 min-h-[40px]">
        <h3 className="text-xl font-bold text-gray-900">Market Status</h3>

        {/* Health Badge */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${getStatusColor()}`}>
          <span>{getStatusIcon()}</span>
          <span className="font-semibold text-sm">{getStatusText()}</span>
        </div>
      </div>

      {/* Metrics Card */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <MetricItem label="TVL" value={totalDeposited} unit="USDC" />
          <MetricItem label="APY" value={apy} unit="" />
          <MetricItem label="Solvency" value={`${solvencyRatio}%`} unit="" />
          <MetricItem
            label="Maturity"
            value={timeToMaturity === 'Matured' ? 'Ended' : timeToMaturity}
            unit=""
            highlight={timeToMaturity === 'Matured'}
          />
        </div>
      </div>
    </div>
  );
}

function MetricItem({ label, value, unit, highlight }: { label: string; value: string; unit: string, highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-sm text-gray-600 mb-2">{label}</div>
      <div className={`text-lg font-bold ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
        {value} <span className="text-sm text-gray-500">{unit}</span>
      </div>
    </div>
  );
}
