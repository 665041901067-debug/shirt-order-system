"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Notification } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell, ArrowRight, CheckCircle2, Package, Clock } from "lucide-react";
import { getStatusLabel } from "@/lib/order-status";

interface Props {
  initialNotifications: Notification[];
  userId?: string;
}

/**
 * Format date safely on the client to completely eliminate React Hydration Mismatch #418
 */
function formatSafeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Clean up legacy English notification messages into pure Thai
 */
function formatNotificationMessage(msg: string): string {
  if (!msg) return "";
  let cleanMsg = msg;
  const statusMappings: Record<string, string> = {
    READY_FOR_PICKUP: "พร้อมรับสินค้า",
    ORDER_ACCEPTED: "อนุมัติแล้ว",
    PAID: "อนุมัติแล้ว",
    PENDING_PAYMENT: "รอชำระเงิน",
    PAYMENT_REVIEW: "รอตรวจสอบสลิป",
    COMPLETED: "รับสินค้าแล้ว",
    CANCELLED: "ยกเลิก",
    PREPARING: "กำลังจัดเตรียมสินค้า",
    PRODUCTION: "อนุมัติแล้ว",
  };

  for (const [key, val] of Object.entries(statusMappings)) {
    cleanMsg = cleanMsg.replace(new RegExp(key, "g"), val);
  }
  return cleanMsg;
}

export function NotificationsInteractive({ initialNotifications, userId }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`realtime-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-600" />
          <span>การแจ้งเตือน</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          การอัปเดตสถานะคำสั่งซื้อและการแจ้งเตือนสำคัญจากระบบ
        </p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="ยังไม่มีการแจ้งเตือน"
          description="เมื่อคำสั่งซื้อของคุณมีการเปลี่ยนสถานะ การแจ้งเตือนจะปรากฏขึ้นในส่วนนี้ทันที"
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <Card
              key={item.id}
              className={`border bg-white rounded-2xl overflow-hidden shadow-xs transition-all hover:shadow-md ${
                !item.read ? "border-blue-200 bg-blue-50/20" : "border-slate-200/80"
              }`}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mt-0.5">
                    <Package className="h-5 w-5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {item.title}
                      </h3>
                      {!item.read && (
                        <Badge variant="primary" size="sm" className="shrink-0 font-bold">
                          ใหม่
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {formatNotificationMessage(item.message)}
                    </p>

                    <span 
                      suppressHydrationWarning
                      className="text-[10px] text-slate-400 block font-mono"
                    >
                      {mounted ? formatSafeDate(item.created_at) : "เมื่อสักครู่"}
                    </span>
                  </div>
                </div>

                {item.link_url && (
                  <Link href={item.link_url} className="shrink-0">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold shadow-2xs">
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
    </div>
  );
}
