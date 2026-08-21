import React from "react";
import { getCurrentProfile } from "@/services/profile";
import { getActiveCampaign, getProducts } from "@/services/products";
import { Header } from "@/components/shared/header";
import { StudentHomeInteractive } from "@/components/student/student-home-interactive";

export default async function StudentHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const campaign = await getActiveCampaign();
  const products = await getProducts(params.q, params.category);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <StudentHomeInteractive
          initialCampaign={campaign}
          initialProducts={products}
        />
      </main>
    </div>
  );
}
