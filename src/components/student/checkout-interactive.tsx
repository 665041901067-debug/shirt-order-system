"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { generatePromptPayPayload } from "@/lib/promptpay";
import { Profile, Cart, PaymentMethodConfig } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { createOrderFromCart } from "@/services/orders";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CreditCard, 
  QrCode, 
  Banknote, 
  CheckCircle, 
  ShieldCheck, 
  User, 
  AlertCircle,
  Upload,
  FileImage,
  Check
} from "lucide-react";
import { extractSportType, getSportBadgeColor } from "@/lib/sports";

interface Props {
  profile: Profile | null;
  cart: Cart;
  paymentMethods: PaymentMethodConfig[];
}

export function CheckoutInteractive({ profile, cart, paymentMethods }: Props) {
  const router = useRouter();
  const toast = useToast();

  const items = cart.items || [];
  const [methodsList, setMethodsList] = useState<PaymentMethodConfig[]>(paymentMethods);

  // Realtime Listener for payment_methods table
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("student-checkout-payment-methods")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_methods" },
        async () => {
          const { data } = await supabase
            .from("payment_methods")
            .select("*");
          if (data) setMethodsList(data as PaymentMethodConfig[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Determine active payment options dynamically
  const isQRActive = methodsList.length === 0 || methodsList.some((m) => m.type === "QR_PAYMENT" && m.is_active !== false);
  const isCashActive = methodsList.some((m) => m.type === "CASH" && m.is_active === true);

  const [selectedMethod, setSelectedMethod] = useState<"QR_PAYMENT" | "CASH">(
    isQRActive ? "QR_PAYMENT" : "CASH"
  );
  
  // Ensure selected method stays valid if admin toggles OFF currently selected method
  useEffect(() => {
    if (selectedMethod === "CASH" && !isCashActive && isQRActive) {
      setSelectedMethod("QR_PAYMENT");
    } else if (selectedMethod === "QR_PAYMENT" && !isQRActive && isCashActive) {
      setSelectedMethod("CASH");
    }
  }, [isQRActive, isCashActive, selectedMethod]);

  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Subtotal calculations
  const totalAmount = items.reduce((sum, item) => {
    const base = Number(item.product?.base_price) || 0;
    const sizeAdj = Number(item.size?.price_adjustment) || 0;
    return sum + (base + sizeAdj) * item.quantity;
  }, 0);

  const qrConfig = methodsList.find((m) => m.type === "QR_PAYMENT");
  const promptPayNo = qrConfig?.promptpay_no || "0812345678";
  const promptPayPayload = generatePromptPayPayload(promptPayNo, totalAmount);
  const cashInstruction = methodsList.find((m) => m.type === "CASH")?.instruction || "กรุณาชำระเงินสดให้กับคณะกรรมการจัดทำเสื้อประจำสาขา เพื่อให้กรรมการทำการยืนยันการรับเงินในระบบ";

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("ขนาดไฟล์สลิปต้องไม่เกิน 5MB");
        return;
      }
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
      setErrorMsg("");
      toast.success("แนบไฟล์สลิปโอนเงินเรียบร้อยแล้ว");
    }
  };

  const handleSubmitOrder = async () => {
    // Validate: If QR Payment, slip file MUST be uploaded first!
    if (selectedMethod === "QR_PAYMENT" && !slipFile) {
      toast.error("กรุณาอัปโหลดสลิปหลักฐานการโอนเงินก่อนยืนยันการสั่งซื้อ");
      setErrorMsg("กรุณาอัปโหลดสลิปหลักฐานการโอนเงินก่อนยืนยันการสั่งซื้อ");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    let uploadedSlipUrl: string | undefined = undefined;

    // Upload slip if QR payment
    if (selectedMethod === "QR_PAYMENT" && slipFile) {
      const supabase = createClient();
      const fileExt = slipFile.name.split(".").pop();
      const fileName = `${profile?.id || "anon"}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("slips")
        .upload(filePath, slipFile);

      if (uploadErr) {
        const { data: pubUrl } = supabase.storage.from("slips").getPublicUrl(filePath);
        uploadedSlipUrl = pubUrl.publicUrl;
      } else {
        const { data: pubUrl } = supabase.storage.from("slips").getPublicUrl(uploadData.path);
        uploadedSlipUrl = pubUrl.publicUrl;
      }
    }

    const res = await createOrderFromCart({
      payment_method: selectedMethod,
      slip_url: uploadedSlipUrl,
    });

    setSubmitting(false);

    if (!res.success || !res.orderId) {
      toast.error(res.error || "เกิดข้อผิดพลาดในการยืนยันคำสั่งซื้อ");
      setErrorMsg(res.error || "เกิดข้อผิดพลาดในการยืนยันคำสั่งซื้อ");
    } else {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("app:order-changed"));
        window.dispatchEvent(new CustomEvent("app:cart-changed"));
      }
      toast.success("สั่งซื้อเสื้อสำเร็จเรียบร้อยแล้ว!");
      router.push(`/order-success/${res.orderId}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header (No subtitle, clean Thai) */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-blue-600" />
          <span>ชำระเงินและยืนยันคำสั่งซื้อ</span>
        </h1>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Student Details & Payment Method Selection & Slip Upload */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Student Profile Info */}
          <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>ข้อมูลผู้สั่งซื้อ</span>
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

          {/* 2. Payment Method Selector */}
          <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span>เลือกช่องทางการชำระเงิน</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* QR Payment Option */}
                {isQRActive && (
                  <button
                    type="button"
                    onClick={() => setSelectedMethod("QR_PAYMENT")}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      selectedMethod === "QR_PAYMENT"
                        ? "border-blue-600 bg-blue-50/50 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${selectedMethod === "QR_PAYMENT" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                        <QrCode className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">คิวอาร์โค้ด พร้อมเพย์</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">สแกนชำระเงินอัตโนมัติ</p>
                      </div>
                    </div>
                  </button>
                )}

                {/* Cash Payment Option */}
                {isCashActive && (
                  <button
                    type="button"
                    onClick={() => setSelectedMethod("CASH")}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      selectedMethod === "CASH"
                        ? "border-blue-600 bg-blue-50/50 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${selectedMethod === "CASH" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">ชำระเงินสด</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">จ่ายกับกรรมการสาขา</p>
                      </div>
                    </div>
                  </button>
                )}

              </div>

              {/* QR Code Presentation Box */}
              {selectedMethod === "QR_PAYMENT" && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                      <QRCodeSVG value={promptPayPayload} size={180} level="M" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-800">
                        {qrConfig?.name || "พร้อมเพย์ สาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT"}
                      </span>
                      <p className="text-xs text-slate-500 font-mono">
                        เลขพร้อมเพย์: {promptPayNo}
                      </p>
                      <p className="text-lg font-black text-blue-600 pt-1">
                        ยอดที่ต้องชำระ: ฿{totalAmount.toLocaleString()}
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-400 max-w-xs">
                      * สามารถเปิดแอปพลิเคชันธนาคารเพื่อสแกน QR Code นี้ แล้วแนบสลิปด้านล่าง
                    </p>
                  </div>

                  {/* Slip Upload Area */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      แนบไฟล์สลิปหลักฐานการโอนเงิน *
                    </label>

                    <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSlipChange}
                        className="hidden"
                        id="slip-upload-input"
                      />
                      <label htmlFor="slip-upload-input" className="cursor-pointer block space-y-2">
                        {slipPreview ? (
                          <div className="space-y-2">
                            <div className="relative h-40 max-w-xs mx-auto rounded-xl overflow-hidden border border-slate-200">
                              <Image src={slipPreview} alt="Slip Preview" fill className="object-contain" />
                            </div>
                            <span className="text-xs text-blue-600 font-bold block hover:underline">
                              คลิกเพื่อเปลี่ยนรูปสลิป
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                            <span className="text-xs font-bold text-slate-700 block">
                              คลิกเพื่ออัปโหลดรูปภาพสลิปโอนเงิน
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              รองรับไฟล์ JPG, PNG (ขนาดไม่เกิน 5MB)
                            </span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash Instructions */}
              {selectedMethod === "CASH" && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-amber-700" />
                      <span>ขั้นตอนการชำระเงินสด:</span>
                    </p>
                    <p className="leading-relaxed">{cashInstruction}</p>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

        </div>

        {/* Right Column: Order Summary & Checkout Button */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 bg-white rounded-2xl shadow-md sticky top-24">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                รายการสั่งซื้อ ({items.length} ชิ้น)
              </h2>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-2">
                {items.map((item) => {
                  const sportType = extractSportType(item);
                  return (
                    <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {item.product?.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-500">
                            ไซส์: {item.size?.size_name} • {item.quantity} ชิ้น
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getSportBadgeColor(sportType)}`}>
                            {sportType}
                          </span>
                        </div>
                        {item.custom_name && (
                          <span className="text-[10px] text-blue-600 block mt-0.5">
                            ชื่อ: {item.custom_name} {item.custom_number ? `#${item.custom_number}` : ""}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-900">
                        ฿{((Number(item.product?.base_price) + Number(item.size?.price_adjustment || 0)) * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>ค่าจัดส่ง / รับสินค้า</span>
                  <span className="font-bold text-slate-900">ฟรี (รับที่สาขา)</span>
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
                className="w-full h-12 text-base font-bold rounded-xl shadow-md bg-blue-600 hover:bg-blue-500 text-white mt-2"
              >
                <CheckCircle className="h-5 w-5 mr-1.5" />
                <span>ยืนยันการสั่งซื้อ</span>
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
