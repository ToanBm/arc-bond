"use client";

import DashboardOverview from "./DashboardOverview";
import YourPosition from "../portfolio/YourPosition";
import ClaimCard from "../portfolio/ClaimCard";
import RedeemCard from "../portfolio/RedeemCard";

export default function DashboardMain() {
    return (
        <div className="max-w-6xl mx-auto pb-20 pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* COLUMN 1 */}
                <div className="space-y-8">
                    {/* Market Status */}
                    <DashboardOverview />

                    {/* Redeem Principal */}
                    <RedeemCard />
                </div>

                {/* COLUMN 2 */}
                <div className="space-y-8">
                    {/* Your Portfolio */}
                    <div className="space-y-6">
                        {/* Fake Header to match Market Status style if needed, or just Component */}
                        <div className="flex justify-between items-end md:items-center px-1 min-h-[40px]">
                            <h3 className="text-xl font-bold text-gray-900">Your Portfolio</h3>
                        </div>
                        <YourPosition />
                    </div>

                    {/* Claim Coupon */}
                    <ClaimCard />
                </div>
            </div>
        </div>
    );
}
