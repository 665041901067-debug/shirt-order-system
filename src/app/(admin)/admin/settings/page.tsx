import React from "react";
import { getCurrentProfile } from "@/services/profile";
import { Header } from "@/components/shared/header";
import { AdminSettingsInteractive } from "@/components/admin/settings-interactive";

export default async function AdminSettingsPage() {
  const profile = await getCurrentProfile();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const hasServiceRoleKey = Boolean(
    serviceKey && !serviceKey.includes("<") && serviceKey.length > 20
  );
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminSettingsInteractive
          profile={profile}
          hasServiceRoleKey={hasServiceRoleKey}
          supabaseUrl={supabaseUrl}
        />
      </main>
    </div>
  );
}
