"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { Order, OrderStatus, PaymentMethodConfig } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { submitOrderPayment } from "@/services/orders";
import { generatePromptPayPayload } from "@/lib/promptpay";
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
  Upload,
  Check,
  FileImage,
  CreditCard,
  Banknote,
  Edit3,
  Download
} from "lucide-react";

import { ORDER_STEPS, getStatusLabel, getStatusBadgeVariant } from "@/lib/order-status";
import { extractSportType, cleanNoteWithoutSport, getSportBadgeColor } from "@/lib/sports";

interface Props {
  initialOrder: Order;
  paymentMethods?: PaymentMethodConfig[];
}

export function OrderTrackingInteractive({ initialOrder, paymentMethods = [] }: Props) {
  const toast = useToast();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [realtimeStatus, setRealtimeStatus] = useState<"CONNECTED" | "DISCONNECTED" | "ERROR">("CONNECTED");
  
  // Payment methods
  const isQRActive = paymentMethods.length === 0 || paymentMethods.some((m) => m.type === "QR_PAYMENT" && m.is_active !== false);
  const isCashActive = paymentMethods.some((m) => m.type === "CASH" && m.is_active === true);

  const [selectedMethod, setSelectedMethod] = useState<"QR_PAYMENT" | "CASH">(
    order.payment?.payment_method === "CASH" ? "CASH" : "QR_PAYMENT"
  );

  // Slip upload state
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isEditingSlip, setIsEditingSlip] = useState(false);

  const qrConfig = paymentMethods.find((m) => m.type === "QR_PAYMENT");
  const promptPayNo = qrConfig?.promptpay_no || "0812345678";
  const promptPayPayload = generatePromptPayPayload(promptPayNo, Number(order.total_amount) || 0);
  const cashInstruction = paymentMethods.find((m) => m.type === "CASH")?.instruction || "กรุณาชำระเงินสดให้กับคณะกรรมการจัดทำเสื้อประจำสาขา เพื่อให้กรรมการทำการยืนยันการรับเงินในระบบ";

  // Supabase Realtime Subscription setup
  useEffect(() => {
    const supabase = createClient();

    const fetchLatestOrder = async () => {
      try {
        const { data } = await supabase
          .from("orders")
          .select(`*, items:order_items(*), payment:payments(*)`)
          .eq("id", order.id)
          .single();

        if (data) setOrder(data as Order);
      } catch (e) {}
    };

    const channel = supabase
      .channel(`order-tracking-live-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        fetchLatestOrder
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `order_id=eq.${order.id}`,
        },
        fetchLatestOrder
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `order_id=eq.${order.id}`,
        },
        fetchLatestOrder
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("CONNECTED");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setRealtimeStatus("DISCONNECTED");
        }
      });

    window.addEventListener("app:order-changed", fetchLatestOrder);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("app:order-changed", fetchLatestOrder);
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
      toast.success("แนบไฟล์สลิปแล้ว พร้อมกดยืนยันชำระเงิน");
    }
  };

  const handlePaymentSubmit = async () => {
    if (selectedMethod === "QR_PAYMENT" && !slipFile && !order.payment?.slip_url) {
      setUploadError("กรุณาเลือกไฟล์รูปภาพสลิปการโอนเงิน");
      toast.error("กรุณาเลือกไฟล์รูปภาพสลิปการโอนเงิน");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      let uploadedUrl: string | undefined = order.payment?.slip_url || undefined;

      if (selectedMethod === "QR_PAYMENT" && slipFile) {
        const supabase = createClient();
        const fileExt = slipFile.name.split(".").pop();
        const fileName = `slip_${order.id}_${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("slips")
          .upload(filePath, slipFile);

        if (uploadErr) {
          const { data: pubUrl } = supabase.storage.from("slips").getPublicUrl(filePath);
          uploadedUrl = pubUrl.publicUrl;
        } else {
          const { data: pubUrl } = supabase.storage.from("slips").getPublicUrl(uploadData.path);
          uploadedUrl = pubUrl.publicUrl;
        }
      }

      // Optimistic state update
      const newStatus: OrderStatus = selectedMethod === "QR_PAYMENT" && uploadedUrl ? "PAYMENT_REVIEW" : "PENDING_PAYMENT";
      setOrder((prev) => ({
        ...prev,
        status: newStatus,
        payment: {
          ...prev.payment,
          id: prev.payment?.id || "temp",
          order_id: prev.id,
          payment_method: selectedMethod,
          slip_url: uploadedUrl || undefined,
          status: "PENDING",
          amount: prev.total_amount,
          created_at: prev.created_at,
          updated_at: new Date().toISOString(),
        },
      }));
      setIsEditingSlip(false);

      // Backend call
      const res = await submitOrderPayment({
        orderId: order.id,
        payment_method: selectedMethod,
        slip_url: uploadedUrl,
      });

      if (!res.success) {
        toast.error(res.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูลการชำระเงิน");
      } else {
        toast.success(
          selectedMethod === "QR_PAYMENT"
            ? "ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว! แอดมินจะทำการตรวจสอบข้อมูล"
            : "เลือกชำระเงินสดเรียบร้อย กรุณาติดต่อชำระกับตัวแทนสาขา"
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("app:order-changed"));
        }
      }
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setUploading(false);
    }
  };

  const currentStepIndex = (() => {
    if (["PAID", "ORDER_ACCEPTED", "PREPARING", "PRODUCTION"].includes(order.status)) {
      return ORDER_STEPS.findIndex((s) => s.status === "ORDER_ACCEPTED");
    }
    return ORDER_STEPS.findIndex((s) => s.status === order.status);
  })();

  const isCancelled = order.status === "CANCELLED";
  const isPendingPayment = order.status === "PENDING_PAYMENT";
  const isPaymentReview = order.status === "PAYMENT_REVIEW";
  const isPaidOrVerified = order.payment?.status === "VERIFIED" || ["PAID", "ORDER_ACCEPTED", "PREPARING", "PRODUCTION", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status);

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
                สั่งจองเมื่อ: {new Date(order.created_at).toLocaleString("th-TH")}
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

      {/* Grid Layout: Items & Payment Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Order Items */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200 bg-white rounded-3xl shadow-xs">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Shirt className="h-4 w-4 text-blue-600" />
                <span>รายการสินค้าในคำสั่งซื้อ ({order.items?.length || 0} ชิ้น)</span>
              </h3>

              <div className="divide-y divide-slate-100 space-y-3">
                {order.items?.map((item) => {
                  const sport = extractSportType(item);
                  const cleanNote = cleanNoteWithoutSport(item.note);
                  return (
                    <div key={item.id} className="pt-3 first:pt-0 flex items-start justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900">{item.product_name_snapshot}</h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" size="sm">
                            ไซส์: {item.size_name_snapshot}
                          </Badge>
                          <span className="text-slate-500">จำนวน {item.quantity} ตัว</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getSportBadgeColor(sport)}`}>
                            กีฬา: {sport}
                          </span>
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
                        {cleanNote && (
                          <p className="text-[11px] text-slate-500 italic">
                            หมายเหตุ: {cleanNote}
                          </p>
                        )}
                      </div>

                      <div className="text-right font-extrabold text-slate-900 text-sm">
                        ฿{Number(item.subtotal || 0).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
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

        {/* Right Column: Payment Card or QR Pickup Code */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* SECTION A: PAYMENT ACTION CARD (For Pending Payment or Editing Slip) */}
          {(!isPaidOrVerified && (isEditingSlip || (!order.payment?.slip_url && order.payment?.payment_method !== "CASH"))) && (
            <Card className="border-amber-200 bg-amber-50/40 rounded-3xl shadow-sm overflow-hidden" id="payment">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <CreditCard className="h-5 w-5 text-amber-600" />
                    <span>ชำระเงินสำหรับคำสั่งซื้อนี้</span>
                  </div>
                  <Badge variant="warning" size="sm" className="font-bold">
                    ยังไม่ได้ชำระเงิน
                  </Badge>
                </div>

                {/* Total amount prompt */}
                <div className="p-3.5 bg-white rounded-2xl border border-amber-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">ยอดที่ต้องชำระ:</span>
                  <span className="text-xl font-black text-blue-600 font-mono">
                    ฿{Number(order.total_amount).toLocaleString()}
                  </span>
                </div>

                {/* Method selector buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {isQRActive && (
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("QR_PAYMENT")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedMethod === "QR_PAYMENT"
                          ? "border-blue-600 bg-blue-50/60 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <QrCode className={`h-4 w-4 ${selectedMethod === "QR_PAYMENT" ? "text-blue-600" : "text-slate-400"}`} />
                        <span className="text-xs font-bold text-slate-900">QR พร้อมเพย์</span>
                      </div>
                    </button>
                  )}

                  {isCashActive && (
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("CASH")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedMethod === "CASH"
                          ? "border-blue-600 bg-blue-50/60 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Banknote className={`h-4 w-4 ${selectedMethod === "CASH" ? "text-blue-600" : "text-slate-400"}`} />
                        <span className="text-xs font-bold text-slate-900">ชำระเงินสด</span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Option 1: QR Payment Presentation & Slip Upload */}
                {selectedMethod === "QR_PAYMENT" && (
                  <div className="space-y-4 pt-1">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
                      <div className="p-3.5 bg-white rounded-2xl shadow-xs border border-slate-100">
                        <QRCodeSVG value={promptPayPayload} size={170} level="M" />
                      </div>
                      <div className="space-y-1.5 w-full bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">ชื่อบัญชี:</span>
                          <span className="font-bold text-slate-900">{qrConfig?.name || "สาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">เลขพร้อมเพย์:</span>
                          <span className="font-mono font-bold text-blue-600">{promptPayNo}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                          <span className="text-slate-500 font-medium">ยอดเงินที่ต้องโอน:</span>
                          <span className="font-black text-blue-700 text-sm font-mono">฿{Number(order.total_amount).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Slip Upload Zone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 block">
                        แนบไฟล์สลิปโอนเงิน *
                      </label>

                      <div className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white rounded-2xl p-4 text-center cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSlipChange}
                          className="hidden"
                          id="tracking-slip-input"
                        />
                        <label htmlFor="tracking-slip-input" className="cursor-pointer block space-y-1">
                          {slipPreview ? (
                            <div className="space-y-2">
                              <div className="relative h-36 w-full rounded-xl overflow-hidden border border-slate-200">
                                <Image src={slipPreview} alt="Slip" fill className="object-contain" />
                              </div>
                              <span className="text-[11px] text-blue-600 font-bold block hover:underline">
                                คลิกเพื่อเปลี่ยนรูปสลิป
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1 py-2">
                              <Upload className="h-6 w-6 text-amber-600 mx-auto" />
                              <span className="text-xs font-bold text-slate-800 block">
                                คลิกเพื่อเลือกรูปภาพสลิป
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                ไฟล์ JPG, PNG (ไม่เกิน 5MB)
                              </span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Option 2: Cash Instructions */}
                {selectedMethod === "CASH" && (
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-amber-600" />
                      <span>ขั้นตอนการชำระเงินสด:</span>
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      {cashInstruction}
                    </p>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs text-red-600 font-medium">
                    {uploadError}
                  </p>
                )}

                <Button
                  onClick={handlePaymentSubmit}
                  isLoading={uploading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold h-11 shadow-md shadow-blue-500/20"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  <span>{selectedMethod === "QR_PAYMENT" ? "ยืนยันและส่งสลิปชำระเงิน" : "ยืนยันเลือกชำระเงินสด"}</span>
                </Button>

                {isEditingSlip && (
                  <button
                    onClick={() => setIsEditingSlip(false)}
                    className="w-full text-center text-xs text-slate-400 hover:text-slate-600 font-bold pt-1"
                  >
                    ยกเลิกการแก้ไข
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION B: CASH PAYMENT CONFIRMED CARD (When student chose cash) */}
          {order.payment?.payment_method === "CASH" && !isPaidOrVerified && !isEditingSlip && (
            <Card className="border-amber-200 bg-amber-50/50 rounded-3xl shadow-xs overflow-hidden" id="payment">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <Banknote className="h-5 w-5 text-amber-600" />
                    <span>ชำระเงินสด (Cash Payment)</span>
                  </div>
                  <Badge variant="warning" size="sm" className="font-bold bg-amber-100 text-amber-800 border-amber-300">
                    รอชำระเงินสด
                  </Badge>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-amber-200 text-xs text-slate-700 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-medium">ยอดเงินสดที่ต้องชำระ:</span>
                    <span className="text-xl font-black text-amber-600 font-mono">
                      ฿{Number(order.total_amount).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>บันทึกการเลือกชำระเงินสดเรียบร้อยแล้ว</span>
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      {cashInstruction}
                    </p>
                  </div>

                  <div className="text-[11px] text-amber-900 bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 space-y-1">
                    <p className="font-bold">📌 สิ่งที่ต้องทำต่อไป:</p>
                    <p>1. เตรียมเงินสดจำนวน <strong>฿{Number(order.total_amount).toLocaleString()}</strong></p>
                    <p>2. นำไปชำระกับตัวแทนสาขา / แอดมิน</p>
                    <p>3. เมื่อแอดมินได้รับเงินแล้ว จะกดยืนยันในระบบ และสถานะจะเปลี่ยนเป็น &quot;อนุมัติแล้ว&quot; ทันที</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingSlip(true);
                    setSelectedMethod("QR_PAYMENT");
                  }}
                  className="w-full rounded-2xl text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100/60 h-10 shadow-2xs"
                >
                  <QrCode className="h-4 w-4 mr-1.5 text-blue-600" />
                  <span>เปลี่ยนใจ: ชำระด้วย QR พร้อมเพย์ / แนบสลิป</span>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* SECTION B: SLIP PREVIEW & STATUS (If already sent slip) */}
          {order.payment?.slip_url && !isEditingSlip && (
            <Card className="border-slate-200 bg-white rounded-3xl shadow-xs overflow-hidden">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <FileImage className="h-4 w-4 text-blue-600" />
                    <span>หลักฐานการโอนเงิน (สลิป)</span>
                  </h4>
                  <Badge variant={order.payment?.status === "VERIFIED" ? "success" : "warning"} size="sm" className="font-bold">
                    {order.payment?.status === "VERIFIED" ? "อนุมัติแล้ว" : "รอตรวจสอบสลิป"}
                  </Badge>
                </div>

                <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-200">
                  <Image src={order.payment.slip_url} alt="Slip" fill className="object-contain" />
                </div>

                {order.payment?.status !== "VERIFIED" && !isPaidOrVerified && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingSlip(true)}
                    className="w-full rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 mt-1"
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    <span>แก้ไขสลิป / ส่งสลิปใหม่</span>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION C: QR CODE FOR PICKUP */}
          <Card className="border-slate-200 bg-white rounded-3xl shadow-xs text-center">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center justify-center gap-2">
                <QrCode className="h-4 w-4 text-blue-600" />
                <span>คิวอาร์โค้ดสำหรับรับเสื้อ</span>
              </h3>

              <div className="bg-white p-3 rounded-2xl border-2 border-slate-100 inline-block shadow-xs">
                <QRCodeSVG
                  value={`ORDER:${order.order_number}`}
                  size={170}
                  level="M"
                  includeMargin={true}
                  className="rounded-lg"
                />
              </div>

              <p className="text-xs font-mono font-extrabold text-blue-600">
                #{order.order_number}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                แสดงคิวอาร์โค้ดนี้ให้เจ้าหน้าที่สแกนเมื่อถึงวันนัดรับเสื้อประจำสาขา
              </p>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
