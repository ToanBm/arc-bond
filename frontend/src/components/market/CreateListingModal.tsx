"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useSignOrder, type OrderData, useApproveBondToken } from "@/hooks";
import { useBondTokenBalance, useBondTokenSymbol, useBondTokenDecimals } from "@/hooks";
import { getBondMarketV2Address } from "@/abi/BondMarketV2Addresses";
import { ARC_TESTNET_CHAIN_ID } from "@/abi/contracts";
import toast from "react-hot-toast";

const MARKET_ADDRESS = getBondMarketV2Address(ARC_TESTNET_CHAIN_ID);

type CreateListingModalProps = {
    isOpen: boolean;
    onClose: () => void;
    bondTokenAddress: `0x${string}`;
};

export default function CreateListingModal({ isOpen, onClose, bondTokenAddress }: CreateListingModalProps) {
    const { address } = useAccount();
    const { signOrder } = useSignOrder();
    const { data: bondBalance } = useBondTokenBalance(address, bondTokenAddress);
    const { data: bondSymbol } = useBondTokenSymbol(bondTokenAddress);
    const { data: bondDecimals } = useBondTokenDecimals(bondTokenAddress);
    const { approve, isSuccess: isApproved } = useApproveBondToken(bondTokenAddress);

    const tokenSymbol = bondSymbol || "arcUSDC";
    const decimals = bondDecimals || 6;
    const balanceFormatted = bondBalance ? (Number(bondBalance) / Math.pow(10, decimals)).toFixed(2) : "0.00";

    const [bondAmount, setBondAmount] = useState("");
    const [usdcPrice, setUsdcPrice] = useState("");
    const [deadline, setDeadline] = useState("24");
    const [step, setStep] = useState<"input" | "approving" | "signing">("input");

    const handleCreateListing = async () => {
        if (!address || !bondAmount || !usdcPrice) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            const bondAmountWei = BigInt(Math.floor(parseFloat(bondAmount) * Math.pow(10, decimals)));
            setStep("approving");
            toast.loading("Approving bond tokens...");
            approve(MARKET_ADDRESS, bondAmountWei);
        } catch (error: unknown) {
            toast.dismiss();
            toast.error(error instanceof Error ? error.message : "Failed");
            setStep("input");
        }
    };

    useEffect(() => {
        if (!isApproved || step !== "approving" || !address) return;

        const signAndSubmit = async () => {
            try {
                setStep("signing");
                toast.dismiss();
                toast.loading("Signing order...");

                const bondAmountWei = BigInt(Math.floor(parseFloat(bondAmount) * Math.pow(10, decimals)));
                const usdcAmountWei = BigInt(Math.floor(parseFloat(usdcPrice) * 1e6));
                const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + parseInt(deadline) * 3600);
                const nonce = BigInt(Date.now());

                const order: OrderData = {
                    seller: address,
                    bondToken: bondTokenAddress,
                    bondAmount: bondAmountWei,
                    usdcAmount: usdcAmountWei,
                    nonce,
                    deadline: deadlineTimestamp,
                };

                const signature = await signOrder(order);

                const response = await fetch("/api/orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        seller: order.seller,
                        bondToken: order.bondToken,
                        bondAmount: order.bondAmount.toString(),
                        usdcAmount: order.usdcAmount.toString(),
                        nonce: order.nonce.toString(),
                        deadline: order.deadline.toString(),
                        signature,
                        chainId: ARC_TESTNET_CHAIN_ID,
                        marketAddress: MARKET_ADDRESS,
                    }),
                });

                if (!response.ok) throw new Error("Failed to create listing");

                toast.dismiss();
                toast.success("Listing created successfully!");
                setStep("input");
                onClose();
            } catch (error: unknown) {
                toast.dismiss();
                toast.error(error instanceof Error ? error.message : "Failed to create listing");
                setStep("input");
            }
        };

        signAndSubmit();
    }, [isApproved, step, address, bondAmount, bondTokenAddress, deadline, decimals, onClose, signOrder, usdcPrice]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Create Listing</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
                        ×
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-600 mb-2 block">Bond Amount</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={bondAmount}
                                onChange={(e) => setBondAmount(e.target.value)}
                                placeholder="0.0"
                                className="w-full px-4 py-2 border border-custom rounded-lg focus:outline-none font-bold"
                                disabled={step !== "input"}
                            />
                            <div className="absolute right-3 top-2.5 text-gray-500">{tokenSymbol}</div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            Balance: {balanceFormatted} {tokenSymbol}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-gray-600 mb-2 block">Price (Total USDC)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={usdcPrice}
                                onChange={(e) => setUsdcPrice(e.target.value)}
                                placeholder="0.0"
                                className="w-full px-4 py-2 border border-custom rounded-lg focus:outline-none font-bold"
                                disabled={step !== "input"}
                            />
                            <div className="absolute right-3 top-2.5 text-gray-500">USDC</div>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-gray-600 mb-2 block">Listing Duration</label>
                        <select
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full px-4 py-2 border border-custom rounded-lg focus:outline-none font-bold"
                            disabled={step !== "input"}
                        >
                            <option value="1">1 Hour</option>
                            <option value="6">6 Hours</option>
                            <option value="24">24 Hours</option>
                            <option value="72">3 Days</option>
                            <option value="168">7 Days</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 px-4 border border-custom rounded-lg font-medium hover:bg-gray-50"
                            disabled={step !== "input"}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateListing}
                            disabled={step !== "input" || !bondAmount || !usdcPrice}
                            className="flex-1 btn-primary py-2 px-4 rounded-lg font-medium disabled:opacity-50"
                        >
                            {step === "approving" ? "Approving..." : step === "signing" ? "Signing..." : "Create Listing"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
