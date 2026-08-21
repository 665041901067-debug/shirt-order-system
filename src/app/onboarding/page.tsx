import React from "react";
import { getCurrentProfile } from "@/services/profile";
import { OnboardingInteractive } from "@/components/student/onboarding-interactive";

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();

  return <OnboardingInteractive initialProfile={profile} />;
}
