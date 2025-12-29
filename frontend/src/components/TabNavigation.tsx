"use client";

import { useTab, type TabType } from "@/contexts/TabContext";
import { useIsAdmin } from "@/hooks";
import { useAccount } from "wagmi";

export const TabNavigation = () => {
  const { activeTab, setActiveTab } = useTab();
  const { address } = useAccount();
  const { data: isAdmin } = useIsAdmin(address);

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "deposit", label: "Deposit" },
    { id: "market", label: "Market" },
    { id: "bridge", label: "Bridge" },
  ];

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as TabType)}
          className={`font-medium h-9 px-4 transition-colors min-w-[120px] text-base rounded-md ${activeTab === tab.id
            ? "btn-primary text-white"
            : "text-gray-900 hover:bg-gray-100"
            }`}
        >
          {tab.label}
        </button>
      ))}

      {isAdmin && (
        <button
          onClick={() => setActiveTab("admin")}
          className={`font-medium h-9 px-4 transition-colors min-w-[120px] text-base rounded-md ${activeTab === "admin"
            ? "btn-primary text-white"
            : "text-gray-900 hover:bg-gray-100"
            }`}
        >
          Admin
        </button>
      )}
    </div>
  );
};
