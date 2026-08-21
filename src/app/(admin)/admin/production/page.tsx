import React from "react";
import { getCurrentProfile } from "@/services/profile";
import { getProductionSummary, getAllAdminOrders } from "@/services/admin";
import { Header } from "@/components/shared/header";
import { ProductionInteractive } from "@/components/admin/production-interactive";

export default async function AdminProductionPage() {
  const profile = await getCurrentProfile();
  const summary = await getProductionSummary();
  const orders = await getAllAdminOrders();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductionInteractive summary={summary} orders={orders} />
      </main>
    </div>
  );
}
