"use client";

import BondOverview from "./BondOverview";
import DepositCard from "../portfolio/DepositCard";

export default function DepositPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Bond Stats */}
      <BondOverview />

      {/* Deposit Form */}
      <div className="w-full">
        <DepositCard />
      </div>
    </div>
  );
}

