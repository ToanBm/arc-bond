"use client";

import { usePortfolioData, useUserActivity } from "@/hooks";
import { useState } from "react";

export default function RecentActivity() {
    const { isConnected } = usePortfolioData();
    const { activities, isLoading } = useUserActivity();
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    if (!isConnected) return null;

    const totalPages = Math.ceil(activities.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedActivities = activities.slice(startIndex, startIndex + pageSize);

    const handlePrev = () => setCurrentPage(prev => Math.max(1, prev - 1));
    const handleNext = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

    return (
        <div className="card !p-0 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center text-nowrap">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                    {isLoading && (
                        <div className="w-4 h-4 border-2 border-custom-indigo border-t-transparent rounded-full animate-spin"></div>
                    )}
                </div>

                {activities.length > pageSize && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePrev}
                            disabled={currentPage === 1}
                            className={`p-1 rounded-md transition-all ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-custom-indigo'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <span className="text-xs font-medium text-gray-400 px-1 min-w-[80px] text-center">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={handleNext}
                            disabled={currentPage === totalPages}
                            className={`p-1 rounded-md transition-all ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-custom-indigo'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto flex-1">
                {activities.length === 0 && !isLoading ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center">
                        <p className="text-gray-400 text-sm font-medium">No activity history found</p>
                    </div>
                ) : (
                    <table className="w-full table-fixed">
                        <colgroup>
                            <col className="w-1/5" />
                            <col className="w-1/5" />
                            <col className="w-1/5" />
                            <col className="w-1/5" />
                            <col className="w-1/5" />
                        </colgroup>
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-500">Activity</th>
                                <th className="px-6 py-2 text-center text-xs font-semibold text-gray-500">Amount</th>
                                <th className="px-6 py-2 text-center text-xs font-semibold text-gray-500">Status</th>
                                <th className="px-6 py-2 text-center text-xs font-semibold text-gray-500">Time</th>
                                <th className="px-6 py-2 text-right text-xs font-semibold text-gray-500">Transaction</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedActivities.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-2.5 whitespace-nowrap">
                                        <span className="font-semibold text-gray-900 text-sm">{item.type}</span>
                                    </td>
                                    <td className="px-6 py-2.5 whitespace-nowrap text-center">
                                        <span className={`font-bold text-sm ${item.color}`}>
                                            +{item.amount} {item.asset}
                                        </span>
                                    </td>
                                    <td className="px-6 py-2.5 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 tracking-wider">
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-2.5 whitespace-nowrap text-center text-xs text-gray-500">
                                        {item.time}
                                    </td>
                                    <td className="px-6 py-2.5 whitespace-nowrap text-right text-xs">
                                        <a
                                            href={`https://testnet.arcscan.app/tx/${item.hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-custom-indigo font-mono transition-colors"
                                            title="View on Explorer"
                                        >
                                            {item.hash.slice(0, 6)}...{item.hash.slice(-4)} ↗
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
