import React from "react";
import { getCurrentProfile } from "@/services/profile";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/header";
import { AdminUsersInteractive } from "@/components/admin/admin-users-interactive";
import { Profile } from "@/types";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const [profile, { data: users }] = await Promise.all([
    getCurrentProfile(),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminUsersInteractive initialUsers={(users || []) as Profile[]} />
      </main>
    </div>
  );
}
