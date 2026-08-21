"use server";

import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile) {
    return {
      ...profile,
      email: user.email,
    } as Profile;
  }

  return null;
}

export async function saveProfileOnboarding(input: {
  first_name: string;
  last_name: string;
  nickname: string;
  student_id: string;
  phone: string;
  academic_year: string;
  major?: string;
  new_password?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "ไม่พบข้อมูลผู้ใช้งานที่เข้าสู่ระบบ" };
  }

  // Validate phone number: strictly 10 digits
  const cleanPhone = input.phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length !== 10) {
    return { success: false, error: "เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 10 หลักเท่านั้น (เช่น 0812345678)" };
  }

  // Validate password if provided
  if (input.new_password && input.new_password.trim().length > 0) {
    const pw = input.new_password;
    if (/[ก-๙]/.test(pw)) {
      return { success: false, error: "รหัสผ่านต้องไม่ใช้อักษรภาษาไทย กรุณาใช้ตัวอักษรภาษาอังกฤษ ตัวเลข หรือสัญลักษณ์พิเศษ" };
    }
    if (pw.length < 6) {
      return { success: false, error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" };
    }

    // Update password in Supabase Auth
    const { error: pwError } = await supabase.auth.updateUser({
      password: pw,
    });

    if (pwError) {
      return { success: false, error: `ไม่สามารถเปลี่ยนรหัสผ่านได้: ${pwError.message}` };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      nickname: input.nickname.trim(),
      student_id: input.student_id.trim(),
      phone: cleanPhone,
      academic_year: input.academic_year,
      major: input.major || "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function changeUserPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  if (!newPassword || newPassword.trim().length < 6) {
    return { success: false, error: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" };
  }

  if (/[ก-๙]/.test(newPassword)) {
    return { success: false, error: "รหัสผ่านต้องไม่ใช้อักษรภาษาไทย กรุณาใช้ภาษาอังกฤษ ตัวเลข หรือสัญลักษณ์" };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
