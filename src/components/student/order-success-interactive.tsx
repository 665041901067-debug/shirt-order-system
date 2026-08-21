"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Order } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusLabel, getStatusBadgeVariant } from "@/lib/order-status";
import { CheckCircle2, Clock } from "lucide-react";

interface Props {
  order: Order;
}

export function OrderSuccessInteractive({ order }: Props) {
  useEffect(() => {
    // Trigger confetti fireworks celebration upon loading order success page
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <Card className="w-full border-slate-200 bg-white rounded-3xl shadow-xl p-6 sm:p-10 text-center space-y-6">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner mx-auto animate-bounce">
        <CheckCircle2 className="h-10 w-10 stroke-[2]" />
      </div>

      <div>
        <Badge variant="success" size="md" className="mb-2">
          สร้างคำสั่งซื้อสำเร็จแล้ว
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          ขอบคุณสำหรับการสั่งซื้อ!
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          หมายเลขออเดอร์ของคุณคือ <span className="font-bold text-blue-600 font-mono text-base">#{order.order_number}</span>
        </p>
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">สถานะคำสั่งซื้อ:</span>
          <Badge variant={getStatusBadgeVariant(order.status)} size="sm">
            {getStatusLabel(order.status)}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">ยอดชำระสุทธิ:</span>
          <span className="font-bold text-slate-900">฿{Number(order.total_amount).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">วันที่ทำการสั่งซื้อ:</span>
          <span className="text-slate-700">{new Date(order.created_at).toLocaleString("th-TH")}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link href={`/orders/${order.id}`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white">
            <Clock className="h-4 w-4 mr-1.5" />
            <span>ติดตามสถานะออเดอร์</span>
          </Button>
        </Link>
        <Link href="/products" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto rounded-xl font-bold">
            <span>กลับไปเลือกสินค้าเพิ่มเติม</span>
          </Button>
        </Link>
      </div>
    </Card>
  );
}
