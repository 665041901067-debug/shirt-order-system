"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Order } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusLabel, getStatusBadgeVariant } from "@/lib/order-status";
import { CheckCircle2, Clock, CreditCard, ArrowRight, ShoppingBag } from "lucide-react";

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

  const isPending = order.status === "PENDING_PAYMENT";

  return (
    <Card className="w-full max-w-xl mx-auto border-slate-200 bg-white rounded-3xl shadow-xl p-6 sm:p-10 text-center space-y-6">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner mx-auto animate-bounce">
        <CheckCircle2 className="h-10 w-10 stroke-[2]" />
      </div>

      <div>
        <Badge variant="success" size="md" className="mb-2 font-bold">
          บันทึกคำสั่งจองสำเร็จแล้ว
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          ขอบคุณสำหรับการสั่งจองเสื้อ!
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          หมายเลขออเดอร์ของคุณคือ <span className="font-bold text-blue-600 font-mono text-base">#{order.order_number}</span>
        </p>
      </div>

      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-left space-y-3 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">สถานะคำสั่งซื้อ:</span>
          <Badge variant={getStatusBadgeVariant(order.status)} size="sm">
            {getStatusLabel(order.status)}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">ยอดชำระสุทธิ:</span>
          <span className="font-black text-slate-900 text-sm">฿{Number(order.total_amount).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">วันที่ทำการสั่งจอง:</span>
          <span className="text-slate-700">{new Date(order.created_at).toLocaleString("th-TH")}</span>
        </div>
      </div>

      {isPending && (
        <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-left text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-amber-800">
            <CreditCard className="h-4 w-4 text-amber-600" />
            <span>คำแนะนำการชำระเงิน:</span>
          </p>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            ท่านสามารถกดปุ่ม <strong>&quot;ไปชำระเงินทันที&quot;</strong> เพื่อสแกน QR พร้อมเพย์และแนบสลิปได้เลย หรือสามารถกลับมาทำรายการในภายหลังได้ที่หน้าติดตามสถานะ
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link href={`/orders/${order.id}`} className="w-full sm:w-auto flex-1">
          <Button className="w-full rounded-2xl font-bold bg-blue-600 hover:bg-blue-500 text-white h-11 shadow-md shadow-blue-500/20">
            <CreditCard className="h-4 w-4 mr-1.5" />
            <span>ไปชำระเงิน / ติดตามสถานะ</span>
          </Button>
        </Link>
        <Link href="/orders" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto rounded-2xl font-bold h-11 border-slate-200">
            <ShoppingBag className="h-4 w-4 mr-1.5 text-slate-500" />
            <span>ดูประวัติคำสั่งซื้อ</span>
          </Button>
        </Link>
      </div>
    </Card>
  );
}
