import React from "react";
import { getCurrentProfile } from "@/services/profile";
import { getActivePaymentMethods } from "@/services/payments";
import { Header } from "@/components/shared/header";
import { AdminPaymentsInteractive } from "@/components/admin/admin-payments-interactive";

export default async function AdminPaymentsPage() {
  const profile = await getCurrentProfile();
  const methods = await getActivePaymentMethods();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminPaymentsInteractive initialMethods={methods} />
      </main>
    </div>
  );
}
