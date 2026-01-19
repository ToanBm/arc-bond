"use client";

import { useState } from "react";
import Image from "next/image";
import { useAccount, useSwitchChain, useBalance } from "wagmi";
import { sepolia, baseSepolia, arbitrumSepolia, optimismSepolia } from "wagmi/chains";
import { formatUnits } from "viem";
import ChainSelector from "./ChainSelector";
import { useBridge, type SupportedChain } from "@/hooks/useBridge";
import toast from "react-hot-toast";

// Map selector values to chain IDs
const CHAIN_ID_MAP: Record<SupportedChain, number> = {
  arc: 5042002,
  ethereum: sepolia.id,
  base: baseSepolia.id,
  arbitrum: arbitrumSepolia.id,
  optimism: optimismSepolia.id,
};

// USDC addresses on each testnet
const USDC_ADDRESS_MAP: Record<SupportedChain, `0x${string}`> = {
  arc: "0x3600000000000000000000000000000000000000",
  ethereum: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  base: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  arbitrum: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  optimism: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
};

export default function BridgeCard() {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [isReverse, setIsReverse] = useState(false);
  const [selectedChain, setSelectedChain] = useState<SupportedChain>("ethereum");
  const [amount, setAmount] = useState("");
  const { bridge, bridgeStatus, currentStep } = useBridge();

  // Calculate From/To based on direction
  const fromChain: SupportedChain = isReverse ? "arc" : selectedChain;
  const toChain: SupportedChain = isReverse ? selectedChain : "arc";

  // Fetch USDC balance on source chain (fromChain)
  const { data: usdcBalance } = useBalance({
    address: address,
    token: USDC_ADDRESS_MAP[fromChain],
    chainId: CHAIN_ID_MAP[fromChain],
  });

  const formattedBalance = usdcBalance
    ? parseFloat(formatUnits(usdcBalance.value, usdcBalance.decimals)).toFixed(2)
    : "0.00";

  // Handle chain selection change
  const handleChainChange = (newChain: SupportedChain) => {
    setSelectedChain(newChain);

    const targetChainId = CHAIN_ID_MAP[fromChain];
    if (chain?.id !== targetChainId && switchChain) {
      try {
        switchChain({ chainId: targetChainId });
        toast.success(`Switching to ${newChain}...`);
      } catch (error: unknown) {
        console.error("Failed to switch chain:", error);
        toast.error("Please approve network switch in your wallet");
      }
    }
  };

  // Swap direction
  const handleSwap = () => {
    setIsReverse(!isReverse);
  };

  const handleBridge = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect wallet");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter valid amount");
      return;
    }

    try {
      await bridge(fromChain, toChain, amount);
      toast.success("Bridge successful!");
      setAmount("");
    } catch (error: unknown) {
      console.error("Bridge error:", error);

      // Show multi-line error message
      const errorMsg = error instanceof Error ? error.message : "Bridge failed";
      toast.error(errorMsg, {
        duration: 8000,
        style: {
          maxWidth: '500px',
        },
      });
    }
  };

  const steps = [
    { name: "Approve USDC", status: currentStep >= 1 ? "complete" : "pending" },
    { name: "Burn on source", status: currentStep >= 2 ? "complete" : currentStep === 1 ? "loading" : "pending" },
    { name: "Attestation", status: currentStep >= 3 ? "complete" : currentStep === 2 ? "loading" : "pending" },
    { name: "Mint on Arc", status: currentStep >= 4 ? "complete" : currentStep === 3 ? "loading" : "pending" },
  ];

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Bridge USDC</h2>

      <div className="space-y-4">
        {/* From/To */}
        <div className="flex items-end gap-2">
          {/* From */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            {isReverse ? (
              <div className="w-full px-3 py-2 border border-custom rounded-lg bg-gray-100 cursor-not-allowed flex items-center gap-1.5">
                <Image src="/arc.svg" alt="Arc" width={20} height={20} />
                <span>Arc Testnet</span>
              </div>
            ) : (
              <ChainSelector
                value={selectedChain}
                onChange={handleChainChange}
                disabled={bridgeStatus === "bridging"}
              />
            )}
          </div>

          {/* Swap Icon */}
          <div className="mt-7">
            <button
              type="button"
              onClick={handleSwap}
              disabled={bridgeStatus === "bridging"}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Swap direction"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>

          {/* To */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            {isReverse ? (
              <ChainSelector
                value={selectedChain}
                onChange={handleChainChange}
                disabled={bridgeStatus === "bridging"}
              />
            ) : (
              <div className="w-full px-3 py-2 border border-custom rounded-lg bg-gray-100 cursor-not-allowed flex items-center gap-1.5">
                <Image src="/arc.svg" alt="Arc" width={20} height={20} />
                <span>Arc Testnet</span>
              </div>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-sm text-gray-600 mb-2 block">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={!isConnected || bridgeStatus === "bridging"}
              className="w-full px-4 py-2 border border-custom rounded-lg focus:outline-none font-bold disabled:opacity-50 disabled:bg-gray-50"
              step="0.01"
              min="0"
            />
            <div className="absolute right-3 top-2.5 text-gray-500">USDC</div>
          </div>
          <div className="text-sm text-gray-600 mt-1 flex items-center justify-between">
            <span>Balance: {formattedBalance}</span>
            <button
              type="button"
              onClick={() => setAmount(formattedBalance)}
              disabled={!isConnected || bridgeStatus === "bridging" || formattedBalance === "0.00"}
              className="text-gray-600 font-bold disabled:opacity-50"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Bridge Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Estimated Fee:</span>
            <span className="font-medium">~0.10 USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Estimated Time:</span>
            <span className="font-medium">~3 minutes</span>
          </div>
        </div>

        {/* Progress Steps */}
        {bridgeStatus === "bridging" && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Bridge Progress
            </div>
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step.status === "complete"
                    ? "bg-green-500 text-white"
                    : step.status === "loading"
                      ? "bg-blue-500 text-white animate-pulse"
                      : "bg-gray-300 text-gray-600"
                    }`}
                >
                  {step.status === "complete" ? "✓" : idx + 1}
                </div>
                <span
                  className={`text-sm ${step.status === "complete"
                    ? "text-green-700 font-medium"
                    : step.status === "loading"
                      ? "text-blue-700 font-medium"
                      : "text-gray-500"
                    }`}
                >
                  {step.name}
                  {step.status === "loading" && "..."}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bridge Button */}
        <button
          onClick={handleBridge}
          disabled={!isConnected || !amount || bridgeStatus === "bridging"}
          className="w-full btn-primary font-medium py-2 px-4 disabled:opacity-50"
        >
          {!isConnected
            ? "Connect wallet to bridge"
            : bridgeStatus === "bridging"
              ? "Bridging..."
              : "Bridge USDC"}
        </button>

        {/* Help Text */}
        {!isConnected && (
          <div className="text-sm text-gray-500 text-center">
            Connect wallet to continue
          </div>
        )}
      </div>
    </div>
  );
}
