/**
 * Helper to translate all Supabase, Postgres, Auth, and Network error messages into clear, friendly Thai
 */
export function translateThaiError(error: any): string {
  if (!error) return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง";

  const msg = typeof error === "string" ? error : error?.message || error?.error_description || String(error);
  const lower = msg.toLowerCase();

  // 1. Next.js Server Action / Network Errors
  if (lower.includes("unexpected response") || lower.includes("server error") || lower.includes("internal server error")) {
    return "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองบันทึกใหม่อีกครั้ง";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network error") || lower.includes("load failed")) {
    return "ไม่สามารถเชื่อมต่ออินเทอร์เน็ตหรือเซิร์ฟเวอร์ได้ กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตของคุณ";
  }

  // 2. Auth Credentials & Password Errors
  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials") || lower.includes("invalid username or password")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบรหัสนักศึกษาและรหัสผ่านของคุณ";
  }
  if (lower.includes("password should be at least") || lower.includes("weak_password") || lower.includes("password is too short")) {
    return "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร";
  }
  if (lower.includes("different from the old password") || lower.includes("same_password")) {
    return "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม";
  }
  if (lower.includes("email not confirmed") || lower.includes("unconfirmed_email")) {
    return "อีเมลยังไม่ได้รับการยืนยัน กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งาน";
  }
  if (lower.includes("user already registered") || lower.includes("email already in use") || lower.includes("already registered")) {
    return "อีเมลหรือผู้ใช้นี้ได้ลงทะเบียนในระบบแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านของคุณ";
  }
  if (lower.includes("session missing") || lower.includes("jwt expired") || lower.includes("user not found") || lower.includes("token has expired")) {
    return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit") || lower.includes("rate_limit")) {
    return "มีการส่งคำขอเข้าระบบบ่อยเกินไป กรุณารอสักครู่ (ประมาณ 1 นาที) แล้วลองใหม่อีกครั้ง";
  }

  // 3. Database & Profile Constraints
  if (lower.includes("profiles_student_id_key") || (lower.includes("student_id") && lower.includes("unique"))) {
    return "รหัสนักศึกษานี้มีผู้ใช้งานในระบบแล้ว กรุณาตรวจสอบความถูกต้องของรหัสนักศึกษา";
  }
  if (lower.includes("profiles_email_key") || (lower.includes("email") && lower.includes("unique"))) {
    return "อีเมลนี้มีผู้ใช้งานในระบบแล้ว";
  }
  if (lower.includes("duplicate key") || lower.includes("unique constraint")) {
    return "ข้อมูลนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบข้อมูลที่กรอก";
  }
  if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("not authorized")) {
    return "ไม่มีสิทธิ์เข้าถึงหรือแก้ไขข้อมูลนี้ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
  }

  // 4. Default fallback with clean Thai message
  return msg || "เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่อีกครั้ง";
}
