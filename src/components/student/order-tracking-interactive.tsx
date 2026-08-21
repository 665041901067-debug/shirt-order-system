"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { Order, OrderStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Shirt, 
  ArrowLeft, 
  QrCode, 
  FileText,
  Lock,
  Upload,
  Check,
  FileImage
} from "lucide-react";

import { ORDER_STEPS, getStatusLabel, getStatusBadgeVariant } from "@/lib/order-status";

interface Props {
  initialOrder: Order;
}

export function OrderTrackingInteractive({ initialOrder }: Props) {
  const toast = useToast();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [realtimeStatus, setRealtimeStatus] = useState<"CONNECTED" | "DISCONNECTED" | "ERROR">("CONNECTED");
  
  // Slip upload state
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // Supabase Realtime Subscription setup
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`order-tracking-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("orders")
            .select(`*, items:order_items(*), payment:payments(*)`)
            .eq("id", order.id)
            .single();

          if (data) setOrder(data as Order);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `order_id=eq.${order.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("orders")
            .select(`*, items:order_items(*), payment:payments(*)`)
            .eq("id", order.id)
            .single();

          if (data) setOrder(data as Order);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("CONNECTED");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setRealtimeStatus("DISCONNECTED");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id]);

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("ขนาดไฟล์สลิปต้องไม่เกิน 5MB");
        toast.error("ขนาดไฟล์สลิปต้องไม่เกิน 5MB");
        return;
      }
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
      setUploadError("");
      toast.success("แนบไฟล์สลิปแล้ว พร้อมกดยืนยันอัปโหลด");
    }
  };

  const handleUploadSlipSubmit = async () => {
    if (!slipFile) {
      setUploadError("กรุณาเลือกไฟล์รูปภาพสลิป");
      toast.error("กรุณาเลือกไฟล์รูปภาพสลิป");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    const supabase = createClient();
    const fileExt = slipFile.name.split(".").pop();
    const fileName = `slip_${order.id}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("slips")
      .upload(filePath, slipFile);

    let uploadedUrl: string | undefined = undefined;

    if (uploadErr) {
      const { data: pubUrl } = supabase.storage.from("slips").getPublicUrl(filePath);
      uploadedUrl = pubUrl.publicUrl;
    } else {
      const { data: pubUrl } = supabase.storage.from("slips").getPublicUrl(uploadData.path);
      uploadedUrl = pubUrl.publicUrl;
    }

    // Update payment record in DB
    if (order.payment?.id) {
      await supabase
        .from("payments")
        .update({
          slip_url: uploadedUrl,
          status: "PENDING",
        })
        .eq("id", order.payment.id);
    }

    // Update order status to PAYMENT_REVIEW
    await supabase
      .from("orders")
      .update({ status: "PAYMENT_REVIEW" })
      .eq("id", order.id);

    setUploading(false);
    toast.success("แนบสลิปชำระเงินเรียบร้อยแล้ว! เจ้าหน้าที่จะทำการตรวจสอบข้อมูล");
    
    setOrder((prev) => ({
      ...prev,
      status: "PAYMENT_REVIEW",
      payment: prev.payment ? { ...prev.payment, slip_url: uploadedUrl } : undefined,
    }));
  };

  const currentStepIndex = (() => {
    if (["PAID", "ORDER_ACCEPTED", "PREPARING", "PRODUCTION"].includes(order.status)) {
      return ORDER_STEPS.findIndex((s) => s.status === "ORDER_ACCEPTED");
    }
    return ORDER_STEPS.findIndex((s) => s.status === order.status);
  })();
  const isCancelled = order.status === "CANCELLED";
  const isProductionOrBeyond = ["ORDER_ACCEPTED", "PAID", "PREPARING", "PRODUCTION", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status);
  const isQRPayment = order.payment?.payment_method === "QR_PAYMENT";
  const needsSlipUpload = isQRPayment && (order.status === "PENDING_PAYMENT" || !order.payment?.slip_url);

  return (
    <div className="space-y-6">
      
      {/* Top navigation & Realtime connection badge */}
      <div className="flex items-center justify-between">
        <Link href="/orders" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          <span>ย้อนกลับไปประวัติการสั่งซื้อ</span>
        </Link>

        <div className="flex items-center gap-1.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span>อัปเดตสถานะแบบเรียลไทม์</span>
        </div>
      </div>

      {/* Main Order Status Header */}
      <Card className="border-slate-200 bg-white rounded-3xl shadow-xs overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-slate-400 block">หมายเลขออเดอร์</span>
              <h1 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                #{order.order_number}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                สั่งซื้อเมื่อ: {new Date(order.created_at).toLocaleString("th-TH")}
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <Badge variant={getStatusBadgeVariant(order.status)} size="md" className="font-bold">
                {getStatusLabel(order.status)}
              </Badge>
              <span className="text-xs text-slate-500">
                ช่องทางชำระเงิน: {order.payment?.payment_method === "CASH" ? "เงินสด" : "พร้อมเพย์"}
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          {!isCancelled ? (
            <div className="py-4">
              <div className="relative flex items-center justify-between w-full max-w-3xl mx-auto">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-0" />
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 transition-all duration-500 -z-0"
                  style={{
                    width: `${Math.max(0, (currentStepIndex / (ORDER_STEPS.length - 1)) * 100)}%`
                  }}
                />

                {ORDER_STEPS.map((step, idx) => {
                  const isDone = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;

                  return (
                    <div key={step.status} className="flex flex-col items-center relative z-10">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isDone
                            ? "bg-blue-600 text-white ring-4 ring-blue-100"
                            : "bg-white border-2 border-slate-200 text-slate-400"
                        }`}
                      >
                        {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[11px] font-bold mt-2 text-center max-w-[80px] leading-tight ${
                          isCurrent ? "text-blue-600" : isDone ? "text-slate-800" : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>คำสั่งซื้อนี้ถูกยกเลิกแล้ว</span>
            </div>
          )}

        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Order Items */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Shirt className="h-4 w-4 text-blue-600" />
                <span>รายการสินค้าในคำสั่งซื้อ ({order.items?.length || 0} ชิ้น)</span>
              </h3>

              <div className="divide-y divide-slate-100 space-y-3">
                {order.items?.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900">{item.product_name_snapshot}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" size="sm">
                          ไซส์: {item.size_name_snapshot}
                        </Badge>
                        <span className="text-slate-500">จำนวน {item.quantity} ตัว</span>
                      </div>

                      {item.custom_name && (
                        <p className="text-[11px] text-slate-600">
                          <strong>ชื่อหลังเสื้อ:</strong> {item.custom_name}
                        </p>
                      )}
                      {item.custom_number && (
                        <p className="text-[11px] text-blue-600 font-mono font-bold">
                          <strong>เบอร์หลังเสื้อ:</strong> #{item.custom_number}
                        </p>
                      )}
                      {item.note && (
                        <p className="text-[11px] text-slate-500 italic">
                          หมายเหตุ: {item.note}
                        </p>
                      )}
                    </div>

                    <div className="text-right font-extrabold text-slate-900 text-sm">
                      ฿{Number(item.subtotal || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">ยอดรวมสุทธิ</span>
                <span className="text-xl font-black text-blue-600">
                  ฿{Number(order.total_amount).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: QR Pickup Code & Slip Upload */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* 1. QR Code for Pickup (Always ready for fast scanning at distribution) */}
          <Card className="border-slate-200 bg-white rounded-2xl shadow-xs text-center">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center justify-center gap-2">
                <QrCode className="h-4 w-4 text-blue-600" />
                <span>คิวอาร์โค้ดสำหรับรับเสื้อ</span>
              </h3>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block shadow-inner">
                <QRCodeSVG value={`ORDER:${order.order_number}`} size={160} level="H" />
              </div>

              <p className="text-xs font-mono font-extrabold text-blue-600">
                #{order.order_number}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                แสดงคิวอาร์โค้ดนี้ให้เจ้าหน้าที่สแกนเมื่อถึงวันนัดรับเสื้อประจำสาขา
              </p>
            </CardContent>
          </Card>

          {/* 2. Slip Upload (if not uploaded or pending) */}
          {needsSlipUpload && (
            <Card className="border-amber-200 bg-amber-50/50 rounded-2xl shadow-xs">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>ยังไม่ได้แนบสลิปชำระเงิน</span>
                </div>

                <div className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white rounded-xl p-4 text-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipChange}
                    className="hidden"
                    id="tracking-slip-input"
                  />
                  <label htmlFor="tracking-slip-input" className="cursor-pointer block space-y-1">
                    {slipPreview ? (
                      <div className="relative h-28 w-full rounded-lg overflow-hidden border border-slate-200">
                        <Image src={slipPreview} alt="Slip" fill className="object-contain" />
                      </div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-amber-600 mx-auto" />
                        <span className="text-xs font-bold text-slate-800 block">
                          คลิกเพื่อเลือกไฟล์รูปภาพสลิป
                        </span>
                      </>
                    )}
                  </label>
                </div>

                <Button
                  onClick={handleUploadSlipSubmit}
                  isLoading={uploading}
                  disabled={!slipFile}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  <span>ยืนยันอัปโหลดสลิป</span>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 3. Slip Preview if already uploaded */}
          {order.payment?.slip_url && (
            <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <FileImage className="h-4 w-4 text-blue-600" />
                    <span>หลักฐานการโอนเงิน (สลิป)</span>
                  </h4>
                  <Badge variant={order.payment?.status === "VERIFIED" ? "success" : "warning"} size="sm">
                    {order.payment?.status === "VERIFIED" ? "ตรวจสอบแล้ว" : "รอตรวจสอบ"}
                  </Badge>
                </div>

                <div className="relative h-44 w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
                  <Image src={order.payment.slip_url} alt="Slip" fill className="object-contain" />
                </div>
              </CardContent>
            </Card>
          )}

        </div>

      </div>
    </div>
  );
}
