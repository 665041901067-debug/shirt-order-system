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

        {/* Social Media & Contact Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 justify-center">
            <span className="h-px bg-slate-200 flex-1 max-w-[60px]" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              ช่องทางติดต่อ & ติดตามสาขา
            </span>
            <span className="h-px bg-slate-200 flex-1 max-w-[60px]" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Facebook */}
            <a
              href="https://www.facebook.com/COMENRMUTK/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-500 hover:bg-blue-50/60 hover:text-blue-600 text-slate-700 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 group"
            >
              <svg className="h-4 w-4 fill-[#1877F2] group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Facebook</span>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/comeng_rmutk/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-pink-500 hover:bg-pink-50/60 hover:text-pink-600 text-slate-700 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 group"
            >
              <svg className="h-4 w-4 fill-[#E4405F] group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>Instagram</span>
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@comeng_rmutk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-800 hover:bg-slate-900 hover:text-white text-slate-700 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 group"
            >
              <svg className="h-4 w-4 fill-current group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.46V13.2a8.16 8.16 0 0 0 5.73 2.29V12a4.84 4.84 0 0 1-3.77-1.63 4.84 4.84 0 0 1-.63-3.68h4.4z"/>
              </svg>
              <span>TikTok</span>
            </a>

            {/* Email */}
            <a
              href="mailto:comen.rmutk@gmail.com"
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-red-500 hover:bg-red-50/60 hover:text-red-600 text-slate-700 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 group"
              title="comen.rmutk@gmail.com"
            >
              <Mail className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform shrink-0" />
              <span>Email</span>
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-400">
          สาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT © {new Date().getFullYear()}
        </p>

      </div>
    </div>
  );
}
