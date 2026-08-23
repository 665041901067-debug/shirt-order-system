import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile, isProfileIncomplete } from "@/services/profile";
import { getOrderById } from "@/services/orders";
import { getActivePaymentMethods } from "@/services/payments";
import { Header } from "@/components/shared/header";
import { OrderTrackingInteractive } from "@/components/student/order-tracking-interactive";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, order, paymentMethods] = await Promise.all([
    getCurrentProfile(),
    getOrderById(id),
    getActivePaymentMethods(),
  ]);

  if (profile && profile.role !== "ADMIN" && (await isProfileIncomplete(profile))) {
    redirect("/onboarding");
  }

  if (!order) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OrderTrackingInteractive initialOrder={order} paymentMethods={paymentMethods} />
      </main>
    </div>
  );
}
