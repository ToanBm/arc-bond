"use client";

import { useState } from "react";
import Image from "next/image";
import type { SupportedChain } from "@/hooks/useBridge";

interface ChainSelectorProps {
  value: SupportedChain;
  onChange: (chain: SupportedChain) => void;
  disabled?: boolean;
}

const chains: { value: SupportedChain; label: string; icon: string }[] = [
  { value: "ethereum", label: "Ethereum Sepolia", icon: "/eth.svg" },
  { value: "base", label: "Base Sepolia", icon: "/base.svg" },
  { value: "arbitrum", label: "Arbitrum Sepolia", icon: "/arb.svg" },
  { value: "optimism", label: "Optimism Sepolia", icon: "/op.svg" },
];

export default function ChainSelector({ value, onChange, disabled }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedChain = chains.find(c => c.value === value) || chains[0];

  return (
    <div className="relative">
      {/* Selected Display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-custom rounded-lg focus:outline-none disabled:opacity-50 disabled:bg-gray-50 bg-white hover:bg-gray-50 transition-colors flex items-center gap-1.5"
      >
        <Image src={selectedChain.icon} alt={selectedChain.label} width={20} height={20} />
        <span className="flex-1 text-left">{selectedChain.label}</span>
        <span className="text-gray-400">▼</span>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-custom rounded-lg shadow-lg overflow-hidden">
            {chains.map((chain) => (
              <button
                key={chain.value}
                type="button"
                onClick={() => {
                  onChange(chain.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 flex items-center gap-1.5 hover:bg-gray-50 transition-colors ${chain.value === value ? 'bg-blue-50' : ''
                  }`}
              >
                <Image src={chain.icon} alt={chain.label} width={20} height={20} />
                <span>{chain.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

