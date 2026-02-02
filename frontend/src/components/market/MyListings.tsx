"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCancelOrder } from "@/hooks";
import { SignedOrder } from "@/types/market";
import toast from "react-hot-toast";

export default function MyListings() {
    const { address } = useAccount();
    const queryClient = useQueryClient();
    const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
    const { cancelOrder, isSuccess } = useCancelOrder();

    // Use React Query for fetching
    const { data: myOrders = [], isLoading } = useQuery({
        queryKey: ['myListings', address],
        queryFn: async () => {
            if (!address) return [];
            const res = await fetch(`/api/orders?seller=${address}`);
            if (!res.ok) throw new Error("Failed to fetch orders");
            return res.json() as Promise<SignedOrder[]>;
        },
        enabled: !!address, // Only fetch if address exists
    });

    // Handle successful cancel
    useEffect(() => {
        if (isSuccess && address && cancellingOrderId) {
            toast.success("Listing cancelled!");

            // Find the cancelled order (from cached data)
            const cancelledOrder = myOrders.find(order => order.nonce === cancellingOrderId);

            // Api delete
            if (cancelledOrder?.signature) {
                fetch(`/api/orders?signature=${cancelledOrder.signature}`, { method: "DELETE" });
            }

            // Invalidate query to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['myListings', address] });

            setCancellingOrderId(null);
        }
    }, [isSuccess, address, cancellingOrderId, myOrders, queryClient]);

    const handleCancel = (nonce: string) => {
        try {
            setCancellingOrderId(nonce);
            cancelOrder(BigInt(nonce));
            toast.loading("Cancelling listing...");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to cancel");
            setCancellingOrderId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div>
            {myOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <span className="text-4xl mb-4 opacity-50">📝</span>
                    <p className="text-gray-600 font-medium">No active listings</p>
                    <p className="text-gray-400 text-sm">Create a listing to sell your bonds</p>
                </div>
            ) : (
                <>
                    {/* Header Row */}
                    <div className="bg-gray-100 py-3">
                        <div className="flex items-center gap-4 px-6">
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <p className="text-xs font-semibold text-gray-700">Amount (arcUSDC)</p>
                                <p className="text-xs font-semibold text-gray-700">Price (USDC)</p>
                                <p className="text-xs font-semibold text-gray-700">Ratio (USDC/arcUSDC)</p>
                                <p className="text-xs font-semibold text-gray-700">Expires</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="text-xs font-semibold text-gray-700" style={{ width: '100px' }}>Action</p>
                            </div>
                        </div>
                    </div>

                    {/* Data Rows */}
                    {myOrders.map((order, index) => {
                        const isCancellingThis = cancellingOrderId === order.nonce;
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
                                className={`px-6 py-2 hover:bg-gray-50 transition-colors ${index !== myOrders.length - 1 ? 'border-b border-gray-200' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <p className="text-gray-900 font-bold">{bondAmount.toFixed(2)}</p>
                                        <p className="text-gray-900 font-bold">{usdcAmount.toFixed(2)}</p>
                                        <p className="text-gray-900 font-bold">{ratioDisplay}</p>
                                        <p className="text-gray-900 font-bold">{hoursLeft}h</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            className="btn-primary py-1.5 px-4 disabled:opacity-50 whitespace-nowrap bg-orange-500 hover:bg-orange-600"
                                            onClick={() => handleCancel(order.nonce)}
                                            disabled={isCancellingThis}
                                            style={{ width: '100px' }}
                                        >
                                            {isCancellingThis ? "Cancelling..." : "Cancel"}
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
