import { useSignTypedData } from "wagmi";
import { getBondMarketV2Address } from "@/abi/BondMarketV2Addresses";
import { ARC_TESTNET_CHAIN_ID } from "@/abi/contracts";

const MARKET_ADDRESS = getBondMarketV2Address(ARC_TESTNET_CHAIN_ID);

export type OrderData = {
    seller: `0x${string}`;
    bondToken: `0x${string}`;
    bondAmount: bigint;
    usdcAmount: bigint;
    nonce: bigint;
    deadline: bigint;
};

const EIP712_DOMAIN = {
    name: "BondMarket",
    version: "2.0",
    chainId: ARC_TESTNET_CHAIN_ID,
    verifyingContract: MARKET_ADDRESS,
} as const;

const ORDER_TYPES = {
    Order: [
        { name: "seller", type: "address" },
        { name: "bondToken", type: "address" },
        { name: "bondAmount", type: "uint256" },
        { name: "usdcAmount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
    ],
} as const;

/**
 * Hook to sign an order using EIP-712
 */
export function useSignOrder() {
    const { signTypedDataAsync, isPending, error } = useSignTypedData();

    const signOrder = async (order: OrderData): Promise<`0x${string}`> => {
        const signature = await signTypedDataAsync({
            domain: EIP712_DOMAIN,
            types: ORDER_TYPES,
            primaryType: "Order",
            message: order,
        });

        return signature;
    };

    return {
        signOrder,
        isPending,
        error,
    };
}
