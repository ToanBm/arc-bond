"use client";

import Image from "next/image";
import { TabNavigation } from "./TabNavigation";
import { WalletButton } from "./WalletButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-header border-b border-custom">
      <div className="w-[90%] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo + Tabs */}
          <div className="flex items-center gap-6">
            <div className="text-2xl font-bold text-gray-900">
              ArcBond
            </div>
            <TabNavigation />
          </div>

          {/* Faucet + Wallet */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open('https://faucet.circle.com/', '_blank')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-custom rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Image src="/faucet.svg" alt="Faucet" className="w-5 h-5" width={20} height={20} />
              Faucet
            </button>
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}
