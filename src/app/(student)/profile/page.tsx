import React from "react";
import { getCurrentProfile } from "@/services/profile";
import { Header } from "@/components/shared/header";
import { ProfileInteractive } from "@/components/student/profile-interactive";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProfileInteractive initialProfile={profile} />
      </main>
    </div>
  );
}
