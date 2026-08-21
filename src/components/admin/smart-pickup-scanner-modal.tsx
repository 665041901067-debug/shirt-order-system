"use client";

import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Order } from "@/types";
import { updateOrderStatus } from "@/services/admin";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, 
  X, 
  CheckCircle2, 
  Search, 
  AlertCircle, 
  Sparkles,
  Camera,
  Shirt,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { extractSportType } from "@/lib/sports";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onOrderCompleted: (orderId: string) => void;
}

export function SmartPickupScannerModal({ isOpen, onClose, orders, onOrderCompleted }: Props) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "reader-camera-view";

  // Play audio chime when QR scan succeeds
  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio not supported or blocked
    }
  };

  const handleVerifyAndComplete = async (targetOrder: Order) => {
    // Check if payment is verified
    const isPaid =
      targetOrder.payment?.status === "VERIFIED" ||
      ["PAID", "ORDER_ACCEPTED", "READY_FOR_PICKUP"].includes(targetOrder.status);

    if (!isPaid) {
      const msg = `ออเดอร์ #${targetOrder.order_number} ยังไม่ได้ผ่านการอนุมัติชำระเงิน กรุณาอนุมัติสลิปก่อนส่งมอบสินค้า`;
      setErrorMsg(msg);
      toast.warning(msg);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const res = await updateOrderStatus(targetOrder.id, "COMPLETED");
    setSubmitting(false);

    if (res.success) {
      playSuccessSound();
      setSuccessOrder(targetOrder);
      toast.success(`รับสินค้าเสร็จสิ้น! ออเดอร์ #${targetOrder.order_number}`);
      onOrderCompleted(targetOrder.id);
      stopCamera();
    } else {
      setErrorMsg(res.error || "ไม่สามารถเปลี่ยนสถานะรับสินค้าได้");
    }
  };

  const processDecodedText = (decodedText: string) => {
    if (!decodedText) return;

    const raw = decodedText.trim().toLowerCase();
    const cleanQ = raw.replace(/^#/, "").trim();
    
    // Find order
    const match = orders.find((o) => {
      const orderNumClean = o.order_number.toLowerCase().replace(/^#/, "").trim();
      const isOrderNum =
        orderNumClean.includes(cleanQ) ||
        o.order_number.toLowerCase().includes(raw) ||
        (cleanQ.length >= 3 && orderNumClean.includes(cleanQ));

      const isStudentId =
        o.profile?.student_id?.toLowerCase().includes(raw) ||
        o.profile?.student_id?.toLowerCase().includes(cleanQ);

      const isOrderId =
        o.id.toLowerCase().includes(raw) ||
        o.id.toLowerCase().includes(cleanQ);

      const isPayload =
        raw.includes(o.id.toLowerCase()) ||
        raw.includes(o.order_number.toLowerCase()) ||
        `order_verify:${o.id.toLowerCase()}:${o.order_number.toLowerCase()}`.includes(raw) ||
        `order:${o.id.toLowerCase()}`.includes(raw);

      return isOrderNum || isStudentId || isOrderId || isPayload;
    });

    if (match) {
      handleVerifyAndComplete(match);
    } else {
      setErrorMsg(`สแกนพบข้อมูล "${decodedText}" แต่ไม่พบออเดอร์ตรงกันในระบบ`);
    }
  };

  // Start Live Camera Reader
  const startCamera = async () => {
    try {
      setCameraError("");
      setCameraActive(true);

      const html5Qrcode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          processDecodedText(decodedText);
        },
        () => {
          // Frame scan failure - ignore
        }
      );
    } catch (err: any) {
      setCameraActive(false);
      setCameraError("ไม่สามารถเปิดกล้องได้ โปรดอนุญาตการใช้กล้องในเบราว์เซอร์ หรือใช้วิธีพิมพ์ค้นหาแทน");
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // ignore cleanup error
      }
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen && !successOrder) {
      // Auto start camera when modal opens
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, successOrder]);

  const handleModalClose = () => {
    stopCamera();
    onClose();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setErrorMsg("");
    setSuccessOrder(null);
    processDecodedText(query);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <Card className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl space-y-4">
        <CardContent className="p-6 space-y-4">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600 animate-pulse" />
              <span>สแกนกล้อง QR Code รับสินค้า (Live Camera Scanner)</span>
            </h3>
            <button
              onClick={handleModalClose}
              className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Success Screen */}
          {successOrder ? (
            <div className="p-6 bg-emerald-50 border-2 border-emerald-200 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
              <div className="h-16 w-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h4 className="text-xl font-extrabold text-emerald-900">รับสินค้าเสร็จสิ้นเรียบร้อย!</h4>
              
              <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-xs text-left space-y-1.5 shadow-xs">
                <p className="font-mono font-extrabold text-blue-600 text-sm">ออเดอร์: #{successOrder.order_number}</p>
                <p className="font-bold text-slate-900 text-xs">
                  ผู้รับ: {successOrder.profile?.first_name} {successOrder.profile?.last_name} ({successOrder.profile?.student_id})
                </p>
                <div className="text-slate-700 text-xs space-y-1 pt-1 border-t border-emerald-100">
                  <span className="font-bold block text-slate-800">รายการเสื้อ:</span>
                  {successOrder.items?.map((i) => (
                    <div key={i.id} className="flex items-center gap-1.5 text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span>• {i.product_name_snapshot} ({i.size_name_snapshot})</span>
                      <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        {extractSportType(i)}
                      </span>
                      {i.custom_name && <span className="text-blue-600">[{i.custom_name} #{i.custom_number}]</span>}
                    </div>
                  ))}
                </div>
                <Badge variant="success" className="mt-2">
                  สถานะ: รับสินค้าเสร็จสิ้น
                </Badge>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => {
                    setSuccessOrder(null);
                    setQuery("");
                    startCamera();
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  <span>เปิดกล้องสแกนออเดอร์ถัดไป</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* LIVE CAMERA VIEW CONTAINER */}
              <div className="relative aspect-square w-full bg-slate-950 rounded-3xl overflow-hidden shadow-inner border-2 border-slate-800 flex items-center justify-center">
                <div id={readerElementId} className="w-full h-full object-cover" />

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white space-y-3 bg-slate-950">
                    <Camera className="h-12 w-12 text-blue-500 opacity-60" />
                    <p className="text-xs text-slate-400">
                      {cameraError || "กำลังขอสิทธิ์เปิดใช้งานกล้องถ่ายรูป..."}
                    </p>
                    <Button size="sm" onClick={startCamera} className="rounded-xl text-xs">
                      เปิดกล้องอีกครั้ง
                    </Button>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Manual Input Fallback */}
              <form onSubmit={handleSearchSubmit} className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block">
                  หรือ พิมพ์ค้นหาด้วยเลขคำสั่งซื้อ / รหัสนักศึกษา (สำรอง):
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="เช่น #CS-2026-00001, 665041901067..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="text-xs h-10 rounded-xl font-mono"
                  />
                  <Button
                    type="submit"
                    isLoading={submitting}
                    className="h-10 text-xs rounded-xl bg-blue-600 text-white whitespace-nowrap px-4"
                  >
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    <span>ยืนยัน</span>
                  </Button>
                </div>
              </form>

            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
