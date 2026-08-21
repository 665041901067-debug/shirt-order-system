import React from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile, isProfileIncomplete } from "@/services/profile";
import { getUserCart } from "@/services/cart";
import { getActivePaymentMethods } from "@/services/payments";
import { Header } from "@/components/shared/header";
import { CheckoutInteractive } from "@/components/student/checkout-interactive";

export default async function CheckoutPage() {
  const [profile, cart, paymentMethods] = await Promise.all([
    getCurrentProfile(),
    getUserCart(),
    getActivePaymentMethods(),
  ]);

  if (profile && profile.role !== "ADMIN" && (await isProfileIncomplete(profile))) {
    redirect("/onboarding");
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    redirect("/cart");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} cartCount={cart.items.length} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CheckoutInteractive
          profile={profile}
          cart={cart}
          paymentMethods={paymentMethods}
        />
      </main>
    </div>
  );
}
