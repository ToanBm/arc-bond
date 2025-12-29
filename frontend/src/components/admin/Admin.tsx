"use client";

import DistributeCard from "./DistributeCard";
import TreasuryCard from "./TreasuryCard";
import EmergencyCard from "./EmergencyCard";
import CreatePoolCard from "./CreatePoolCard";

export default function Admin() {
  return (
    <div className="max-w-6xl mx-auto pb-20 pt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* COLUMN 1 */}
        <div className="space-y-8">
          <DistributeCard />
          <CreatePoolCard />
        </div>

        {/* COLUMN 2 */}
        <div className="space-y-8">
          <TreasuryCard />
          <EmergencyCard />
        </div>
      </div>
    </div>
  );
}

