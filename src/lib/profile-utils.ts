import { Profile } from "@/types";

/**
 * Checks if a user's profile is complete.
 * All mandatory fields must be filled and phone must be exactly 10 digits.
 */
export function isProfileComplete(profile: Profile | null | undefined): boolean {
  if (!profile) return false;

  const hasFirstName = Boolean(profile.first_name && profile.first_name.trim().length > 0);
  const hasLastName = Boolean(profile.last_name && profile.last_name.trim().length > 0);
  const hasNickname = Boolean(profile.nickname && profile.nickname.trim().length > 0);
  const hasStudentId = Boolean(profile.student_id && profile.student_id.trim().length > 0);
  const hasAcademicYear = Boolean(profile.academic_year && profile.academic_year.trim().length > 0);
  
  // Phone must be exactly 10 digits
  const cleanPhone = (profile.phone || "").replace(/[^0-9]/g, "");
  const hasValidPhone = cleanPhone.length === 10;

  return (
    hasFirstName &&
    hasLastName &&
    hasNickname &&
    hasStudentId &&
    hasAcademicYear &&
    hasValidPhone
  );
}
