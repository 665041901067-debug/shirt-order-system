"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Cpu, ArrowRight, AlertTriangle, Eye, EyeOff, Info, HelpCircle, Mail, KeyRound } from "lucide-react";

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
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        if (error.message === "Failed to fetch" || error.message.includes("fetch")) {
          setErrorMsg("ไม่สามารถเชื่อมต่อระบบได้: กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
          toast.error("ไม่สามารถเชื่อมต่อระบบได้");
        } else if (error.message.includes("Invalid login credentials")) {
          const { error: signUpErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
          });

          if (!signUpErr) {
            const { data: secondLoginData, error: secondLoginErr } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: password,
            });

            if (!secondLoginErr && secondLoginData?.user) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", secondLoginData.user.id)
                .single();

              const cleanPhone = (profile?.phone || "").replace(/[^0-9]/g, "");
              const isPhoneValid = cleanPhone.length === 10;
              const isNicknameValid = profile?.nickname && profile.nickname.trim() !== "" && profile.nickname !== "-";
              const isNameValid = profile?.first_name && profile.first_name.trim() !== "" && profile.last_name && profile.last_name.trim() !== "";
              const needsOnboarding = !profile || !isPhoneValid || !isNicknameValid || !isNameValid;

              if (needsOnboarding) {
                toast.info("ยินดีต้อนรับเข้าสู่ระบบครั้งแรก! กรุณาตรวจสอบข้อมูลส่วนตัวและตั้งรหัสผ่านใหม่");
                router.push("/onboarding");
              } else if (profile.role === "ADMIN") {
                toast.success("เข้าสู่ระบบแอดมินสำเร็จ!");
                router.push("/admin");
              } else {
                toast.success("เข้าสู่ระบบสำเร็จ!");
                router.push("/");
              }
              router.refresh();
              return;
            }
          }

          setErrorMsg("อีเมลหรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบรหัสนักศึกษาและรหัสผ่านตามคำแนะนำด้านล่าง");
          toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        } else {
          setErrorMsg(error.message);
          toast.error(error.message);
        }
        setLoading(false);
      } else if (data?.user) {
        // Check profile completion for first-time login
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

        if (needsOnboarding) {
          toast.info("ยินดีต้อนรับเข้าสู่ระบบครั้งแรก! กรุณาตรวจสอบข้อมูลส่วนตัวและตั้งรหัสผ่านใหม่");
          router.push("/onboarding");
        } else if (profile.role === "ADMIN") {
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
              <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl leading-relaxed animate-in fade-in">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  อีเมลนักศึกษา *
                </label>
                <Input
                  type="email"
                  placeholder="เช่น 123456789012@mail.rmutk.ac.th"
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
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" isLoading={loading} className="w-full h-11 rounded-xl text-sm font-bold shadow-md bg-blue-600 hover:bg-blue-500 text-white mt-2">
                <span>เข้าสู่ระบบ</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>

            {/* Instruction Guidance Box */}
            <div className="mt-4 p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-blue-800">
                <HelpCircle className="h-4 w-4 text-blue-600 shrink-0" />
                <span>คำแนะนำการเข้าสู่ระบบสำหรับนักศึกษา:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-600 pl-1">
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-blue-700 shrink-0">อีเมล:</span>
                  <span>รหัสนักศึกษาไม่มีขีด ตามด้วย <strong>@mail.rmutk.ac.th</strong> (เช่น <code>695554514521@mail.rmutk.ac.th</code>)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-blue-700 shrink-0">รหัสผ่านเริ่มต้น:</span>
                  <span>รหัสนักศึกษา<strong>มีขีด</strong> (เช่น <code>69555451452-1</code>)</span>
                </li>
                <li className="text-[10px] text-slate-500 pt-1 border-t border-blue-100/60">
                  * เมื่อเข้าสู่ระบบครั้งแรก ระบบจะให้กรอกข้อมูลส่วนตัวและสามารถเปลี่ยนรหัสผ่านใหม่ได้ทันที
                </li>
              </ul>
            </div>

          </CardContent>
        </Card>

        {/* Social Media & Contact Links */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-12 bg-slate-200" />
            <span className="text-[11px] font-bold text-slate-400">ช่องทางติดต่อสาขา</span>
            <span className="h-px w-12 bg-slate-200" />
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {/* Facebook */}
            <a
              href="https://www.facebook.com/COMENRMUTK/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs font-bold shadow-2xs"
            >
              <svg className="h-3.5 w-3.5 text-[#1877F2] fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/comeng_rmutk/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-pink-600 hover:border-pink-300 hover:bg-pink-50/50 transition-all text-xs font-bold shadow-2xs"
            >
              <svg className="h-3.5 w-3.5 text-[#E4405F] fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span>Instagram</span>
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@comeng_rmutk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-black hover:border-slate-400 hover:bg-slate-50 transition-all text-xs font-bold shadow-2xs"
            >
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.67a6.34 6.34 0 0 0 6.34 6.33 6.34 6.34 0 0 0 6.33-6.33V8.87a8.16 8.16 0 0 0 4.92 1.63V7.05a4.85 4.85 0 0 1-1-.36z" />
              </svg>
              <span>TikTok</span>
            </a>

            {/* Email */}
            <a
              href="mailto:comen.rmutk@gmail.com"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-xs font-bold shadow-2xs"
            >
              <Mail className="h-3.5 w-3.5 text-emerald-600" />
              <span>comen.rmutk@gmail.com</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
