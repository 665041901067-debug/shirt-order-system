import React from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile, isProfileIncomplete } from "@/services/profile";
import { getUserOrders } from "@/services/orders";
import { Header } from "@/components/shared/header";
import { StudentOrdersInteractive } from "@/components/student/student-orders-interactive";

export default async function OrderHistoryPage() {
  const [profile, orders] = await Promise.all([
    getCurrentProfile(),
    getUserOrders(),
  ]);

  if (profile && profile.role !== "ADMIN" && (await isProfileIncomplete(profile))) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StudentOrdersInteractive initialOrders={orders} />
      </main>
    </div>
  );
}
