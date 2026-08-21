import React from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/services/profile";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "ADMIN") {
    redirect("/");
  }

  return <>{children}</>;
}
