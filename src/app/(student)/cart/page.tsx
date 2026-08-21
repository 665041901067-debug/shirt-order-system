import React from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile, isProfileIncomplete } from "@/services/profile";
import { getUserCart } from "@/services/cart";
import { Header } from "@/components/shared/header";
import { CartViewInteractive } from "@/components/student/cart-view-interactive";

export default async function CartPage() {
  const [profile, cart] = await Promise.all([
    getCurrentProfile(),
    getUserCart(),
  ]);

  if (profile && profile.role !== "ADMIN" && (await isProfileIncomplete(profile))) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} cartCount={cart?.items?.length || 0} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CartViewInteractive initialCart={cart} />
      </main>
    </div>
  );
}
