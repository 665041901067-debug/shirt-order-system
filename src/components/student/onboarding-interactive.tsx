"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { saveProfileOnboarding } from "@/services/profile";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Sparkles, Eye, EyeOff, Lock, AlertCircle, Save } from "lucide-react";

interface Props {
  initialProfile: Profile | null;
}

export function OnboardingInteractive({ initialProfile }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [formData, setFormData] = useState({
    first_name: initialProfile?.first_name || "",
    last_name: initialProfile?.last_name || "",
    nickname: initialProfile?.nickname || "",
    student_id: initialProfile?.student_id || "",
    phone: initialProfile?.phone || "",
    academic_year: initialProfile?.academic_year || "ปี 1",
    major: initialProfile?.major || "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
  });

  // Optional new password state
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

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
      const res = await saveProfileOnboarding({
        ...formData,
        phone: cleanPhone,
        new_password: newPassword.trim() ? newPassword : undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        toast.error(res.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        setLoading(false);
      } else {
        toast.success("บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว!");
        window.location.href = initialProfile?.role === "ADMIN" ? "/admin" : "/";
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "ไม่สามารถเชื่อมต่อบันทึกข้อมูลได้");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 mb-3 shadow-xs">
            <UserCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            กรอกข้อมูลส่วนตัวนักศึกษา
          </h1>
        </div>

        <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <span>ข้อมูลสำหรับระบบสั่งซื้อเสื้อกีฬา</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ชื่อเล่น *</label>
                  <Input
                    name="nickname"
                    placeholder="เช่น บอล, โดม, นนท์"
                    value={formData.nickname}
                    onChange={handleChange}
                    required
                    className="rounded-xl text-xs h-11"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    เบอร์โทรศัพท์ติดต่อ (10 หลัก) *
                  </label>
                  <Input
                    name="phone"
                    placeholder="0812345678"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    maxLength={10}
                    className="rounded-xl text-xs h-11 font-mono"
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

              {/* Optional: Password Setting */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <span>ตั้งรหัสผ่านใหม่ (ไม่บังคับ)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">รหัสผ่านใหม่</label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="อย่างน้อย 6 ตัวอักษร"
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
                    <label className="text-[11px] font-semibold text-slate-600">ยืนยันรหัสผ่าน</label>
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
              </div>

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

      </div>
    </div>
  );
}
