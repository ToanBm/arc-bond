"use client";

import { useTab } from "@/contexts/TabContext";
import { useIsAdmin } from "@/hooks";
import { useAccount } from "wagmi";
import DashboardMain from "@/components/dashboard/DashboardMain";
import Bridge from "@/components/bridge/Bridge";
import AdminPanel from "@/components/admin/Admin";
import Deposit from "@/components/trade/Deposit";
import Market from "@/components/market/Market";

export default function Home() {
  const { activeTab } = useTab();
  const { address } = useAccount();
  const { data: isAdmin } = useIsAdmin(address);

  return (
    <>
      {activeTab === "dashboard" && <DashboardMain />}
      {activeTab === "deposit" && <Deposit />}
      {activeTab === "market" && <Market />}
      {activeTab === "bridge" && <Bridge />}
      {activeTab === "admin" && isAdmin && <AdminPanel />}
    </>
  );
}
