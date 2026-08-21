"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  Menu,
  X,
  ShoppingCart
} from "lucide-react";

interface HeaderProps {
  profile: Profile | null;
  cartCount?: number;
  unreadNotifications?: number;
}

interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

export function Header({ profile, cartCount = 0, unreadNotifications = 0 }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveCartCount, setLiveCartCount] = useState(cartCount);

  const isAdmin = profile?.role === "ADMIN";

  // Update liveCartCount when prop changes
  useEffect(() => {
    setLiveCartCount(cartCount);
  }, [cartCount]);

  // Realtime Live Cart Count Listener for dynamic changes
  useEffect(() => {
    if (!profile || isAdmin) return;

    const supabase = createClient();

    const fetchLiveCartCount = async () => {
      try {
        const { data: cart } = await supabase
          .from("carts")
          .select("id, items:cart_items(id)")
          .eq("user_id", profile.id)
          .maybeSingle();

        if (cart && Array.isArray(cart.items)) {
          setLiveCartCount(cart.items.length);
        } else {
          setLiveCartCount(0);
        }
      } catch (e) {}
    };

    // Listen for realtime cart changes (add/remove/checkout)
    const channel = supabase
      .channel(`live-cart-count-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items" },
        () => {
          fetchLiveCartCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, isAdmin]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const studentNavItems: NavItem[] = [
    { href: "/", label: "หน้าแรก" },
    { href: "/products", label: "สินค้าทั้งหมด" },
    { href: "/orders", label: "คำสั่งซื้อของฉัน" },
    { href: "/cart", label: "ตะกร้าสินค้า", badge: liveCartCount },
    { href: "/notifications", label: "แจ้งเตือน", badge: unreadNotifications },
    { href: "/profile", label: "ข้อมูลส่วนตัว" },
  ];

  const adminNavItems: NavItem[] = [
    { href: "/admin", label: "แดชบอร์ด" },
    { href: "/admin/orders", label: "จัดการออเดอร์" },
    { href: "/admin/products", label: "จัดการสินค้า" },
    { href: "/admin/production", label: "สรุปการผลิต" },
    { href: "/admin/payments", label: "การชำระเงิน" },
    { href: "/admin/users", label: "ผู้ใช้งาน" },
    { href: "/admin/settings", label: "ตั้งค่าระบบ" },
  ];

  const navItems: NavItem[] = isAdmin ? adminNavItems : studentNavItems;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
        
        {/* Logo & Logged-In User Brand */}
        <Link 
          href={isAdmin ? "/admin" : "/"} 
          className="flex items-center gap-2.5 sm:gap-3 group min-w-0 max-w-[200px] xs:max-w-[250px] sm:max-w-none shrink"
        >
          <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-slate-200/80 shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
            <img 
              src="/images/logo.png" 
              alt="CPE & IoT Logo" 
              className="h-full w-full object-contain" 
            />
          </div>
          
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight leading-tight truncate">
              {profile 
                ? `${profile.first_name} ${profile.last_name}${profile.nickname ? ` (${profile.nickname})` : ""}`
                : "สาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT"}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {profile 
                ? (isAdmin ? "ผู้ดูแลระบบ" : `นักศึกษา • ${profile.academic_year || "ปี 1"}`)
                : "ระบบสั่งซื้อเสื้อกีฬา"}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links (Pure, Clean Text Tabs) */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`relative inline-flex items-center px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Cart Shortcut + Menu / Logout */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Direct Cart Button on Header for Students (Always visible on mobile & desktop) */}
          {!isAdmin && profile && (
            <Link
              href="/cart"
              prefetch={true}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${
                pathname === "/cart"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
              }`}
              title="ตะกร้าสินค้า"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">ตะกร้า</span>
              {liveCartCount > 0 && (
                <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold ${
                  pathname === "/cart" ? "bg-white text-blue-600" : "bg-blue-600 text-white animate-pulse"
                }`}>
                  {liveCartCount}
                </span>
              )}
            </Link>
          )}

          {/* Desktop Logout Button */}
          <div className="hidden lg:flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-3 py-1.5 font-bold text-xs"
              title="ออกจากระบบ"
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span>ออกจากระบบ</span>
            </Button>
          </div>

          {/* Mobile menu button (Clean Thai Label with 3-Line Hamburger Icon) */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 text-xs font-bold transition-all shadow-xs"
              aria-label="เปิดเมนู"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4 text-slate-600" />
              ) : (
                <Menu className="h-4 w-4 text-slate-600" />
              )}
              <span>เมนู</span>
            </button>
          </div>
        </div>

      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top-2">
          {profile && (
            <div className="p-3 mb-2 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {profile.first_name} {profile.last_name} {profile.nickname ? `(${profile.nickname})` : ""}
                </p>
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  {profile.student_id ? `รหัส: ${profile.student_id}` : profile.email || ""}
                </p>
              </div>
              <Badge variant={isAdmin ? "danger" : "secondary"} size="sm" className="shrink-0 font-bold">
                {isAdmin ? "ผู้ดูแลระบบ" : `นักศึกษา • ${profile.academic_year || "ปี 1"}`}
              </Badge>
            </div>
          )}

          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isActive ? "bg-blue-600 text-white shadow-xs" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant={isActive ? "secondary" : "primary"} size="sm">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <span>ออกจากระบบ</span>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
