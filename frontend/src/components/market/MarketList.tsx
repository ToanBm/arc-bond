"use client";

import { useEffect, useState, useRef } from "react";
import { SignedOrder } from "@/types/market";
import { useAccount } from "wagmi";
import { useMatchOrder, useApproveUSDCForMarket, useUSDCAllowance } from "@/hooks";
import { getBondMarketV2Address } from "@/abi/BondMarketV2Addresses";
import { ARC_TESTNET_CHAIN_ID } from "@/abi/contracts";
import toast from "react-hot-toast";

const MARKET_ADDRESS = getBondMarketV2Address(ARC_TESTNET_CHAIN_ID);

export default function MarketList() {
    const [orders, setOrders] = useState<SignedOrder[]>([]);
    const [pendingOrder, setPendingOrder] = useState<SignedOrder | null>(null);
    const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
    const hasCalledMatchOrder = useRef(false);
    const { address } = useAccount();
    const { matchOrder, isPending, isConfirming, isSuccess } = useMatchOrder();
    const { approve, isPending: isApproving, isSuccess: isApproved } = useApproveUSDCForMarket();
    const { data: usdcAllowance } = useUSDCAllowance(address, MARKET_ADDRESS);

    useEffect(() => {
        fetch("/api/orders")
            .then((res) => res.json())
            .then((data) => setOrders(data))
            .catch((err) => console.error("Failed to fetch orders:", err));
    }, []);

    useEffect(() => {
        if (isSuccess && pendingOrder) {
            toast.success("Purchase successful!");

            fetch(`/api/orders?signature=${pendingOrder.signature}`, { method: "DELETE" })
                .catch((err) => console.error("Failed to delete order:", err));

            setPendingOrder(null);
            setProcessingOrderId(null);
            hasCalledMatchOrder.current = false;

            fetch("/api/orders")
                .then((res) => res.json())
                .then((data) => setOrders(data));
        }
    }, [isSuccess, pendingOrder]);

    const handleBuy = async (order: SignedOrder) => {
        try {
            setProcessingOrderId(order.signature);

            const orderData = {
                seller: order.seller as `0x${string}`,
                bondToken: order.bondToken as `0x${string}`,
                bondAmount: BigInt(order.bondAmount),
                usdcAmount: BigInt(order.usdcAmount),
                nonce: BigInt(order.nonce),
                deadline: BigInt(order.deadline),
            };

            const allowance = usdcAllowance || BigInt(0);
            if (allowance < orderData.usdcAmount) {
                toast.loading("Approving USDC...");
                setPendingOrder(order);
                hasCalledMatchOrder.current = false;
                approve(MARKET_ADDRESS, orderData.usdcAmount);
                return;
            }

            toast.loading("Processing purchase...");
            matchOrder(orderData, order.signature as `0x${string}`);
        } catch (error: any) {
            toast.dismiss();
            toast.error(error.message || "Failed to buy");
            setProcessingOrderId(null);
        }
    };

    useEffect(() => {
        if (!isApproved || !pendingOrder || hasCalledMatchOrder.current) return;

        hasCalledMatchOrder.current = true;
        toast.dismiss();
        toast.loading("Processing purchase...");

        const orderData = {
            seller: pendingOrder.seller as `0x${string}`,
            bondToken: pendingOrder.bondToken as `0x${string}`,
            bondAmount: BigInt(pendingOrder.bondAmount),
            usdcAmount: BigInt(pendingOrder.usdcAmount),
            nonce: BigInt(pendingOrder.nonce),
            deadline: BigInt(pendingOrder.deadline),
        };

        matchOrder(orderData, pendingOrder.signature as `0x${string}`);
    }, [isApproved, pendingOrder]);

    return (
        <div>
            {orders.filter(order => order.seller.toLowerCase() !== address?.toLowerCase()).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <span className="text-4xl mb-4 opacity-50">📭</span>
                    <p className="text-gray-600 font-medium">No active listings found</p>
                    <p className="text-gray-400 text-sm">Be the first to list a bond!</p>
                </div>
            ) : (
                <>
                    {/* Header Row */}
                    <div className="bg-gray-100 py-3">
                        <div className="flex items-center gap-4 px-6">
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
                                <p className="text-xs font-semibold text-gray-700">Seller</p>
                                <p className="text-xs font-semibold text-gray-700">Amount (arcUSDC)</p>
                                <p className="text-xs font-semibold text-gray-700">Price (USDC)</p>
                                <p className="text-xs font-semibold text-gray-700">Ratio (USDC/arcUSDC)</p>
                                <p className="text-xs font-semibold text-gray-700">Expires</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="text-xs font-semibold text-gray-700" style={{ width: '100px' }}>Active</p>
                            </div>
                        </div>
                    </div>

                    {/* Data Rows - Filter out user's own orders */}
                    {orders.filter(order => order.seller.toLowerCase() !== address?.toLowerCase()).map((order, index) => {
                        const isProcessing = processingOrderId === order.signature;
                        const bondAmount = Number(order.bondAmount) / 1e6;
                        const usdcAmount = Number(order.usdcAmount) / 1e6;

                        // Calculate ratio as fraction (USDC per arcUSDC)
                        const ratio = usdcAmount / bondAmount;
                        const ratioDisplay = `1/${(1 / ratio).toFixed(1)}`;

                        const deadline = new Date(Number(order.deadline) * 1000);
                        const timeLeft = Math.max(0, deadline.getTime() - Date.now());
                        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

                        return (
                            <div
                                key={order.signature}
                                className={`px-6 py-2 hover:bg-gray-50 transition-colors ${index !== orders.length - 1 ? 'border-b border-gray-200' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <p className="font-mono text-gray-900 font-bold px-2 py-1">
                                            {order.seller.slice(0, 4)}...{order.seller.slice(-4)}
                                        </p>
                                        <p className="text-gray-900 font-bold py-1">{bondAmount.toFixed(2)}</p>
                                        <p className="text-gray-900 font-bold py-1">{usdcAmount.toFixed(2)}</p>
                                        <p className="text-gray-900 font-bold py-1">{ratioDisplay}</p>
                                        <p className="text-gray-900 font-bold py-1">{hoursLeft}h</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            className="btn-primary py-1.5 px-4 disabled:opacity-50 whitespace-nowrap"
                                            onClick={() => handleBuy(order)}
                                            disabled={isProcessing}
                                            style={{ width: '100px' }}
                                        >
                                            {isProcessing ? "Processing..." : "Buy Now"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
}
