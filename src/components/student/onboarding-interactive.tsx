"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types";
import { saveProfileOnboarding } from "@/services/profile";
import { translateThaiError } from "@/lib/thai-errors";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  UserCheck, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Lock, 
  AlertCircle, 
  Save, 
  KeyRound, 
  ShieldCheck,
  CheckCircle2,
  LogOut
} from "lucide-react";

interface Props {
  initialProfile: Profile | null;
}

export function OnboardingInteractive({ initialProfile }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [formData, setFormData] = useState({
    first_name: initialProfile?.first_name || "",
    last_name: initialProfile?.last_name || "",
    nickname: initialProfile?.nickname && initialProfile.nickname !== "-" ? initialProfile.nickname : "",
    student_id: initialProfile?.student_id || "",
    phone: initialProfile?.phone && initialProfile.phone !== "-" ? initialProfile.phone : "",
    academic_year: initialProfile?.academic_year || "ปี 1",
    major: initialProfile?.major || "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
  });

  // New password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const digitsOnly = value.replace(/[^0-9]/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const isPasswordMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordEntered = newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.first_name.trim()) {
      setErrorMsg("กรุณากรอกชื่อจริง");
      toast.error("กรุณากรอกชื่อจริง");
      return;
    }

    if (!formData.last_name.trim()) {
      setErrorMsg("กรุณากรอกนามสกุล");
      toast.error("กรุณากรอกนามสกุล");
      return;
    }

    if (!formData.nickname.trim()) {
      setErrorMsg("กรุณากรอกชื่อเล่น (สำหรับใช้เรียกและประสานงานแจกเสื้อ)");
      toast.error("กรุณากรอกชื่อเล่น");
      return;
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      setErrorMsg("เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 10 หลักเท่านั้น (เช่น 0812345678)");
      toast.error("เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 10 หลักเท่านั้น");
      return;
    }

    if (newPassword.trim().length > 0) {
      if (/[ก-๙]/.test(newPassword)) {
        setErrorMsg("รหัสผ่านต้องไม่ใช้อักษรภาษาไทย กรุณาใช้ตัวอักษรภาษาอังกฤษ ตัวเลข หรือสัญลักษณ์พิเศษ");
        toast.error("รหัสผ่านต้องไม่ใช้อักษรภาษาไทย");
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        toast.error("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
        toast.error("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
        return;
      }
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user }, error: userErr } = await supabase.auth.getUser();

      if (user && !userErr) {
        // 1. Update password in Supabase Auth if provided
        if (newPassword.trim().length > 0) {
          const { error: pwErr } = await supabase.auth.updateUser({
            password: newPassword.trim(),
          });
          if (pwErr) {
            const thaiErr = translateThaiError(pwErr);
            setErrorMsg(thaiErr);
            toast.error(thaiErr);
            setLoading(false);
            return;
          }
        }

        // 2. Update profiles in Supabase table
        const profilePayload = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          nickname: formData.nickname.trim(),
          student_id: formData.student_id.trim(),
          phone: cleanPhone,
          academic_year: formData.academic_year,
          major: formData.major || "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from("profiles")
          .update(profilePayload)
          .eq("id", user.id);

        if (updateErr) {
          const { error: upsertErr } = await supabase
            .from("profiles")
            .upsert({ id: user.id, ...profilePayload });

          if (upsertErr) {
            const thaiErr = translateThaiError(upsertErr);
            setErrorMsg(thaiErr);
            toast.error(thaiErr);
            setLoading(false);
            return;
          }
        }

        toast.success("บันทึกข้อมูลส่วนตัวและรหัสผ่านเรียบร้อยแล้ว!");
        window.location.href = initialProfile?.role === "ADMIN" ? "/admin" : "/";
        return;
      }

      // Fallback to Server Action if client session missing
      const res = await saveProfileOnboarding({
        ...formData,
        phone: cleanPhone,
        new_password: newPassword.trim() ? newPassword : undefined,
      });

      if (!res.success) {
        const thaiErr = translateThaiError(res.error);
        setErrorMsg(thaiErr);
        toast.error(thaiErr);
        setLoading(false);
      } else {
        toast.success("บันทึกข้อมูลส่วนตัวและรหัสผ่านเรียบร้อยแล้ว!");
        window.location.href = initialProfile?.role === "ADMIN" ? "/admin" : "/";
      }
    } catch (err: any) {
      const thaiErr = translateThaiError(err);
      setErrorMsg(thaiErr);
      toast.error(thaiErr);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.info("ออกจากระบบเรียบร้อยแล้ว");
      window.location.href = "/login";
    } catch (e) {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12 relative">
      {/* Top Floating Logout Button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="rounded-xl border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 px-3.5 py-2"
        >
          <LogOut className="h-4 w-4" />
          <span>ออกจากระบบ</span>
        </Button>
      </div>

      <div className="w-full max-w-lg space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 border border-blue-200/60 shadow-sm">
            <UserCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            ยินดีต้อนรับเข้าสู่ระบบครั้งแรก 🎉
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            กรุณาตรวจสอบข้อมูลส่วนตัวและตั้งรหัสผ่านใหม่ของคุณ เพื่อความปลอดภัยในการใช้งานระบบ
          </p>
        </div>

        <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <span>ข้อมูลนักศึกษาและรหัสผ่านเข้าใช้งาน</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl leading-relaxed flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* 1. Name & Surname */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ชื่อจริง *</label>
                  <Input
                    name="first_name"
                    placeholder="เช่น สมชาย"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className="rounded-xl text-xs h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">นามสกุล *</label>
                  <Input
                    name="last_name"
                    placeholder="เช่น ใจดี"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    className="rounded-xl text-xs h-11"
                  />
                </div>
              </div>

              {/* 2. Nickname & Student ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>ชื่อเล่น *</span>
                    <span className="text-[10px] text-blue-600 font-normal">(จำเป็นสำหรับคนแจกเสื้อ)</span>
                  </label>
                  <Input
                    name="nickname"
                    placeholder="เช่น บอล, นนท์, มายด์"
                    value={formData.nickname}
                    onChange={handleChange}
                    required
                    className="rounded-xl text-xs h-11 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">รหัสนักศึกษา *</label>
                  <Input
                    name="student_id"
                    placeholder="เช่น 66504190106-7"
                    value={formData.student_id}
                    onChange={handleChange}
                    required
                    className="rounded-xl text-xs h-11 font-mono"
                  />
                </div>
              </div>

              {/* 3. Phone & Academic Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>เบอร์โทรศัพท์มือถือ *</span>
                    <span className="text-[10px] text-slate-400 font-normal">10 หลัก</span>
                  </label>
                  <Input
                    name="phone"
                    placeholder="0812345678"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    maxLength={10}
                    className="rounded-xl text-xs h-11 font-mono font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ชั้นปี *</label>
                  <select
                    name="academic_year"
                    value={formData.academic_year}
                    onChange={handleChange}
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ปี 1">ชั้นปีที่ 1</option>
                    <option value="ปี 2">ชั้นปีที่ 2</option>
                    <option value="ปี 3">ชั้นปีที่ 3</option>
                    <option value="ปี 4">ชั้นปีที่ 4</option>
                    <option value="ศิษย์เก่า">ศิษย์เก่า</option>
                    <option value="อาจารย์/บุคลากร">อาจารย์ / บุคลากร</option>
                  </select>
                </div>
              </div>

              {/* 4. SET NEW PASSWORD SECTION */}
              <div className="p-4 sm:p-5 bg-linear-to-br from-blue-50/70 to-slate-50 border border-blue-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">
                      ตั้งรหัสผ่านใหม่ของคุณ (Set New Password)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      ตั้งรหัสผ่านใหม่เพื่อใช้เข้าสู่ระบบในครั้งถัดไปแทนรหัสผ่านเริ่มต้น
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)
                    </label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="กรอกรหัสผ่านใหม่"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-10 rounded-xl text-xs h-10 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      ยืนยันรหัสผ่านใหม่อีกครั้ง
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="พิมพ์ซ้ำอีกครั้ง"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pr-10 rounded-xl text-xs h-10 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {isPasswordEntered && (
                  <div className="text-[11px] pt-1">
                    {isPasswordMatching ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        รหัสผ่านตรงกันเรียบร้อย
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">
                        * รหัสผ่านใหม่และการยืนยันยังไม่ตรงกัน
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  isLoading={loading}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  <span>บันทึกข้อมูลและเข้าสู่ระบบ</span>
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

        {/* Bottom Alternative Logout Option */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors inline-flex items-center gap-1.5 p-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>ต้องการสลับบัญชีหรือออกจากระบบ? คลิกที่นี่</span>
          </button>
        </div>

      </div>
    </div>
  );
}
