"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { PaymentMethodConfig } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { generatePromptPayPayload } from "@/lib/promptpay";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  QrCode, 
  Banknote, 
  Save, 
  Check, 
  Plus, 
  Trash2, 
  Sparkles, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

interface Props {
  initialMethods: PaymentMethodConfig[];
}

export function AdminPaymentsInteractive({ initialMethods }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [methods, setMethods] = useState<PaymentMethodConfig[]>(initialMethods);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setMethods(initialMethods);
  }, [initialMethods]);

  // Realtime Live Sync for Payment Methods
  useEffect(() => {
    const supabase = createClient();

    const fetchLatestMethods = async () => {
      try {
        const { data } = await supabase.from("payment_methods").select("*");
        if (data) setMethods(data as PaymentMethodConfig[]);
      } catch (e) {}
    };

    const channel = supabase
      .channel("admin-payments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_methods" },
        () => {
          fetchLatestMethods();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fallback default methods if table in DB is empty
  const qrMethodInState = methods.find((m) => m.type === "QR_PAYMENT");
  const qrIsActive = qrMethodInState ? qrMethodInState.is_active : true;
  const qrId = qrMethodInState?.id;

  const [promptPayNo, setPromptPayNo] = useState(qrMethodInState?.promptpay_no || "0812345678");
  const [accountName, setAccountName] = useState(qrMethodInState?.account_name || "สาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT");
  const [bankName, setBankName] = useState(qrMethodInState?.bank_name || "ธนาคารกรุงไทย");

  const cashMethodInState = methods.find((m) => m.type === "CASH");
  const cashIsActive = cashMethodInState ? cashMethodInState.is_active : true;
  const cashId = cashMethodInState?.id;

  const [cashInstruction, setCashInstruction] = useState(cashMethodInState?.instruction || "ชำระเงินสดกับกรรมการสาขา ณ ห้อง Lab IoT");

  // Generate live EMVCo PromptPay preview payload
  const sampleAmount = 350;
  const livePromptPayPayload = generatePromptPayPayload(promptPayNo, sampleAmount);

  const handleSaveQRMethod = async () => {
    setLoadingId("QR_PAYMENT");
    const supabase = createClient();

    const payloadToUpsert: any = {
      name: "QR PromptPay / โอนผ่านธนาคาร",
      type: "QR_PAYMENT",
      account_name: accountName,
      promptpay_no: promptPayNo,
      bank_name: bankName,
      is_active: qrIsActive,
      updated_at: new Date().toISOString(),
    };

    if (qrId) payloadToUpsert.id = qrId;

    const { data, error } = await supabase
      .from("payment_methods")
      .upsert(payloadToUpsert)
      .select()
      .single();

    setLoadingId(null);
    if (!error && data) {
      toast.success("บันทึกการตั้งค่า QR PromptPay เรียบร้อยแล้ว!");
      setMethods((prev) => {
        const filtered = prev.filter((m) => m.type !== "QR_PAYMENT");
        return [...filtered, data as PaymentMethodConfig];
      });
      router.refresh();
    } else {
      toast.error(error?.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleSaveCashMethod = async () => {
    setLoadingId("CASH");
    const supabase = createClient();

    const payloadToUpsert: any = {
      name: "ชำระเงินสด (Cash)",
      type: "CASH",
      instruction: cashInstruction,
      is_active: cashIsActive,
      updated_at: new Date().toISOString(),
    };

    if (cashId) payloadToUpsert.id = cashId;

    const { data, error } = await supabase
      .from("payment_methods")
      .upsert(payloadToUpsert)
      .select()
      .single();

    setLoadingId(null);
    if (!error && data) {
      toast.success("บันทึกการตั้งค่าการชำระเงินสดเรียบร้อยแล้ว!");
      setMethods((prev) => {
        const filtered = prev.filter((m) => m.type !== "CASH");
        return [...filtered, data as PaymentMethodConfig];
      });
      router.refresh();
    } else {
      toast.error(error?.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleToggleActive = async (type: "QR_PAYMENT" | "CASH", currentActive: boolean) => {
    const method = methods.find((m) => m.type === type);
    const newActive = !currentActive;

    const supabase = createClient();
    if (method?.id) {
      const { error } = await supabase
        .from("payment_methods")
        .update({ is_active: newActive })
        .eq("id", method.id);

      if (!error) {
        setMethods((prev) =>
          prev.map((m) => (m.type === type ? { ...m, is_active: newActive } : m))
        );
        toast.success(newActive ? "เปิดใช้งานช่องทางชำระเงินแล้ว" : "ปิดใช้งานช่องทางชำระเงินแล้ว");
        router.refresh();
      }
    } else {
      // Upsert new method with active status
      const payload: any = {
        name: type === "QR_PAYMENT" ? "QR PromptPay / โอนผ่านธนาคาร" : "ชำระเงินสด (Cash)",
        type,
        is_active: newActive,
        promptpay_no: promptPayNo,
        account_name: accountName,
        bank_name: bankName,
        instruction: cashInstruction,
      };

      const { data } = await supabase.from("payment_methods").upsert(payload).select().single();
      if (data) {
        setMethods((prev) => [...prev.filter((m) => m.type !== type), data as PaymentMethodConfig]);
        toast.success(newActive ? "เปิดใช้งานช่องทางชำระเงินแล้ว" : "ปิดใช้งานช่องทางชำระเงินแล้ว");
        router.refresh();
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header (No subtitle, clean Thai) */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-blue-600" />
          <span>ตั้งค่าช่องทางชำระเงิน</span>
        </h1>
      </div>

      {/* Standards Notice */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block text-blue-950">
            ระบบคิวอาร์โค้ดพร้อมเพย์มาตรฐานแห่งประเทศไทย
          </span>
          <p className="text-slate-600 leading-relaxed">
            รองรับการสแกนจ่ายผ่านแอปพลิเคชันทุกธนาคารในประเทศไทย 
            เมื่อนักศึกษาสแกน ระบบจะระบุยอดเงินที่ต้องชำระให้อัตโนมัติทันที
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* QR PromptPay Config Card */}
        <Card className="lg:col-span-7 border-slate-200 bg-white rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="bg-blue-50/60 border-b border-blue-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-xs">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    QR PromptPay / โอนผ่านธนาคาร
                  </CardTitle>
                  <span className="text-[11px] text-blue-600 font-semibold">Dynamic EMVCo QR Code</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={qrIsActive ? "primary" : "outline"}
                  onClick={() => handleToggleActive("QR_PAYMENT", qrIsActive)}
                  className="rounded-xl text-xs"
                >
                  {qrIsActive ? "เปิดใช้งานอยู่" : "ปิดใช้งาน"}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            <div className="space-y-3">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">ชื่อบัญชีรับเงิน *</label>
                <Input
                  placeholder="เช่น สาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  หมายเลข PromptPay (เบอร์โทร 10 หลัก หรือ เลขประจำตัวผู้เสียภาษี 13 หลัก) *
                </label>
                <Input
                  placeholder="เช่น 0812345678"
                  value={promptPayNo}
                  onChange={(e) => setPromptPayNo(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">ธนาคารเจ้าของบัญชี</label>
                <Input
                  placeholder="เช่น ธนาคารกรุงไทย"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <Button
                onClick={handleSaveQRMethod}
                isLoading={loadingId === "QR_PAYMENT"}
                className="w-full mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md font-bold"
              >
                <Save className="h-4 w-4 mr-1.5" />
                <span>บันทึกการตั้งค่า PromptPay</span>
              </Button>
            </div>

            {/* LIVE QR CODE PREVIEW PANEL */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span>ตัวอย่าง QR Code สแกนจ่ายจริง (Live Preview)</span>
                </span>
                <Badge variant="success" size="sm">EMVCo Valid</Badge>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <div className="bg-white p-3 rounded-2xl shadow-md shrink-0">
                  <QRCodeSVG value={livePromptPayPayload} size={110} />
                </div>

                <div className="space-y-1 text-xs text-center sm:text-left">
                  <p className="font-bold text-white text-sm">{accountName || "ชื่อบัญชี"}</p>
                  <p className="text-slate-300 font-mono">PromptPay: {promptPayNo}</p>
                  <p className="text-slate-400">ธนาคาร: {bankName}</p>
                  <p className="text-blue-400 font-bold mt-1">
                    ทดสอบยอดจ่ายอัตโนมัติ: ฿{sampleAmount.toFixed(2)} บาท
                  </p>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Cash Config Card */}
        <Card className="lg:col-span-5 border-slate-200 bg-white rounded-3xl shadow-xs overflow-hidden">
          <CardHeader className="bg-emerald-50/60 border-b border-emerald-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-xs">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    ชำระเงินสด (Cash)
                  </CardTitle>
                  <span className="text-[11px] text-emerald-600 font-semibold">In-person Cash Payment</span>
                </div>
              </div>

              <Button
                size="sm"
                variant={cashIsActive ? "primary" : "outline"}
                onClick={() => handleToggleActive("CASH", cashIsActive)}
                className="rounded-xl text-xs"
              >
                {cashIsActive ? "เปิดใช้งานอยู่" : "ปิดใช้งาน"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">คำแนะนำสถานที่ชำระเงินสด</label>
                <Input
                  placeholder="เช่น ชำระกับกรรมการสาขา ณ ห้อง Lab IoT"
                  value={cashInstruction}
                  onChange={(e) => setCashInstruction(e.target.value)}
                />
              </div>

              <Button
                onClick={handleSaveCashMethod}
                isLoading={loadingId === "CASH"}
                className="w-full mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md font-bold"
              >
                <Save className="h-4 w-4 mr-1.5" />
                <span>บันทึกการตั้งค่าเงินสด</span>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
