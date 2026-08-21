import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile, isProfileIncomplete } from "@/services/profile";
import { getProductById } from "@/services/products";
import { Header } from "@/components/shared/header";
import { ProductDetailInteractive } from "@/components/student/product-detail-interactive";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, product] = await Promise.all([
    getCurrentProfile(),
    getProductById(id),
  ]);

  if (profile && profile.role !== "ADMIN" && (await isProfileIncomplete(profile))) {
    redirect("/onboarding");
  }

  if (!product || !product.is_active) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductDetailInteractive product={product} profile={profile} />
      </main>
    </div>
  );
}
