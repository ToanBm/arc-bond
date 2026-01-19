"use client";

import { useEffect, useState, useMemo } from "react";
import { usePortfolioData } from "@/hooks";
import { useClaimInterest, useRedeem } from "@/hooks/useBondSeries";
import { useDashboardData } from "@/hooks";
import { useMaturePools } from "@/hooks/useMaturePools";
import { usePool } from "@/contexts/PoolContext";
import toast from "react-hot-toast";

export default function WithdrawCard() {
    // --- HOOKS ---
    const {
        claimableAmount,
        interestReceived,
        isConnected,
        abondBalance,
        abondBalanceRaw,
        redeemableAmount
    } = usePortfolioData();

    const { claimInterest, isPending: isClaimPending, isSuccess: isClaimSuccess, hash: claimHash } = useClaimInterest();
    const { hasMatured } = useDashboardData();
    const { selectedPool } = usePool();
    const { maturePools } = useMaturePools();

    // --- STATE ---
    const [claimingAmount, setClaimingAmount] = useState<string | null>(null);
    const [redeemingAmount, setRedeemingAmount] = useState<string | null>(null);
    const [selectedRedeemPoolId, setSelectedRedeemPoolId] = useState<string | null>(null);
    const [liveClaimable, setLiveClaimable] = useState<number>(0);

    // --- LOGIC: REAL-TIME YIELD ---
    useEffect(() => {
        if (!claimableAmount || !abondBalance || parseFloat(abondBalance) === 0) {
            setLiveClaimable(parseFloat(claimableAmount || "0"));
            return;
        }

        const baseAmount = parseFloat(claimableAmount);
        const balance = parseFloat(abondBalance);

        // Rate: 1% per day (as shown in UI)
        const ratePerSecond = (balance * 0.01) / 86400;
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const extraYield = elapsedSeconds * ratePerSecond;
            setLiveClaimable(baseAmount + extraYield);
        }, 1000);

        return () => clearInterval(interval);
    }, [claimableAmount, abondBalance]);

    // --- LOGIC: CLAIM ---
    const formattedClaimable = liveClaimable.toFixed(4);
    const formattedInterestReceived = parseFloat(interestReceived || "0").toFixed(4);
    const canClaim = isConnected && parseFloat(claimableAmount) > 0;

    useEffect(() => {
        if (isClaimSuccess && claimHash && claimingAmount) {
            toast.success(`Claimed ${claimingAmount} USDC interest!`);
            setClaimingAmount(null);
        }
    }, [isClaimSuccess, claimHash, claimingAmount]);

    const handleClaim = () => {
        setClaimingAmount(formattedClaimable);
        toast.loading("Claiming interest...");
        claimInterest();
    };

    // --- LOGIC: REDEEM ---
    // Combined logic to find selected redeem pool
    const selectedRedeemPool = useMemo(() => {
        if (selectedRedeemPoolId) {
            return maturePools.find(p => p.poolId === selectedRedeemPoolId) || null;
        }
        // Auto select current pool if mature
        if (hasMatured && selectedPool && parseFloat(abondBalance) > 0) {
            return {
                poolId: selectedPool.poolId,
                name: selectedPool.name || "Current Pool",
                bondSeries: selectedPool.bondSeries,
                balance: abondBalance,
                balanceRaw: abondBalanceRaw || BigInt(0),
                redeemableAmount,
                isMature: true
            };
        }
        return maturePools.length > 0 ? maturePools[0] : null;
    }, [selectedRedeemPoolId, maturePools, hasMatured, selectedPool, abondBalance, abondBalanceRaw, redeemableAmount]);

    useEffect(() => {
        if (maturePools.length > 0 && !selectedRedeemPoolId) setSelectedRedeemPoolId(maturePools[0].poolId);
    }, [maturePools, selectedRedeemPoolId]);

    const { redeem, isPending: isRedeemPending, isSuccess: isRedeemSuccess, hash: redeemHash } = useRedeem(selectedRedeemPool?.bondSeries);

    useEffect(() => {
        if (isRedeemSuccess && redeemHash && redeemingAmount) {
            toast.success(`Redeemed ${redeemingAmount} USDC successfully!`);
            setRedeemingAmount(null);
        }
    }, [isRedeemSuccess, redeemHash, redeemingAmount]);

    const handleRedeem = () => {
        if (!selectedRedeemPool?.balanceRaw) return;
        setRedeemingAmount(selectedRedeemPool.redeemableAmount);
        toast.loading("Redeeming principal...");
        redeem(selectedRedeemPool.balance);
    };

    const canRedeem = isConnected && selectedRedeemPool && parseFloat(selectedRedeemPool.balance) > 0;

    // --- RENDER ---
    return (
        <div className="card h-full flex flex-col">
            {/* 1. CLAIM INTEREST SECTION */}
            <div className="flex-1 flex flex-col">
                <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900">
                        Claim Interest
                    </h3>
                    <div className="text-sm text-gray-600 mt-1">
                        Interest is accrued real-time at 1% per day
                    </div>
                </div>

                {/* Spacer to push content to bottom */}
                <div className="flex-1"></div>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        {/* Claimable Amount - Left (50%) */}
                        <div className="flex-1">
                            <div className="text-sm text-gray-600 mb-1">Claimable Amount</div>
                            <div className="bg-gray-50 border border-custom rounded-lg px-4 py-2 text-center">
                                <span className="text-base font-bold text-gray-900">{formattedClaimable} USDC</span>
                            </div>
                        </div>

                        {/* Interest Received - Right (50%) */}
                        <div className="flex-1">
                            <div className="text-sm text-gray-600 mb-1">Interest Received</div>
                            <div className="bg-gray-50 border border-custom rounded-lg px-4 py-2 text-center">
                                <span className="text-base font-bold text-gray-900">{formattedInterestReceived} USDC</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleClaim}
                        disabled={!canClaim || isClaimPending}
                        className="w-full btn-primary font-medium py-2 px-4 disabled:opacity-50"
                    >
                        {isClaimPending ? "Claiming..." : "Claim Interest"}
                    </button>
                </div>
            </div>

            {/* 2. REDEEM PRINCIPAL SECTION - Only show when matured */}
            {selectedRedeemPool && (
                <>
                    {/* DIVIDER */}
                    <div className="h-px bg-gray-200"></div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                                Redeem Principal
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {/* Pool Selector if multiple mature pools */}
                            {maturePools.length > 1 && (
                                <select
                                    value={selectedRedeemPoolId || ""}
                                    onChange={(e) => setSelectedRedeemPoolId(e.target.value)}
                                    className="w-full text-sm border-gray-300 rounded-md"
                                >
                                    {maturePools.map(p => <option key={p.poolId} value={p.poolId}>{p.name}</option>)}
                                </select>
                            )}

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex justify-between items-center">
                                <span className="text-sm text-blue-800">Redeemable:</span>
                                <span className="font-bold text-blue-900">{selectedRedeemPool.redeemableAmount} USDC</span>
                            </div>

                            <button
                                onClick={handleRedeem}
                                disabled={!canRedeem || isRedeemPending}
                                className="w-full btn-primary font-medium py-2 px-4 disabled:opacity-50"
                            >
                                {isRedeemPending ? "Redeeming..." : "Redeem Principal"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
