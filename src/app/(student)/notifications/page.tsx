import React from "react";
import Link from "next/link";
import { getCurrentProfile } from "@/services/profile";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, ArrowRight } from "lucide-react";
import { Notification } from "@/types";

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (notifications || []) as Notification[];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} unreadNotifications={list.filter((n) => !n.read).length} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            <span>การแจ้งเตือน (Notifications)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">การอัปเดตสถานะออเดอร์และการแจ้งเตือนจากระบบ</p>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="ยังไม่มีการแจ้งเตือน"
            description="เมื่อคำสั่งซื้อของคุณมีการเปลี่ยนสถานะ การแจ้งเตือนจะปรากฏขึ้นในส่วนนี้ทันที"
          />
        ) : (
          <div className="space-y-3">
            {list.map((item) => (
              <Card key={item.id} className="border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                      {!item.read && <Badge variant="primary" size="sm">ใหม่</Badge>}
                    </div>
                    <p className="text-xs text-slate-600">{item.message}</p>
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(item.created_at).toLocaleString("th-TH")}
                    </span>
                  </div>

                  {item.link_url && (
                    <Link href={item.link_url}>
                      <Button size="sm" variant="outline" className="rounded-xl">
                        <span>ดูรายละเอียด</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
