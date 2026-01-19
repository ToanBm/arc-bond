"use client";

import YourPosition from "../portfolio/YourPosition";
import WithdrawCard from "../portfolio/WithdrawCard"; // Combined card
import YieldChart from "../portfolio/YieldChart";
import RecentActivity from "../portfolio/RecentActivity";

export default function DashboardMain() {
    return (
        <div className="w-full pb-20">
            <div className="max-w-6xl mx-auto px-4 space-y-8">


                {/* 2. Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">

                    {/* COLUMN 1 (Left - 60% width for Charts/Analytics) */}
                    <div className="lg:col-span-3">
                        {/* Yield Analytics Chart */}
                        <YieldChart />
                    </div>

                    {/* COLUMN 2 (Right - 40% width for Portfolio Actions) */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <YourPosition />
                        <div className="flex-1">
                            <WithdrawCard />
                        </div>
                    </div>
                </div>

                {/* 3. Recent Activity Section */}
                <RecentActivity />
            </div>
        </div>
    );
}
