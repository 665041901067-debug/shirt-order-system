import React from "react";
import { getCurrentProfile } from "@/services/profile";
import { getAdminDashboardMetrics, getAllAdminOrders } from "@/services/admin";
import { Header } from "@/components/shared/header";
import { DashboardInteractive } from "@/components/admin/dashboard-interactive";

export default async function AdminDashboardPage() {
  const profile = await getCurrentProfile();
  const metrics = await getAdminDashboardMetrics();
  const orders = await getAllAdminOrders();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardInteractive initialMetrics={metrics} orders={orders} />
      </main>
    </div>
  );
}
