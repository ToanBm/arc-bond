import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { BondMarketV2ABI } from "@/abi/BondMarketV2ABI";
import { getBondMarketV2Address } from "@/abi/BondMarketV2Addresses";
import { ARC_TESTNET_CHAIN_ID } from "@/abi/contracts";
import type { OrderData } from "./useSignOrder";

const MARKET_ADDRESS = getBondMarketV2Address(ARC_TESTNET_CHAIN_ID);

/**
 * Hook to match (buy) an order
 */
export function useMatchOrder() {
    const { writeContract, data: hash, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const matchOrder = (order: OrderData, signature: `0x${string}`) => {
        writeContract({
            address: MARKET_ADDRESS,
            abi: BondMarketV2ABI.abi,
            functionName: "matchOrder",
            args: [order, signature],
        });
    };

    return {
        matchOrder,
        hash,
        isConfirming,
        isSuccess: isConfirmed,
        error,
    };
}

/**
 * Hook to cancel an order
 */
export function useCancelOrder() {
    const { writeContract, data: hash, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const cancelOrder = (nonce: bigint) => {
        writeContract({
            address: MARKET_ADDRESS,
            abi: BondMarketV2ABI.abi,
            functionName: "cancelOrder",
            args: [nonce],
        });
    };

    return {
        cancelOrder,
        hash,
        isConfirming,
        isSuccess: isConfirmed,
        error,
    };
}

/**
 * Hook to check if a nonce is valid
 */
export function useIsValidNonce(userAddress?: `0x${string}`, nonce?: bigint) {
    return useReadContract({
        address: MARKET_ADDRESS,
        abi: BondMarketV2ABI.abi,
        functionName: "isValidNonce",
        args: userAddress && nonce !== undefined ? [userAddress, nonce] : undefined,
        query: {
            enabled: !!userAddress && nonce !== undefined,
        },
    });
}

/**
 * Hook to get USDC address from market
 */
export function useMarketUSDC() {
    return useReadContract({
        address: MARKET_ADDRESS,
        abi: BondMarketV2ABI.abi,
        functionName: "usdc",
    });
}
