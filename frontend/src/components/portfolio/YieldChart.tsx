"use client";

import { usePoolTVLHistory, useDashboardData, type TimeRange } from "@/hooks";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from "react";

export default function YieldChart() {
    const [range, setRange] = useState<TimeRange>('1D');
    const { timeToMaturity, totalDeposited, isLoading: loadingDash } = useDashboardData();
    const currentTVLValue = parseFloat(totalDeposited || '0');
    const { data, isLoading: loadingHist } = usePoolTVLHistory(range);

    const isLoading = loadingHist || loadingDash;

    if (isLoading) {
        return (
            <div className="card h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-custom-indigo"></div>
            </div>
        );
    }

    // Show empty state only if no history AND no current TVL
    if ((!data || data.length === 0) && currentTVLValue === 0) {
        return (
            <div className="card h-[400px] flex flex-col items-center justify-center text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pool Growth</h3>
                <div className="text-gray-400">No deposit history found for this pool yet.</div>
            </div>
        );
    }

    const TimeButton = ({ r, label }: { r: TimeRange, label: string }) => (
        <button
            onClick={() => setRange(r)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${range === r
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-500 hover:bg-gray-100'
                }`}
        >
            {label}
        </button>
    );

    const valueClass = "text-lg font-bold text-gray-900 leading-tight";
    const labelClass = "text-xs font-medium text-gray-500 tracking-wide mt-1";

    const MetricItem = ({ label, value, colorClass }: { label: string, value: string, colorClass?: string }) => (
        <div className="flex flex-col">
            <span className={`${valueClass} ${colorClass || ''}`}>{value}</span>
            <span className={labelClass}>{label}</span>
        </div>
    );

    return (
        <div className="card h-[400px] flex flex-col">
            <div className="mb-6">
                <div className="flex items-start gap-6 mb-3">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight whitespace-nowrap">Pool TVL Growth</h3>
                        <p className="text-sm text-gray-500 mt-1 whitespace-nowrap">Historical Total Value Locked</p>
                    </div>

                    <div className="flex gap-8 items-center ml-auto">
                        <MetricItem label="APY" value="365%" colorClass="text-emerald-600" />
                        <MetricItem label="Solvency" value="100%" colorClass="text-custom-indigo" />
                        <MetricItem label="Maturity" value={timeToMaturity} />
                        <MetricItem label="Current TVL" value={`$${currentTVLValue.toLocaleString()}`} />
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                        <span className="relative flex h-2 w-2">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold text-emerald-700 tracking-wide">HEALTHY</span>
                    </div>
                    <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100">
                        <TimeButton r="1D" label="1D" />
                        <TimeButton r="1W" label="1W" />
                        <TimeButton r="ALL" label="All" />
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorTVL" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            minTickGap={30}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            formatter={(value: number | undefined) => [`$${(value || 0).toLocaleString()}`, 'TVL']}
                            labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="tvl"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorTVL)"
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
