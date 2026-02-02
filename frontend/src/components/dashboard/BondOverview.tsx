"use client";

import { useDashboardData } from "@/hooks";
import { useTreasuryStatus } from "@/hooks/useBondSeries";
import { formatUnits } from "viem";

export default function BondOverview() {
  const { totalDeposited, timeToMaturity, isLoading, apy, solvencyRatio } = useDashboardData();

  if (isLoading) {
    return (
      <div className="card">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="grid grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">Total AUM</div>
          <div className="text-lg font-bold text-gray-900">
            {totalDeposited} <span className="text-sm text-gray-500">USDC</span>
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">APY</div>
          <div className="text-lg font-bold text-gray-900">{apy}</div>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">Solvency</div>
          <div className="text-lg font-bold text-gray-900">
            {solvencyRatio}%
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">
            {timeToMaturity === 'Matured' ? 'Status' : 'Time to Maturity'}
          </div>
          <div className={`text-lg font-bold ${timeToMaturity === 'Matured' ? 'text-green-600' : 'text-gray-900'}`}>
            {timeToMaturity === 'Matured' ? '✅ Matured' : timeToMaturity}
          </div>
        </div>
      </div>
    </div>
  );
}

