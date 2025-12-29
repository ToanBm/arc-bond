import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIs } from "@/abi/contracts";

/**
 * Hook to approve bond token for market contract
 */
export function useApproveBondToken(bondTokenAddress?: `0x${string}`) {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const approve = (spender: `0x${string}`, amount: bigint) => {
        if (!bondTokenAddress) {
            throw new Error("Bond token address not provided");
        }

        writeContract({
            address: bondTokenAddress,
            abi: ABIs.BondToken,
            functionName: "approve",
            args: [spender, amount],
        });
    };

    return {
        approve,
        hash,
        isPending,
        isConfirming,
        isSuccess: isConfirmed,
        error,
    };
}
