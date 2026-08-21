import React from "react";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/services/profile";
import { getOrderById } from "@/services/orders";
import { Header } from "@/components/shared/header";
import { OrderSuccessInteractive } from "@/components/student/order-success-interactive";

export default async function OrderSuccessPage({
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

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <OrderSuccessInteractive order={order} />
      </main>
    </div>
  );
}
