import React from "react";
import { getCurrentProfile } from "@/services/profile";
import { getAllAdminOrders } from "@/services/admin";
import { Header } from "@/components/shared/header";
import { AdminOrdersInteractive } from "@/components/admin/admin-orders-interactive";

export default async function AdminOrdersPage() {
  const [profile, orders] = await Promise.all([
    getCurrentProfile(),
    getAllAdminOrders(),
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminOrdersInteractive initialOrders={orders} />
      </main>
    </div>
  );
}
