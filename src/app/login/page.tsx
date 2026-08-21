"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkAndRegisterFirstTimeUser } from "@/services/profile";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Eye, EyeOff, Lock, Mail, ShieldAlert, Sparkles, KeyRound, AlertTriangle, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const supabase = createClient();
    let cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      cleanEmail = `${cleanEmail}@mail.rmutk.ac.th`;
    }

    try {
      // 1. Direct login attempt
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        if (error.message === "Failed to fetch" || error.message.includes("fetch")) {
          setErrorMsg("ไม่สามารถเชื่อมต่อระบบได้: กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
          toast.error("ไม่สามารถเชื่อมต่อระบบได้");
          setLoading(false);
          return;
        } else if (error.message.includes("Invalid login credentials")) {
          // 2. Check if this is a pre-registered student in profiles attempting first-time login
          const firstTimeCheck = await checkAndRegisterFirstTimeUser(cleanEmail, password);

          if (firstTimeCheck.success) {
            const loginEmail = firstTimeCheck.targetEmail || cleanEmail;
            const { data: secondLoginData, error: secondLoginErr } = await supabase.auth.signInWithPassword({
              email: loginEmail,
              password: password,
            });

            if (!secondLoginErr && secondLoginData?.user) {
              toast.info("ยินดีต้อนรับเข้าสู่ระบบครั้งแรก! กรุณาตรวจสอบข้อมูลและตั้งรหัสผ่านใหม่");
              router.push("/onboarding");
              router.refresh();
              return;
            }
          }

          const errMsg = firstTimeCheck.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบรหัสนักศึกษาและรหัสผ่าน";
          setErrorMsg(errMsg);
          toast.error("เข้าสู่ระบบไม่สำเร็จ");
        } else {
          setErrorMsg(error.message);
          toast.error(error.message);
        }
        setLoading(false);
      } else if (data?.user) {
        // Logged in successfully, check profile completion
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        const cleanPhone = (profile?.phone || "").replace(/[^0-9]/g, "");
        const isPhoneValid = cleanPhone.length === 10;
        const isNicknameValid = profile?.nickname && profile.nickname.trim() !== "" && profile.nickname !== "-";
        const isNameValid = profile?.first_name && profile.first_name.trim() !== "" && profile.last_name && profile.last_name.trim() !== "";
        const needsOnboarding = !profile || !isPhoneValid || !isNicknameValid || !isNameValid;

        if (needsOnboarding && profile?.role !== "ADMIN") {
          toast.info("กรุณาตรวจสอบข้อมูลส่วนตัวและตั้งรหัสผ่านใหม่");
          router.push("/onboarding");
        } else if (profile?.role === "ADMIN") {
          toast.success("เข้าสู่ระบบแอดมินสำเร็จ!");
          router.push("/admin");
        } else {
          toast.success("เข้าสู่ระบบสำเร็จ!");
          router.push("/");
        }
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Header Logo */}
        <div className="text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 border border-slate-200/80 shadow-md mb-3">
            <img src="/images/logo.png" alt="CPE & IoT Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            สาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            ระบบสั่งซื้อเสื้อกีฬาสาขา
          </p>
        </div>

        {/* Warning if Supabase URL is placeholder */}
        {!isSupabaseConfigured && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs space-y-1 shadow-sm">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>ยังไม่ได้ใส่ค่า Supabase ใน .env.local</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              โปรดระบุ <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">NEXT_PUBLIC_SUPABASE_URL</code> ในไฟล์ .env.local
            </p>
          </div>
        )}

        {/* Login Card */}
        <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center font-bold text-slate-900">
              เข้าสู่ระบบ
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl leading-relaxed animate-in fade-in flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  อีเมลนักศึกษา หรือ รหัสนักศึกษา *
                </label>
                <Input
                  type="text"
                  placeholder="เช่น 66504190106-7@mail.rmutk.ac.th"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl text-xs h-11"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  รหัสผ่าน *
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="กรอกรหัสผ่านของคุณ"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10 rounded-xl text-xs h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20"
                isLoading={loading}
              >
                เข้าสู่ระบบ
              </Button>
            </form>

            {/* First-time login tips */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500 bg-slate-50 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 font-bold text-blue-600">
                <KeyRound className="h-4 w-4" />
                <span>คำแนะนำการเข้าสู่ระบบครั้งแรก:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                <li>ใช้อีเมลมหาวิทยาลัย <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">@mail.rmutk.ac.th</code> ที่ลงทะเบียนไว้</li>
                <li>รหัสผ่านเริ่มต้นคือ <strong>รหัสนักศึกษา</strong> ของคุณ (เช่น 69444453217-9)</li>
                <li>เมื่อเข้าสู่ระบบครั้งแรก ระบบจะให้ตั้งรหัสผ่านใหม่เพื่อความปลอดภัย</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-400">
          สาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT © {new Date().getFullYear()}
        </p>

      </div>
    </div>
  );
}
