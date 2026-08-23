"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Profile, Cart, PaymentMethodConfig } from "@/types";
import { createOrderFromCart } from "@/services/orders";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingBag, 
  CheckCircle, 
  User, 
  AlertCircle,
  Clock,
  Shirt,
  Info,
  ArrowRight
} from "lucide-react";
import { extractSportType, getSportBadgeColor } from "@/lib/sports";

interface Props {
  profile: Profile | null;
  cart: Cart;
  paymentMethods: PaymentMethodConfig[];
}

export function CheckoutInteractive({ profile, cart }: Props) {
  const router = useRouter();
  const toast = useToast();

  const items = cart.items || [];
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Subtotal calculations
  const totalAmount = items.reduce((sum, item) => {
    const base = Number(item.product?.base_price) || 0;
    const sizeAdj = Number(item.size?.price_adjustment) || 0;
    return sum + (base + sizeAdj) * item.quantity;
  }, 0);

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await createOrderFromCart();

      if (!res.success || !res.orderId) {
        toast.error(res.error || "เกิดข้อผิดพลาดในการยืนยันคำสั่งจอง");
        setErrorMsg(res.error || "เกิดข้อผิดพลาดในการยืนยันคำสั่งจอง");
        setSubmitting(false);
      } else {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("app:order-changed"));
          window.dispatchEvent(new CustomEvent("app:cart-changed"));
        }
        toast.success("บันทึกคำสั่งจองเสื้อสำเร็จเรียบร้อยแล้ว!");
        router.push(`/order-success/${res.orderId}`);
      }
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-blue-600" />
          <span>สรุปคำสั่งซื้อและยืนยันการสั่งจอง</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          ตรวจสอบรายละเอียดคำสั่งจองเสื้อ จากนั้นสามารถเลือกชำระเงินในขั้นตอนถัดไปได้ทันที
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Student Details & Instructions */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Student Profile Info */}
          <Card className="border-slate-200 bg-white rounded-3xl shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>ข้อมูลผู้สั่งจอง</span>
                </h3>
                <Badge variant="secondary" size="sm">
                  {profile?.academic_year || "ปี 1"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 font-medium">
                <p><strong>ชื่อ-นามสกุล:</strong> {profile?.first_name} {profile?.last_name} ({profile?.nickname || "-"})</p>
                <p><strong>รหัสนักศึกษา:</strong> <span className="font-mono text-blue-600 font-bold">{profile?.student_id || "-"}</span></p>
                <p><strong>เบอร์โทรศัพท์:</strong> <span className="font-mono">{profile?.phone || "-"}</span></p>
                <p><strong>สาขาวิชา:</strong> {profile?.major || "วิศวกรรมคอมพิวเตอร์และระบบ IoT"}</p>
              </div>
            </CardContent>
          </Card>

          {/* 2. Pre-order & Pay Later Notice */}
          <Card className="border-blue-200 bg-blue-50/40 rounded-3xl shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <Info className="h-5 w-5 text-blue-600 shrink-0" />
                <span>ขั้นตอนการสั่งจองและชำระเงิน</span>
              </div>
              
              <div className="space-y-2 text-xs text-slate-600 leading-relaxed font-medium">
                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-white border border-blue-100">
                  <span className="flex h-5 w-5 rounded-full bg-blue-600 text-white items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-900 block">ยืนยันการสั่งจองเสื้อในหน้านี้</strong>
                    <span className="text-[11px] text-slate-500">ยอดสั่งจองจะถูกบันทึกเข้าระบบทันที เพื่อรวบรวมส่งยอดผลิตให้โรงงาน</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-white border border-blue-100">
                  <span className="flex h-5 w-5 rounded-full bg-amber-500 text-white items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-900 block">เลือกชำระเงินในหน้าติดตามสถานะ</strong>
                    <span className="text-[11px] text-slate-500">สามารถสแกน QR พร้อมเพย์แนบสลิป หรือเลือกชำระเงินสดในภายหลังได้ที่หน้าติดตามสถานะ</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Order Summary & Confirm Button */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 bg-white rounded-3xl shadow-md sticky top-24">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shirt className="h-4 w-4 text-blue-600" />
                  <span>รายการสั่งจอง</span>
                </h2>
                <Badge variant="primary" size="sm" className="font-bold">
                  รวม {totalQuantity} ตัว
                </Badge>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-3">
                {items.map((item) => {
                  const sportType = extractSportType(item);
                  return (
                    <div key={item.id} className="pt-3 first:pt-0 flex items-start justify-between text-xs gap-3">
                      <div className="space-y-1 min-w-0">
                        <span className="font-bold text-slate-900 block truncate">
                          {item.product?.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            ไซส์: {item.size?.size_name}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            จำนวน: {item.quantity} ตัว
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getSportBadgeColor(sportType)}`}>
                            {sportType}
                          </span>
                        </div>
                        {(item.custom_name || item.custom_number) && (
                          <span className="text-[11px] text-blue-600 font-bold block pt-0.5">
                            สกรีน: {item.custom_name || "-"} {item.custom_number ? `#${item.custom_number}` : ""}
                          </span>
                        )}
                        {item.note && (
                          <span className="text-[10px] text-slate-400 block italic">
                            หมายเหตุ: {item.note}
                          </span>
                        )}
                      </div>
                      <span className="font-black text-slate-900 shrink-0 text-sm">
                        ฿{((Number(item.product?.base_price) + Number(item.size?.price_adjustment || 0)) * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>สถานะเริ่มต้น</span>
                  <Badge variant="warning" size="sm" className="font-bold">
                    รอชำระเงิน
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>การรับสินค้า</span>
                  <span className="font-bold text-slate-900">รับที่สาขา (ฟรี)</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-900">ยอดรวมสุทธิ</span>
                  <span className="text-2xl font-black text-blue-600">
                    ฿{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSubmitOrder}
                isLoading={submitting}
                className="w-full h-12 text-sm sm:text-base font-bold rounded-2xl shadow-md bg-blue-600 hover:bg-blue-500 text-white mt-2 flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                <span>ยืนยันการสั่งจองเสื้อ</span>
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
