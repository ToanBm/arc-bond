"use client";

import { useState, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { BridgeKit } from "@circle-fin/bridge-kit";
import { createAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import type { EIP1193Provider } from "viem";

type BridgeStatus = "idle" | "bridging" | "success" | "error";
export type SupportedChain = "arc" | "ethereum" | "base" | "arbitrum" | "optimism";

// Bridge Kit Chain Identifiers (testnet format: Chain_Network)
const CHAIN_MAPPING: Record<SupportedChain, string> = {
  arc: "Arc_Testnet",
  ethereum: "Ethereum_Sepolia",
  base: "Base_Sepolia",
  arbitrum: "Arbitrum_Sepolia",
  optimism: "Optimism_Sepolia",
};

export function useBridge() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>("idle");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [kit, setKit] = useState<BridgeKit | null>(null);

  useEffect(() => {
    const bridgeKit = new BridgeKit();
    
    bridgeKit.on("approve", () => setCurrentStep(1));
    bridgeKit.on("burn", () => setCurrentStep(2));
    bridgeKit.on("fetchAttestation", () => setCurrentStep(3));
    bridgeKit.on("mint", () => setCurrentStep(4));

    setKit(bridgeKit);
  }, []);

  const bridge = async (
    fromChain: SupportedChain,
    toChain: SupportedChain,
    amount: string
  ) => {
    if (!walletClient || !address) {
      throw new Error("Wallet not connected");
    }

    if (!kit) {
      throw new Error("Bridge Kit not initialized");
    }

    setBridgeStatus("bridging");
    setCurrentStep(0);

    try {
      const provider = walletClient as unknown as EIP1193Provider;
      const adapter = await createAdapterFromProvider({ provider });

      const arcChainVariants = ["Arc_Testnet", "Arc", "ARC"];
      const needsArcVariant = fromChain === "arc" || toChain === "arc";
      
      let result;
      
      if (needsArcVariant) {
        // Try different Arc chain identifiers
        for (const arcChain of arcChainVariants) {
          try {
            result = await kit.bridge({
              from: {
                adapter,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                chain: (fromChain === "arc" ? arcChain : CHAIN_MAPPING[fromChain]) as any,
              },
              to: {
                adapter,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                chain: (toChain === "arc" ? arcChain : CHAIN_MAPPING[toChain]) as any,
              },
              amount,
            });
            break;
          } catch (err: unknown) {
            if (err instanceof Error && err?.message?.includes("Invalid chain")) {
              if (arcChain === arcChainVariants[arcChainVariants.length - 1]) {
                throw new Error("Arc Testnet is not supported by Bridge Kit. Available chains: Ethereum_Sepolia, Base_Sepolia, Arbitrum_Sepolia, Avalanche_Fuji, Polygon_Amoy, Optimism_Sepolia");
              }
            } else {
              throw err;
            }
          }
        }
      } else {
        // No Arc involved, direct bridge between other chains
        result = await kit.bridge({
          from: {
            adapter,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            chain: CHAIN_MAPPING[fromChain] as any,
          },
          to: {
            adapter,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            chain: CHAIN_MAPPING[toChain] as any,
          },
          amount,
        });
      }

      setBridgeStatus("success");
      return result;
    } catch (error: unknown) {
      console.error("Bridge error:", error);
      
      let errorMsg = error instanceof Error ? error.message : "Bridge failed";
      
      if (errorMsg.includes("User rejected") || errorMsg.includes("User denied")) {
        errorMsg = "Transaction cancelled by user";
      } else if (errorMsg.includes("insufficient funds")) {
        errorMsg = "Insufficient funds for gas or USDC amount";
      } else if (errorMsg.includes("chain") || errorMsg.includes("network")) {
        errorMsg = `Network error. Please ensure you're on ${fromChain} testnet and try again.`;
      } else if (errorMsg.includes("Arc")) {
        errorMsg = "Arc Testnet may not be supported by Bridge Kit yet. Try using Circle Faucet or manual CCTP.";
      }
      
      setBridgeStatus("error");
      setCurrentStep(0);
      throw new Error(errorMsg);
    }
  };

  return {
    bridge,
    bridgeStatus,
    currentStep,
  };
}

