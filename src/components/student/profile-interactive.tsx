"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { saveProfileOnboarding, changeUserPassword } from "@/services/profile";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  User, 
  Phone, 
  IdCard, 
  GraduationCap, 
  Edit, 
  ShieldCheck, 
  Lock, 
  Save, 
  Eye, 
  EyeOff, 
  AlertCircle,
  KeyRound,
  Mail
} from "lucide-react";

interface Props {
  initialProfile: Profile | null;
}

export function ProfileInteractive({ initialProfile }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Edit form state (Pre-filled with old/current data)
  const [formData, setFormData] = useState({
    first_name: initialProfile?.first_name || "",
    last_name: initialProfile?.last_name || "",
    nickname: initialProfile?.nickname || "",
    student_id: initialProfile?.student_id || "",
    phone: initialProfile?.phone || "",
    academic_year: initialProfile?.academic_year || "ปี 1",
    major: initialProfile?.major || "วิศวกรรมคอมพิวเตอร์และระบบ IoT",
  });

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const digitsOnly = value.replace(/[^0-9]/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanPhone = formData.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      setErrorMsg("เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 10 หลักเท่านั้น (เช่น 0812345678)");
      toast.error("เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 10 หลักเท่านั้น");
      return;
    }

    setLoading(true);

    const res = await saveProfileOnboarding({
      ...formData,
      phone: cleanPhone,
    });

    setLoading(false);

    if (res.success) {
      setProfile((prev) => prev ? { ...prev, ...formData, phone: cleanPhone } : null);
      setIsEditing(false);
      toast.success("อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว!");
      router.refresh();
    } else {
      setErrorMsg(res.error || "ไม่สามารถบันทึกข้อมูลได้");
      toast.error(res.error || "ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      toast.error("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (/[ก-๙]/.test(newPassword)) {
      setPasswordError("รหัสผ่านต้องไม่ใช้อักษรภาษาไทย กรุณาใช้ภาษาอังกฤษ ตัวเลข หรือสัญลักษณ์");
      toast.error("รหัสผ่านต้องไม่ใช้อักษรภาษาไทย");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      toast.error("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setPasswordLoading(true);
    const res = await changeUserPassword(newPassword);
    setPasswordLoading(false);

    if (res.success) {
      toast.success("เปลี่ยนรหัสผ่านใหม่สำเร็จเรียบร้อยแล้ว!");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
    } else {
      setPasswordError(res.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      toast.error(res.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
    }
  };

  const emailDisplay = profile?.email || (profile?.student_id ? `${profile.student_id.replace(/[^0-9]/g, "")}@mail.rmutk.ac.th` : "");

  return (
    <div className="space-y-6">
      
      {/* Header (No subtitle, clean Thai) */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <User className="h-6 w-6 text-blue-600" />
          <span>ข้อมูลส่วนตัว</span>
        </h1>
      </div>

      {/* Main Profile Summary Card */}
      <Card className="border-slate-200 bg-white rounded-3xl shadow-xs overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white text-2xl font-black border border-white/20 shadow-inner">
              {profile?.first_name?.[0] || "U"}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {profile?.first_name} {profile?.last_name} ({profile?.nickname || "ไม่ระบุชื่อเล่น"})
              </h2>
              <p className="text-xs text-blue-200 mt-0.5 font-mono">
                {profile?.student_id || "รหัสนักศึกษา"} • {emailDisplay}
              </p>
            </div>
          </div>

          <Badge variant={profile?.role === "ADMIN" ? "danger" : "secondary"} size="md" className="self-start sm:self-auto">
            {profile?.role === "ADMIN" ? "ผู้ดูแลระบบ" : `นักศึกษา • ${profile?.academic_year || "ปี 1"}`}
          </Badge>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-6">
          
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isEditing ? (
            /* Edit Profile Mode */
            <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="h-4 w-4 text-blue-600" />
                  <span>แก้ไขข้อมูลส่วนตัว</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ชื่อจริง *</label>
                  <Input
                    name="first_name"
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
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0812345678"
                    maxLength={10}
                    required
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

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setErrorMsg("");
                  }}
                  className="rounded-xl text-xs"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  isLoading={loading}
                  className="rounded-xl text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  <span>บันทึกข้อมูล</span>
                </Button>
              </div>
            </form>
          ) : (
            /* View Details Mode */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    <span>ชื่อ - นามสกุล</span>
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    <span>ชื่อเล่น</span>
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {profile?.nickname || "ไม่ระบุ"}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <IdCard className="h-3.5 w-3.5 text-blue-600" />
                    <span>รหัสนักศึกษา</span>
                  </span>
                  <p className="font-bold text-blue-600 text-sm font-mono">
                    {profile?.student_id || "-"}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-600" />
                    <span>อีเมลนักศึกษา</span>
                  </span>
                  <p className="font-bold text-slate-800 text-xs font-mono">
                    {emailDisplay || "-"}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-blue-600" />
                    <span>เบอร์โทรศัพท์ติดต่อ</span>
                  </span>
                  <p className="font-bold text-slate-900 text-sm font-mono">
                    {profile?.phone || "-"}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                    <span>ชั้นปี / สถานะ</span>
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {profile?.academic_year || "ปี 1"}
                  </p>
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setIsEditing(true)}
                  className="rounded-xl text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  <span>แก้ไขข้อมูลส่วนตัว</span>
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Password Management Card */}
      <Card className="border-slate-200 bg-white rounded-3xl shadow-xs overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">เปลี่ยนรหัสผ่านใหม่</h3>
                <p className="text-[11px] text-slate-400">กำหนดรหัสผ่านสำหรับเข้าสู่ระบบในครั้งต่อไป</p>
              </div>
            </div>

            {!isChangingPassword && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChangingPassword(true)}
                className="rounded-xl text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                <Lock className="h-3.5 w-3.5 mr-1" />
                <span>เปลี่ยนรหัสผ่าน</span>
              </Button>
            )}
          </div>

          {isChangingPassword && (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 animate-in fade-in max-w-lg">
              {passwordError && (
                <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">รหัสผ่านใหม่ *</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="อย่างน้อย 6 ตัวอักษร (ห้ามใช้อักษรไทย)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pr-10 rounded-xl text-xs h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ยืนยันรหัสผ่านใหม่อีกครั้ง *</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10 rounded-xl text-xs h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordError("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="rounded-xl text-xs"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  isLoading={passwordLoading}
                  className="rounded-xl text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  <span>บันทึกรหัสผ่านใหม่</span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
