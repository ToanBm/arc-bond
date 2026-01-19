"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { usePool } from "@/contexts/PoolContext";
import MarketList from "./MarketList";
import MyListings from "./MyListings";
import CreateListingModal from "./CreateListingModal";

type MarketTab = "buy" | "sell";

export default function Market() {
    const [activeTab, setActiveTab] = useState<MarketTab>("buy");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { address } = useAccount();
    const queryClient = useQueryClient();
    const { selectedPool } = usePool();
    const bondTokenAddress = selectedPool?.bondToken;

    const handleListingCreated = () => {
        setIsCreateModalOpen(false);
        // Refresh My Listings data
        queryClient.invalidateQueries({ queryKey: ['myListings', address] });
        // Also refresh general market list if needed
        queryClient.invalidateQueries({ queryKey: ['marketListings'] });
    };

    return (
        <div className="w-4/5 mx-auto">
            {/* Header & Tabs - Outside card */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                {/* Tabs - Left side */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab("buy")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "buy"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                            }`}
                    >
                        Buy Bonds
                    </button>
                    <button
                        onClick={() => setActiveTab("sell")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "sell"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                            }`}
                    >
                        My Listings
                    </button>
                </div>

                {/* Create Button - Right side, only show when My Listings tab is active */}
                {activeTab === "sell" && bondTokenAddress && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-primary font-medium py-1.5 px-4 text-sm"
                    >
                        Create
                    </button>
                )}
            </div>

            {/* Main Content Area - Inside card */}
            <div className="card !p-0 overflow-hidden">
                {activeTab === "buy" ? <MarketList /> : <MyListings />}
            </div>

            {/* Create Listing Modal */}
            {bondTokenAddress && (
                <CreateListingModal
                    isOpen={isCreateModalOpen}
                    onClose={handleListingCreated}
                    bondTokenAddress={bondTokenAddress}
                />
            )}
        </div>
    );
}
