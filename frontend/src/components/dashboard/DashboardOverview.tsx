"use client";

import { useDashboardData } from "@/hooks";
import { useTreasuryStatus } from "@/hooks/useBondSeries";
import { formatUnits } from "viem";

export default function DashboardOverview() {
  const {
    totalDeposited,
    timeToMaturity,
    isLoading,
    healthStatus,
    daysSinceLast,
    apy,
    solvencyRatio
  } = useDashboardData();

  // --- Health Status Logic ---
  const getStatusColor = () => {
    if (healthStatus === "emergency") return "text-red-600 bg-red-50 border-red-200";
    if (healthStatus === "critical") return "text-orange-600 bg-orange-50 border-orange-200";
    if (healthStatus === "warning") return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getStatusText = () => {
    if (healthStatus === "emergency") return "EMERGENCY";
    if (healthStatus === "critical") return `CRITICAL (${daysSinceLast}d overdue)`;
    if (healthStatus === "warning") return `WARNING (${daysSinceLast}d overdue)`;
    return "HEALTHY";
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center animate-pulse">
        <div className="h-6 w-32 bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl">
      <div className="px-6 h-16 flex items-center justify-between overflow-x-auto gap-8">

        {/* Left: General Metrics */}
        <div className="flex items-center gap-8 whitespace-nowrap">
          <MetricTicker label="TVL" value={`$${totalDeposited}`} />

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200"></div>

          <MetricTicker label="APY" value={apy} highlight />

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200"></div>

          {/* Solvency */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Solvency</span>
            <span className={`text-sm font-bold ${Number(solvencyRatio) < 100 ? 'text-orange-500' : 'text-green-600'}`}>
              {solvencyRatio}%
            </span>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200"></div>

          <MetricTicker label="Maturity" value={timeToMaturity === 'Matured' ? 'Ended' : timeToMaturity} />
        </div>

        {/* Right: System Health Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap ${getStatusColor()}`}>
          <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
          <span>{getStatusText()}</span>
        </div>

      </div>
    </div>
  );
}

function MetricTicker({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}
