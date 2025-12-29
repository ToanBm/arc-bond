"use client";

import { useDashboardData } from "@/hooks";

export default function HealthStatus() {
  const { healthStatus, daysSinceLast, isLoading } = useDashboardData();

  const getStatusColor = () => {
    if (healthStatus === "emergency") return "bg-red-50 border-red-200";
    if (healthStatus === "critical") return "bg-orange-50 border-orange-200";
    if (healthStatus === "warning") return "bg-yellow-50 border-yellow-200";
    return "bg-green-50 border-green-200";
  };

  const getStatusIcon = () => {
    if (healthStatus === "emergency") return "🚨";
    if (healthStatus === "critical" || healthStatus === "warning") return "⚠️";
    return "✅";
  };

  const getStatusText = () => {
    if (healthStatus === "emergency") return "EMERGENCY MODE: Owner defaulted!";
    if (healthStatus === "critical") return `CRITICAL: Overdue for ${daysSinceLast} days`;
    if (healthStatus === "warning") return `WARNING: Overdue for ${daysSinceLast} day(s)`;
    return "System running smoothly";
  };

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Health Status</h2>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Health Status</h2>

      <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getStatusIcon()}</span>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{getStatusText()}</div>
            {healthStatus !== "healthy" && (
              <div className="text-sm text-gray-600 mt-1">
                Last distribution was {daysSinceLast} day(s) ago
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

