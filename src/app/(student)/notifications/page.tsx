import React from "react";
import { getCurrentProfile } from "@/services/profile";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/header";
import { NotificationsInteractive } from "@/components/student/notifications-interactive";
import { Notification } from "@/types";

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (profile) {
    query = query.eq("user_id", profile.id);
  }

  const { data: notifications } = await query;
  const list = (notifications || []) as Notification[];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} unreadNotifications={list.filter((n) => !n.read).length} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NotificationsInteractive 
          initialNotifications={list} 
          userId={profile?.id} 
        />
      </main>
    </div>
  );
}
