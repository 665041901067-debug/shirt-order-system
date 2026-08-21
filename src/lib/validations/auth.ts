import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("กรุณากรอกอีเมลให้ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
});

export const onboardingSchema = z.object({
  first_name: z.string().min(1, "กรุณากรอกชื่อจริง"),
  last_name: z.string().min(1, "กรุณากรอกนามสกุล"),
  nickname: z.string().min(1, "กรุณากรอกชื่อเล่น"),
  student_id: z.string().regex(/^\d{8,11}$/, "รหัสนักศึกษาต้องเป็นตัวเลข 8-11 หลัก"),
  phone: z.string().regex(/^0\d{8,9}$/, "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (เช่น 0812345678)"),
  academic_year: z.string().min(1, "กรุณาเลือกชั้นปี"),
  major: z.string().default("วิศวกรรมคอมพิวเตอร์และระบบ IoT"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
