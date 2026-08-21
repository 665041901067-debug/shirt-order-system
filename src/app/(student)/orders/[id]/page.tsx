import React from "react";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/services/profile";
import { getOrderById } from "@/services/orders";
import { Header } from "@/components/shared/header";
import { OrderTrackingInteractive } from "@/components/student/order-tracking-interactive";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OrderTrackingInteractive initialOrder={order} />
      </main>
    </div>
  );
}
