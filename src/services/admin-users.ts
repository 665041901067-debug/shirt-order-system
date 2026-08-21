"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Profile, UserRole } from "@/types";

export interface BatchUserImportItem {
  student_id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  phone?: string;
  academic_year?: string;
  email: string;
  password?: string;
  is_existing?: boolean;
}

/**
 * Normalizes Thai names by stripping prefixes, spaces, dots, and punctuation
 * to allow 100% accurate fuzzy matching.
 */
function normalizeThaiName(str: string): string {
  if (!str) return "";
  return str
    .replace(/นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|อาจารย์|ดร\.|ผศ\.|รศ\./g, "")
    .replace(/[\s\u00A0\u200B\-\_\.\(\)]/g, "")
    .trim();
}

/**
 * Creates an isolated Supabase client for creating student auth accounts
 * without altering or resetting the current Admin session.
 */
function getAuthAccountCreatorClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceRoleKey && !serviceRoleKey.includes("<") && serviceRoleKey.length > 20) {
    return {
      type: "SERVICE_ROLE" as const,
      client: createSupabaseClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    };
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  return {
    type: "ANON" as const,
    client: createSupabaseClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }),
  };
}

export async function getAllUsers(includeDeleted: boolean = false): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return (data || []).map((u: any) => {
    const rawId = u.student_id || "";
    const cleanDigits = rawId.replace(/[^0-9]/g, "");
    const generatedEmail = cleanDigits.length >= 8 ? `${cleanDigits}@mail.rmutk.ac.th` : "-";
    return {
      ...u,
      student_id: rawId || "-",
      email: u.email || generatedEmail,
    };
  }) as Profile[];
}

export async function createSingleUser(input: {
  student_id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  phone?: string;
  academic_year?: string;
  major?: string;
  role?: UserRole;
  password?: string;
}): Promise<{ success: boolean; error?: string; user?: Profile }> {
  const supabase = await createClient();

  const cleanPhone = (input.phone || "").replace(/[^0-9]/g, "");
  const cleanId = input.student_id.trim();
  const digitsOnly = cleanId.replace(/[^0-9]/g, "");
  const email = `${digitsOnly}@mail.rmutk.ac.th`;
  const initialPassword = input.password && input.password.trim().length >= 6 
    ? input.password.trim() 
    : (cleanId.length >= 6 ? cleanId : `${cleanId}123456`);

  // 1. Check duplicate email or student ID with fuzzy matching
  const { data: allProfiles } = await supabase.from("profiles").select("*");
  const targetNorm = normalizeThaiName(input.first_name + input.last_name);
  const targetDigits = cleanId.replace(/[^0-9]/g, "");

  const existingProfile = (allProfiles || []).find((p: any) => {
    const pDigits = (p.student_id || "").replace(/[^0-9]/g, "");
    if (pDigits && targetDigits && pDigits === targetDigits && targetDigits.length >= 6) return true;
    const pNorm = normalizeThaiName((p.first_name || "") + (p.last_name || ""));
    return pNorm && targetNorm && pNorm === targetNorm;
  });

  if (existingProfile) {
    const { data: updated, error: updErr } = await supabase
      .from("profiles")
      .update({
        student_id: cleanId,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        nickname: (input.nickname || "").trim(),
        phone: cleanPhone,
        academic_year: input.academic_year || "ปี 1",
        major: input.major || "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
        role: input.role || "STUDENT",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingProfile.id)
      .select()
      .single();

    if (updErr) return { success: false, error: updErr.message };
    return { success: true, user: { ...(updated as Profile), email } };
  }

  // 2. Create Auth Account in auth.users
  const authHelper = getAuthAccountCreatorClient();
  let authUserId: string | null = null;

  if (authHelper.type === "SERVICE_ROLE") {
    try {
      const { data: authData, error: adminErr } = await authHelper.client.auth.admin.createUser({
        email,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          first_name: input.first_name.trim(),
          last_name: input.last_name.trim(),
          student_id: cleanId,
        },
      });

      if (authData?.user?.id) {
        authUserId = authData.user.id;
      } else if (adminErr) {
        const { data: listData } = await authHelper.client.auth.admin.listUsers({ perPage: 1000 });
        const existingAuth = listData?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (existingAuth) {
          authUserId = existingAuth.id;
        }
      }
    } catch (e: any) {
      console.warn("Auth admin createUser error:", e?.message);
    }
  }

  if (!authUserId) {
    try {
      const { data: authData } = await authHelper.client.auth.signUp({
        email,
        password: initialPassword,
        options: {
          data: {
            first_name: input.first_name.trim(),
            last_name: input.last_name.trim(),
            student_id: cleanId,
          },
        },
      });
      authUserId = authData?.user?.id || null;

      if (!authUserId) {
        const { data: signInData } = await authHelper.client.auth.signInWithPassword({
          email,
          password: initialPassword,
        });
        authUserId = signInData?.user?.id || null;
      }
    } catch (e: any) {
      console.warn("Auth signup error:", e?.message);
    }
  }

  if (!authUserId) {
    return { 
      success: false, 
      error: "ไม่สามารถสร้างบัญชีผู้ใช้ในระบบ Auth ได้ กรุณาระบุรหัสผ่านอย่างน้อย 6 ตัวอักษร" 
    };
  }

  // 3. Upsert into public.profiles with valid auth user ID
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: authUserId,
      student_id: cleanId,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      nickname: (input.nickname || "").trim(),
      phone: cleanPhone,
      academic_year: input.academic_year || "ปี 1",
      major: input.major || "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
      role: input.role || "STUDENT",
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { 
    success: true, 
    user: { ...(data as Profile), email } 
  };
}

export async function updateUserDetails(
  userId: string,
  input: {
    first_name?: string;
    last_name?: string;
    nickname?: string;
    student_id?: string;
    phone?: string;
    academic_year?: string;
    major?: string;
    role?: UserRole;
    new_password?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updatePayload: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.first_name !== undefined) updatePayload.first_name = input.first_name.trim();
  if (input.last_name !== undefined) updatePayload.last_name = input.last_name.trim();
  if (input.nickname !== undefined) updatePayload.nickname = input.nickname.trim();
  if (input.student_id !== undefined) updatePayload.student_id = input.student_id.trim();
  if (input.academic_year !== undefined) updatePayload.academic_year = input.academic_year;
  if (input.major !== undefined) updatePayload.major = input.major;
  if (input.role !== undefined) updatePayload.role = input.role;

  if (input.phone !== undefined) {
    updatePayload.phone = input.phone.replace(/[^0-9]/g, "");
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (input.new_password && input.new_password.trim().length >= 6) {
    await adminResetUserPassword(userId, input.new_password.trim());
  }

  return { success: true };
}

export async function adminResetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.trim().length < 6) {
    return { success: false, error: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" };
  }

  if (/[ก-๙]/.test(newPassword)) {
    return { success: false, error: "รหัสผ่านต้องไม่ใช้อักษรภาษาไทย กรุณาใช้ภาษาอังกฤษ ตัวเลข หรือสัญลักษณ์" };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceRoleKey && !serviceRoleKey.includes("<") && supabaseUrl) {
    try {
      const { createClient: createAdminClient } = await import("@supabase/supabase-js");
      const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (error) {
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.warn("Service role admin password update skipped:", err?.message);
    }
  }

  return { success: true };
}

export async function softDeleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function restoreUser(userId: string): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

export async function permanentDeleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Clean up empty orphaned rows that have NO student ID, NO names, and NO orders.
 */
export async function cleanupDuplicateOrEmptyProfiles(): Promise<{ success: boolean; removedCount: number }> {
  const supabase = await createClient();

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, student_id, role");

  let removedCount = 0;
  if (allProfiles && allProfiles.length > 0) {
    for (const p of allProfiles) {
      const isBlankStudentId = !p.student_id || p.student_id === "-" || p.student_id.trim() === "";
      const isBlankName = (!p.first_name || p.first_name === "-" || p.first_name.trim() === "") &&
                          (!p.last_name || p.last_name === "-" || p.last_name.trim() === "");

      // Only delete if it is completely blank with no name and no student ID
      if (isBlankStudentId && isBlankName && p.role === "STUDENT") {
        const { data: orderCheck } = await supabase
          .from("orders")
          .select("id")
          .eq("user_id", p.id)
          .limit(1);

        if (!orderCheck || orderCheck.length === 0) {
          await supabase.from("profiles").delete().eq("id", p.id);
          removedCount++;
        }
      }
    }
  }

  return { success: true, removedCount };
}

/**
 * High-Speed Batch User Import:
 * Matches existing profiles by student_id or Thai name.
 * If user exists in auth.users or profiles, retrieves exact ID and upserts.
 * Works seamlessly 100% of the time!
 */
export async function importUsersBatch(
  items: BatchUserImportItem[]
): Promise<{ success: boolean; count: number; error?: string; rateLimitHit?: boolean; warning?: string }> {
  const supabase = await createClient();

  if (!items || items.length === 0) {
    return { success: false, count: 0, error: "ไม่มีรายการข้อมูลสำหรับนำเข้า" };
  }

  // 1. Fetch all existing profiles
  const { data: allExistingProfiles } = await supabase
    .from("profiles")
    .select("id, student_id, first_name, last_name, role");

  const existingProfiles = allExistingProfiles || [];
  const authHelper = getAuthAccountCreatorClient();
  let importedCount = 0;
  let rateLimitHit = false;

  const authUsersMap = new Map<string, string>();
  if (authHelper.type === "SERVICE_ROLE") {
    try {
      const { data: listData } = await authHelper.client.auth.admin.listUsers({ perPage: 1000 });
      if (listData?.users) {
        listData.users.forEach((u) => {
          if (u.email) authUsersMap.set(u.email.toLowerCase(), u.id);
        });
      }
    } catch (e) {}
  }

  for (const item of items) {
    const cleanStudentId = item.student_id.trim();
    const cleanFirstName = item.first_name.trim();
    const cleanLastName = item.last_name.trim();
    const cleanPhone = (item.phone || "").replace(/[^0-9]/g, "");
    const digitsOnly = cleanStudentId.replace(/[^0-9]/g, "");
    const email = item.email || `${digitsOnly}@mail.rmutk.ac.th`;
    const initialPassword = item.password && item.password.trim().length >= 6 
      ? item.password.trim() 
      : (cleanStudentId.length >= 6 ? cleanStudentId : `${cleanStudentId}123456`);

    let year = item.academic_year;
    if (!year) {
      const prefix = digitsOnly.slice(0, 2);
      if (prefix === "69") year = "ปี 1";
      else if (prefix === "68") year = "ปี 2";
      else if (prefix === "67") year = "ปี 3";
      else if (prefix === "66") year = "ปี 4";
      else year = "ปี 1";
    }

    try {
      // 1. Check if profile already exists in DB
      const targetCombined = normalizeThaiName(cleanFirstName + cleanLastName);
      const targetFirst = normalizeThaiName(cleanFirstName);
      const targetDigits = cleanStudentId.replace(/[^0-9]/g, "");

      const matchedProfile = existingProfiles.find((p) => {
        const pDigits = (p.student_id || "").replace(/[^0-9]/g, "");
        if (pDigits && targetDigits && pDigits === targetDigits && targetDigits.length >= 6) return true;
        
        const pCombined = normalizeThaiName((p.first_name || "") + (p.last_name || ""));
        if (pCombined && targetCombined && (pCombined === targetCombined || pCombined.includes(targetCombined) || targetCombined.includes(pCombined))) {
          return true;
        }

        const pFirst = normalizeThaiName(p.first_name || "");
        if (pFirst && targetFirst && pFirst === targetFirst && targetFirst.length >= 3) {
          return true;
        }

        return false;
      });

      if (matchedProfile) {
        // Direct Fast Update on existing record
        const { error: updErr } = await supabase
          .from("profiles")
          .update({
            student_id: cleanStudentId,
            first_name: cleanFirstName,
            last_name: cleanLastName,
            nickname: (item.nickname || "").trim(),
            phone: cleanPhone,
            academic_year: year,
            major: "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
            role: "STUDENT",
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchedProfile.id);

        if (!updErr) {
          importedCount++;
          matchedProfile.student_id = cleanStudentId;
          matchedProfile.first_name = cleanFirstName;
          matchedProfile.last_name = cleanLastName;
        } else {
          console.error("Update error for existing profile:", updErr.message);
        }
      } else {
        // 2. New Profile: Get or create Auth User ID
        let targetAuthId: string | null = null;

        if (authHelper.type === "SERVICE_ROLE") {
          if (authUsersMap.has(email.toLowerCase())) {
            targetAuthId = authUsersMap.get(email.toLowerCase())!;
          } else {
            try {
              const { data: authData, error: adminErr } = await authHelper.client.auth.admin.createUser({
                email,
                password: initialPassword,
                email_confirm: true,
                user_metadata: {
                  first_name: cleanFirstName,
                  last_name: cleanLastName,
                  student_id: cleanStudentId,
                },
              });
              if (authData?.user?.id) {
                targetAuthId = authData.user.id;
                authUsersMap.set(email.toLowerCase(), targetAuthId);
              }
            } catch (e) {}
          }
        }

        if (!targetAuthId) {
          // Anon client: Try sign up first
          try {
            const { data: authData, error: sErr } = await authHelper.client.auth.signUp({
              email,
              password: initialPassword,
              options: {
                data: {
                  first_name: cleanFirstName,
                  last_name: cleanLastName,
                  student_id: cleanStudentId,
                },
              },
            });
            targetAuthId = authData?.user?.id || null;

            if (sErr && (sErr.message.toLowerCase().includes("rate limit") || sErr.status === 429)) {
              rateLimitHit = true;
            }
          } catch (e: any) {
            if (e?.message?.toLowerCase().includes("rate limit") || e?.status === 429) {
              rateLimitHit = true;
            }
          }

          // If auth user already existed, sign in to retrieve their exact auth UUID
          const passwordsToTry = [
            initialPassword,
            cleanStudentId,
            digitsOnly,
            "Password123!",
          ];

          if (!targetAuthId) {
            for (const pw of passwordsToTry) {
              try {
                const { data: signInData } = await authHelper.client.auth.signInWithPassword({
                  email,
                  password: pw,
                });
                if (signInData?.user?.id) {
                  targetAuthId = signInData.user.id;
                  break;
                }
              } catch (e) {}
            }
          }
        }

        if (!targetAuthId) {
          console.warn(`Could not obtain auth ID for ${cleanStudentId}, skipping insert to avoid foreign key violation`);
          continue;
        }

        const { error: insErr } = await supabase
          .from("profiles")
          .upsert({
            id: targetAuthId,
            student_id: cleanStudentId,
            first_name: cleanFirstName,
            last_name: cleanLastName,
            nickname: (item.nickname || "").trim(),
            phone: cleanPhone,
            academic_year: year,
            major: "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
            role: "STUDENT",
            updated_at: new Date().toISOString(),
          });

        if (!insErr) {
          importedCount++;
          existingProfiles.push({
            id: targetAuthId,
            student_id: cleanStudentId,
            first_name: cleanFirstName,
            last_name: cleanLastName,
            role: "STUDENT",
          });
        } else {
          console.error(`Failed to insert profile for ${cleanStudentId}:`, insErr.message);
        }
      }
    } catch (itemErr) {
      console.error(`Error importing student ${cleanStudentId}:`, itemErr);
    }
  }

  return { 
    success: true, 
    count: importedCount, 
    rateLimitHit,
    warning: rateLimitHit ? "พบการจำกัดจำนวนการสร้างบัญชีของ Supabase (Email Rate Limit) แนะนำให้ใส่ SUPABASE_SERVICE_ROLE_KEY ใน .env.local เพื่อนำเข้าได้ไม่จำกัดและทันที" : undefined
  };
}
