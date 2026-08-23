"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Order, OrderStatus, PaymentStatus } from "@/types";
import { updateOrderStatus, verifyPayment, clearAllOrdersData } from "@/services/admin";
import { getStatusBadgeVariant, getStatusLabel } from "@/lib/order-status";
import { createClient } from "@/lib/supabase/client";
import { SmartPickupScannerModal } from "./smart-pickup-scanner-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingBag, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileCheck,
  AlertCircle,
  ExternalLink,
  QrCode,
  CheckSquare,
  Square,
  Ban,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Edit3,
  Trash2
} from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { SPORT_TYPES, extractSportType, getSportBadgeColor } from "@/lib/sports";

interface Props {
  initialOrders: Order[];
}

const ALL_STATUSES: { key: OrderStatus; label: string; dotColor: string }[] = [
  { key: "PENDING_PAYMENT", label: "รอชำระเงิน", dotColor: "bg-amber-500" },
  { key: "PAYMENT_REVIEW", label: "รอตรวจสอบสลิป", dotColor: "bg-blue-500" },
  { key: "ORDER_ACCEPTED", label: "อนุมัติแล้ว", dotColor: "bg-emerald-500" },
  { key: "READY_FOR_PICKUP", label: "พร้อมรับสินค้า", dotColor: "bg-teal-500" },
  { key: "COMPLETED", label: "รับสินค้าแล้ว", dotColor: "bg-slate-500" },
  { key: "CANCELLED", label: "ยกเลิก", dotColor: "bg-red-500" },
];

export function AdminOrdersInteractive({ initialOrders }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState("");
  
  // Smart Filters State
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>("ALL");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("ALL");
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>("ALL");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Selection state for Batch Actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [batchTargetStatus, setBatchTargetStatus] = useState<OrderStatus>("ORDER_ACCEPTED");

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Quick Status Change Modal state
  const [activeOrderForStatusChange, setActiveOrderForStatusChange] = useState<Order | null>(null);

  // Slip Modal state & Edit toggle
  const [activeOrderForSlip, setActiveOrderForSlip] = useState<Order | null>(null);
  const [isEditingSlipStatus, setIsEditingSlipStatus] = useState(false);

  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingOrders, setIsClearingOrders] = useState(false);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState("");

  const handleClearAllOrders = async () => {
    setIsClearingOrders(true);
    // 1. Instant Optimistic clear (0ms)
    setOrders([]);
    setIsClearAllModalOpen(false);
    toast.success("ล้างข้อมูลคำสั่งซื้อทดลองทั้งหมดเรียบร้อยแล้ว (ระบบพร้อมเริ่มต้นใหม่อัตโนมัติ)");

    // 2. Backend clear
    const res = await clearAllOrdersData();
    setIsClearingOrders(false);
    if (!res.success) {
      toast.error(res.error || "เกิดข้อผิดพลาดในการล้างข้อมูลคำสั่งซื้อ");
    }
  };

  const handleConfirmCashPayment = async (orderId: string, paymentId?: string) => {
    setLoadingAction(orderId);
    // 1. Instant optimistic state update (0ms)
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: "ORDER_ACCEPTED",
            payment: o.payment
              ? { ...o.payment, payment_method: "CASH", status: "VERIFIED" }
              : undefined,
          };
        }
        return o;
      })
    );
    toast.success("ยืนยันรับชำระเงินสดเรียบร้อยแล้ว! ออเดอร์เปลี่ยนเป็น 'อนุมัติแล้ว'");

    // 2. Backend update
    if (paymentId) {
      await verifyPayment(paymentId, "VERIFIED", "ยืนยันการรับชำระเงินสด");
    } else {
      await updateOrderStatus(orderId, "ORDER_ACCEPTED", "ยืนยันการรับชำระเงินสดเรียบร้อยแล้ว");
    }
    setLoadingAction(null);
  };

  // Supabase Realtime for Admin Orders Table
  useEffect(() => {
    const supabase = createClient();

    const fetchLatestOrders = async () => {
      try {
        const { data } = await supabase
          .from("orders")
          .select(`
            *,
            items:order_items(*),
            payment:payments(*),
            profile:profiles(*)
          `)
          .order("created_at", { ascending: false });

        if (data) setOrders(data as Order[]);
      } catch (e) {}
    };

    const channel = supabase
      .channel(`admin-orders-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchLatestOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          fetchLatestOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => {
          fetchLatestOrders();
        }
      )
      .subscribe();

    window.addEventListener("app:order-changed", fetchLatestOrders);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("app:order-changed", fetchLatestOrders);
    };
  }, []);

  // Filter Orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.profile?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.profile?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.profile?.student_id?.includes(search);

    const matchesStatus =
      selectedStatusFilter === "ALL" ||
      o.status === selectedStatusFilter ||
      (selectedStatusFilter === "ORDER_ACCEPTED" && (o.status === "PAID" || o.status === "PREPARING" || o.status === "PRODUCTION"));

    const matchesPayment =
      selectedPaymentFilter === "ALL" ||
      o.payment?.payment_method === selectedPaymentFilter;

    const matchesYear =
      selectedYearFilter === "ALL" ||
      (o.profile?.academic_year && o.profile.academic_year.includes(selectedYearFilter));

    const matchesSport =
      selectedSportFilter === "ALL" ||
      o.items?.some((item) => extractSportType(item) === selectedSportFilter);

    return matchesSearch && matchesStatus && matchesPayment && matchesYear && matchesSport;
  });

  const hasActiveFilters = selectedStatusFilter !== "ALL" || selectedPaymentFilter !== "ALL" || selectedYearFilter !== "ALL" || selectedSportFilter !== "ALL" || search.trim() !== "";

  const handleResetFilters = () => {
    setSelectedStatusFilter("ALL");
    setSelectedPaymentFilter("ALL");
    setSelectedYearFilter("ALL");
    setSelectedSportFilter("ALL");
    setSearch("");
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Select all handler
  const isAllSelected = filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length;
  
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Single Order Status Change with Instant Optimistic UI (0ms feedback)
  const handleStatusChange = async (targetOrder: Order, newStatus: OrderStatus) => {
    setWarningMsg("");

    const isPaid = targetOrder.payment?.status === "VERIFIED" || ["PAID", "ORDER_ACCEPTED", "READY_FOR_PICKUP", "COMPLETED"].includes(targetOrder.status);

    if (["READY_FOR_PICKUP", "COMPLETED"].includes(newStatus) && !isPaid) {
      const msg = `ออเดอร์ #${targetOrder.order_number} ยังไม่ได้ผ่านการอนุมัติชำระเงิน กรุณาอนุมัติสลิปชำระเงินก่อนเปลี่ยนสถานะ`;
      setWarningMsg(msg);
      toast.warning(msg);
      return;
    }

    const previousStatus = targetOrder.status;

    // 1. Instant Optimistic UI (0ms)
    setOrders((prev) =>
      prev.map((o) => (o.id === targetOrder.id ? { ...o, status: newStatus } : o))
    );
    setActiveOrderForStatusChange(null);
    toast.success(`เปลี่ยนสถานะออเดอร์ #${targetOrder.order_number} เป็น "${getStatusLabel(newStatus)}" เรียบร้อยแล้ว`);

    // 2. Backend update
    const res = await updateOrderStatus(targetOrder.id, newStatus);
    if (!res.success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === targetOrder.id ? { ...o, status: previousStatus } : o))
      );
      toast.error("เกิดข้อผิดพลาดในการบันทึกสถานะ");
    }
  };

  // Batch Status Change for Multiple Selected Orders with Instant Optimistic UI (0ms feedback)
  const handleBatchStatusChange = async () => {
    if (selectedOrderIds.length === 0) return;

    setWarningMsg("");
    const idsToUpdate = [...selectedOrderIds];

    // 1. Instant Optimistic State update (0ms)
    setOrders((prev) =>
      prev.map((o) => (idsToUpdate.includes(o.id) ? { ...o, status: batchTargetStatus } : o))
    );
    setSelectedOrderIds([]);
    toast.success(`อัปเดตสถานะสำเร็จจำนวน ${idsToUpdate.length} รายการ`);

    // 2. Run backend updates in parallel
    const promises = idsToUpdate.map((id) => updateOrderStatus(id, batchTargetStatus));
    await Promise.allSettled(promises);
  };

  const handleVerifyPayment = async (paymentId: string, orderId: string, newPaymentStatus: PaymentStatus) => {
    const targetOrderStatus: OrderStatus = newPaymentStatus === "VERIFIED" ? "ORDER_ACCEPTED" : "CANCELLED";
    const previousOrder = orders.find(o => o.id === orderId);

    // 1. Instant Optimistic update
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: targetOrderStatus,
            payment: o.payment ? { ...o.payment, status: newPaymentStatus } : undefined,
          };
        }
        return o;
      })
    );
    setActiveOrderForSlip(null);
    setIsEditingSlipStatus(false);

    if (newPaymentStatus === "VERIFIED") {
      toast.success("อนุมัติการชำระเงินเรียบร้อยแล้ว!");
    } else {
      toast.error("ปฏิเสธสลิปการชำระเงินเรียบร้อยแล้ว");
    }

    // 2. Backend update
    await verifyPayment(paymentId, newPaymentStatus);
  };

  return (
    <div className="space-y-6">
      
      {/* Smart Scanner Modal */}
      <SmartPickupScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        orders={orders}
        onOrderCompleted={(completedOrderId) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === completedOrderId ? { ...o, status: "COMPLETED" } : o))
          );
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-blue-600" />
            <span>จัดการคำสั่งซื้อ</span>
          </h1>
        </div>

        {/* Action Buttons: Clear Orders, Smart Scanner & Filter Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsClearAllModalOpen(true)}
            className="rounded-xl text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all shadow-xs"
            title="ล้างข้อมูลคำสั่งซื้อทดลองทั้งหมดเพื่อเริ่มระบบใหม่"
          >
            <Trash2 className="h-4 w-4 mr-1.5 text-red-500" />
            <span>ล้างออเดอร์ทั้งหมด (เป็น 0)</span>
          </Button>

          <Button
            onClick={() => setIsScannerOpen(true)}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-md text-xs font-bold"
          >
            <QrCode className="h-4 w-4 mr-1.5 text-blue-400" />
            <span>สแกนคิวอาร์โค้ดรับสินค้า</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`rounded-xl text-xs font-bold transition-all ${
              isFilterExpanded || hasActiveFilters
                ? "bg-blue-50 text-blue-600 border-blue-300"
                : "text-slate-700 border-slate-200"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            <span>ตัวกรอง</span>
            {hasActiveFilters && (
              <span className="ml-1.5 h-2 w-2 rounded-full bg-blue-600 inline-block" />
            )}
          </Button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="w-full">
        <Input
          placeholder="ค้นหาเลขคำสั่งซื้อ รหัสนักศึกษา ชื่อผู้สั่ง..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl text-xs h-11 bg-white shadow-xs"
        />
      </div>

      {/* Warning Notice Banner */}
      {warningMsg && (
        <div className="p-3 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{warningMsg}</span>
          </div>
          <button onClick={() => setWarningMsg("")} className="font-bold text-amber-600 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Smart Responsive Filter Panel (No Horizontal Scrolling) */}
      <Card className="border-slate-200/80 bg-white rounded-2xl p-4 shadow-xs space-y-3">
        {/* Status Filter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">สถานะคำสั่งซื้อ:</span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-bold"
              >
                <RotateCcw className="h-3 w-3" />
                <span>ล้างตัวกรองทั้งหมด</span>
              </button>
            )}
          </div>

          {/* Desktop Wrap Buttons */}
          <div className="hidden sm:flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setSelectedStatusFilter("ALL");
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStatusFilter === "ALL"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              ทั้งหมด ({orders.length})
            </button>

            {ALL_STATUSES.map((st) => {
              const count = orders.filter((o) => {
                if (st.key === "ORDER_ACCEPTED") {
                  return o.status === "ORDER_ACCEPTED" || o.status === "PAID" || o.status === "PREPARING" || o.status === "PRODUCTION";
                }
                return o.status === st.key;
              }).length;

              return (
                <button
                  key={st.key}
                  onClick={() => {
                    setSelectedStatusFilter(st.key);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedStatusFilter === st.key
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {st.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Mobile Full Width Select */}
          <div className="sm:hidden">
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">ทุกสถานะคำสั่งซื้อ ({orders.length})</option>
              {ALL_STATUSES.map((st) => {
                const count = orders.filter((o) => {
                  if (st.key === "ORDER_ACCEPTED") {
                    return o.status === "ORDER_ACCEPTED" || o.status === "PAID" || o.status === "PREPARING" || o.status === "PRODUCTION";
                  }
                  return o.status === st.key;
                }).length;

                return (
                  <option key={st.key} value={st.key}>
                    {st.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Secondary Filter Row (ช่องทางชำระเงิน, ชั้นปี, ประเภทกีฬา) */}
        {(isFilterExpanded || hasActiveFilters) && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
            {/* Payment Method */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500">ช่องทางชำระเงิน:</span>
              <select
                value={selectedPaymentFilter}
                onChange={(e) => {
                  setSelectedPaymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="ALL">ทุกช่องทางชำระเงิน</option>
                <option value="QR_PAYMENT">พร้อมเพย์ / โอนเงิน</option>
                <option value="CASH">ชำระเงินสด</option>
              </select>
            </div>

            {/* Academic Year */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500">ชั้นปีผู้สั่ง:</span>
              <select
                value={selectedYearFilter}
                onChange={(e) => {
                  setSelectedYearFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="ALL">ทุกชั้นปี</option>
                <option value="ปี 1">ชั้นปีที่ 1</option>
                <option value="ปี 2">ชั้นปีที่ 2</option>
                <option value="ปี 3">ชั้นปีที่ 3</option>
                <option value="ปี 4">ชั้นปีที่ 4</option>
              </select>
            </div>

            {/* Sport Type Filter */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500">ประเภทกีฬา:</span>
              <select
                value={selectedSportFilter}
                onChange={(e) => {
                  setSelectedSportFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="ALL">ทุกประเภทกีฬา</option>
                {SPORT_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Select All Bar (Visible on both Mobile & Desktop) */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between bg-slate-100/80 px-4 py-2.5 rounded-2xl border border-slate-200">
          <button
            onClick={handleToggleSelectAll}
            className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors"
          >
            {isAllSelected ? (
              <CheckSquare className="h-5 w-5 text-blue-600" />
            ) : (
              <Square className="h-5 w-5 text-slate-400" />
            )}
            <span>
              {isAllSelected
                ? `เลือกครบทั้งหมดแล้ว (${filteredOrders.length} รายการ)`
                : `กดเลือกออเดอร์ทั้งหมด (${filteredOrders.length} รายการ)`}
            </span>
          </button>

          {selectedOrderIds.length > 0 && (
            <span className="text-xs font-bold text-blue-600">
              เลือกอยู่ {selectedOrderIds.length} รายการ
            </span>
          )}
        </div>
      )}

      {/* FLOATING BATCH ACTION BAR when 1 or more orders are selected */}
      {selectedOrderIds.length > 0 && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckSquare className="h-5 w-5 text-blue-400" />
            <span>เลือกอยู่ {selectedOrderIds.length} รายการ</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-slate-300">เปลี่ยนสถานะพร้อมกันเป็น:</span>
            <select
              value={batchTargetStatus}
              onChange={(e) => setBatchTargetStatus(e.target.value as OrderStatus)}
              className="text-xs font-semibold bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-1.5"
            >
              {ALL_STATUSES.map((st) => (
                <option key={st.key} value={st.key}>
                  {st.label}
                </option>
              ))}
            </select>

            <Button
              onClick={handleBatchStatusChange}
              isLoading={loadingAction === "batch"}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
            >
              <span>ยืนยันเปลี่ยนสถานะ ({selectedOrderIds.length})</span>
            </Button>

            <button
              onClick={() => setSelectedOrderIds([])}
              className="text-xs text-slate-400 hover:text-white underline ml-2"
            >
              ยกเลิกการเลือก
            </button>
          </div>
        </div>
      )}

      {/* Orders View */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="ไม่พบคำสั่งซื้อ"
          description="ยังไม่มีรายการคำสั่งซื้อตรงกับเงื่อนไขการค้นหา"
        />
      ) : (
        <>
          {/* Mobile Card Stack View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {paginatedOrders.map((order) => {
              const payment = order.payment;
              const isSelected = selectedOrderIds.includes(order.id);

              return (
                <Card key={order.id} className={`border-slate-200 bg-white rounded-2xl p-4 shadow-xs space-y-3 transition-all ${isSelected ? "ring-2 ring-blue-600 bg-blue-50/20" : ""}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleSelectOrder(order.id)} className="text-blue-600 p-1">
                        {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-300" />}
                      </button>
                      <div>
                        <span className="font-extrabold text-blue-600 font-mono text-sm block">
                          #{order.order_number}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(order.created_at).toLocaleDateString("th-TH")}
                        </span>
                      </div>
                    </div>

                    {/* Tap Status Badge to Change Status */}
                    <button
                      onClick={() => setActiveOrderForStatusChange(order)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <Badge variant={getStatusBadgeVariant(order.status)} size="md">
                        {getStatusLabel(order.status)}
                      </Badge>
                    </button>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-bold text-slate-900">
                      ผู้สั่ง: {order.profile?.first_name} {order.profile?.last_name} ({order.profile?.nickname || "ไม่ระบุชื่อเล่น"})
                    </p>
                    <p className="text-slate-500 font-mono">
                      รหัสนักศึกษา: {order.profile?.student_id || "-"} • {order.profile?.academic_year || "ปี 1"}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl space-y-1.5 text-xs border border-slate-100">
                    <span className="font-bold text-slate-700 block">รายการสินค้า ({order.items?.length || 0} ชิ้น):</span>
                    {order.items?.map((item) => {
                      const sport = extractSportType(item);
                      return (
                        <div key={item.id} className="flex flex-wrap items-center gap-1.5 text-slate-700 text-[11px]">
                          <span>• {item.product_name_snapshot} ({item.size_name_snapshot}) × {item.quantity}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getSportBadgeColor(sport)}`}>
                            {sport}
                          </span>
                          {item.custom_name && <span className="text-blue-600 font-semibold">[{item.custom_name} #{item.custom_number}]</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">ยอดรวมสุทธิ</span>
                      <span className="text-base font-extrabold text-slate-900">
                        ฿{Number(order.total_amount).toLocaleString()}
                      </span>
                      <span className="text-[11px] font-bold block mt-0.5">
                        {payment?.status === "VERIFIED" || ["ORDER_ACCEPTED", "PAID", "PREPARING", "PRODUCTION", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status) ? (
                          <span className="text-emerald-600">✓ ชำระแล้ว ({payment?.payment_method === "CASH" ? "เงินสด" : "พร้อมเพย์"})</span>
                        ) : payment?.payment_method === "CASH" ? (
                          <span className="text-amber-600">💵 รอรับเงินสด</span>
                        ) : payment?.slip_url ? (
                          <span className="text-blue-600">💳 รอตรวจสลิป</span>
                        ) : (
                          <span className="text-slate-500">รอชำระเงิน</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {payment?.slip_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveOrderForSlip(order);
                            setIsEditingSlipStatus(false);
                          }}
                          className="rounded-xl text-xs h-9 px-2.5 font-bold"
                        >
                          <FileCheck className="h-4 w-4 mr-1 text-blue-600" />
                          <span>ดูสลิป</span>
                        </Button>
                      )}

                      {payment?.payment_method === "CASH" && order.status === "PENDING_PAYMENT" && (
                        <Button
                          size="sm"
                          isLoading={loadingAction === order.id}
                          onClick={() => handleConfirmCashPayment(order.id, payment?.id)}
                          className="rounded-xl text-xs h-9 px-2.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          <span>รับเงินสด</span>
                        </Button>
                      )}

                      {/* Large Easy-to-Tap Quick Status Change Button */}
                      <Button
                        size="sm"
                        onClick={() => setActiveOrderForStatusChange(order)}
                        className="rounded-xl text-xs h-9 px-2.5 font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" />
                        <span>เปลี่ยนสถานะ</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden md:block border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 w-10">
                      <button onClick={handleToggleSelectAll} className="text-blue-600">
                        {isAllSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-300" />}
                      </button>
                    </th>
                    <th className="p-4">ออเดอร์ / วันที่</th>
                    <th className="p-4">นักศึกษาผู้สั่งซื้อ</th>
                    <th className="p-4">รายการสินค้า</th>
                    <th className="p-4">ยอดรวม</th>
                    <th className="p-4">การชำระเงิน</th>
                    <th className="p-4">สถานะออเดอร์</th>
                    <th className="p-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOrders.map((order) => {
                    const payment = order.payment;
                    const isSelected = selectedOrderIds.includes(order.id);

                    return (
                      <tr key={order.id} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? "bg-blue-50/30" : ""}`}>
                        <td className="p-4">
                          <button onClick={() => handleToggleSelectOrder(order.id)} className="text-blue-600">
                            {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-300" />}
                          </button>
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <span className="font-extrabold text-blue-600 font-mono text-sm block">
                            #{order.order_number}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(order.created_at).toLocaleDateString("th-TH")}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-bold text-slate-900 block">
                            {order.profile?.first_name} {order.profile?.last_name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono block">
                            รหัส: {order.profile?.student_id || "-"} ({order.profile?.academic_year || "ปี 1"})
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-semibold text-slate-800 block">
                            {order.items?.length || 0} รายการ
                          </span>
                          <div className="text-[11px] text-slate-500 space-y-1 mt-0.5 max-w-[260px]">
                            {order.items?.map((i) => {
                              const sport = extractSportType(i);
                              return (
                                <div key={i.id} className="flex flex-wrap items-center gap-1">
                                  <span className="font-medium text-slate-700">{i.product_name_snapshot} ({i.size_name_snapshot})</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getSportBadgeColor(sport)}`}>
                                    {sport}
                                  </span>
                                  {i.custom_name && <span className="text-blue-600 font-mono text-[10px]">[{i.custom_name}]</span>}
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        <td className="p-4 font-black text-slate-900 text-sm whitespace-nowrap">
                          ฿{Number(order.total_amount).toLocaleString()}
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-800 block">
                              {payment?.payment_method === "CASH" ? "เงินสด" : "พร้อมเพย์"}
                            </span>
                            {payment?.status === "VERIFIED" || ["ORDER_ACCEPTED", "PAID", "PREPARING", "PRODUCTION", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status) ? (
                              <Badge variant="success" size="sm">
                                ชำระเงินแล้ว
                              </Badge>
                            ) : payment?.payment_method === "CASH" ? (
                              <Badge variant="warning" size="sm" className="bg-amber-50 text-amber-700 border-amber-200">
                                รอรับเงินสด
                              </Badge>
                            ) : payment?.slip_url ? (
                              <Badge variant="primary" size="sm" className="bg-blue-50 text-blue-700 border-blue-200">
                                รอตรวจสลิป
                              </Badge>
                            ) : (
                              <Badge variant="warning" size="sm">
                                รอชำระเงิน
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <button
                            onClick={() => setActiveOrderForStatusChange(order)}
                            className="text-left cursor-pointer hover:opacity-80 transition-opacity"
                            title="คลิกเพื่อเปลี่ยนสถานะ"
                          >
                            <Badge variant={getStatusBadgeVariant(order.status)}>
                              {getStatusLabel(order.status)}
                            </Badge>
                          </button>
                        </td>

                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center gap-1.5 justify-end">
                            {payment?.slip_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveOrderForSlip(order);
                                  setIsEditingSlipStatus(false);
                                }}
                                className="rounded-xl text-xs font-bold"
                              >
                                <FileCheck className="h-3.5 w-3.5 mr-1 text-blue-600" />
                                <span>ดูสลิป</span>
                              </Button>
                            )}

                            {payment?.payment_method === "CASH" && order.status === "PENDING_PAYMENT" && (
                              <Button
                                size="sm"
                                isLoading={loadingAction === order.id}
                                onClick={() => handleConfirmCashPayment(order.id, payment?.id)}
                                className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                                title="กดยืนยันเมื่อได้รับเงินสดจากนักศึกษาแล้ว"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                <span>ยืนยันรับเงินสด</span>
                              </Button>
                            )}

                            {/* Change Status Button */}
                            <Button
                              size="sm"
                              onClick={() => setActiveOrderForStatusChange(order)}
                              className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white"
                            >
                              <Edit3 className="h-3.5 w-3.5 mr-1" />
                              <span>เปลี่ยนสถานะ</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleStatusChange(order, "CANCELLED")}
                              className="rounded-xl p-2"
                              title="ยกเลิกออเดอร์"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <span>แสดง</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 รายการ / หน้า</option>
                <option value={10}>10 รายการ / หน้า</option>
                <option value={20}>20 รายการ / หน้า</option>
                <option value={50}>50 รายการ / หน้า</option>
              </select>
              <span className="text-slate-400">
                (ทั้งหมด {filteredOrders.length} รายการ)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-xl text-xs"
              >
                ก่อนหน้า
              </Button>
              <span className="font-extrabold text-slate-800 px-2">
                หน้า {safeCurrentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl text-xs"
              >
                ถัดไป
              </Button>
            </div>
          </div>
        </>
      )}

      {/* QUICK STATUS CHANGE MODAL (Pure Title Only, No Sub-descriptions) */}
      {activeOrderForStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <Card className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl space-y-4">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    เปลี่ยนสถานะออเดอร์ #{activeOrderForStatusChange.order_number}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ผู้สั่ง: {activeOrderForStatusChange.profile?.first_name} {activeOrderForStatusChange.profile?.last_name}
                  </p>
                </div>
                <button
                  onClick={() => setActiveOrderForStatusChange(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Status Buttons List (Clean Pure Titles Only) */}
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {ALL_STATUSES.map((st) => {
                  const isCurrent =
                    activeOrderForStatusChange.status === st.key ||
                    (st.key === "ORDER_ACCEPTED" && (activeOrderForStatusChange.status === "PAID" || activeOrderForStatusChange.status === "PREPARING" || activeOrderForStatusChange.status === "PRODUCTION"));

                  return (
                    <button
                      key={st.key}
                      onClick={() => handleStatusChange(activeOrderForStatusChange, st.key)}
                      disabled={loadingAction === activeOrderForStatusChange.id}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isCurrent
                          ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`h-3 w-3 rounded-full ${st.dotColor}`} />
                        <span className="font-bold text-xs text-slate-900">{st.label}</span>
                      </div>

                      {isCurrent && (
                        <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
                          <Check className="h-4 w-4" />
                          <span>ปัจจุบัน</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setActiveOrderForStatusChange(null)}
                  className="w-full rounded-xl text-xs font-bold"
                >
                  ปิดหน้าต่าง
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Slip Verification Modal (With Fixed/Locked State & Edit Toggle) */}
      {activeOrderForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <Card className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl space-y-4">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    ตรวจสอบสลิปการชำระเงิน #{activeOrderForSlip.order_number}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ผู้สั่ง: {activeOrderForSlip.profile?.first_name} {activeOrderForSlip.profile?.last_name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveOrderForSlip(null);
                    setIsEditingSlipStatus(false);
                  }}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Slip Image */}
              {activeOrderForSlip.payment?.slip_url ? (
                <div className="space-y-2">
                  <div className="relative aspect-[3/4] max-h-[45vh] w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
                    <img
                      src={activeOrderForSlip.payment.slip_url}
                      alt="Payment Slip"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <a
                      href={activeOrderForSlip.payment.slip_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>เปิดดูรูปภาพสลิปขนาดเต็มในแท็บใหม่</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-2xl">
                  ไม่มีรูปสลิปการโอนเงิน (เลือกชำระเงินสด หรือยังไม่ได้อัปโหลด)
                </div>
              )}

              {/* PAYMENT STATUS & ACTIONS (Fixed/Locked state with Edit Toggle) */}
              {activeOrderForSlip.payment?.id && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  {/* Case 1: Already VERIFIED */}
                  {activeOrderForSlip.payment.status === "VERIFIED" && !isEditingSlipStatus && (
                    <div className="space-y-2.5">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          <span>อนุมัติการชำระเงินเรียบร้อยแล้ว</span>
                        </div>
                        <Badge variant="success" size="sm">ผ่านการตรวจสอบ</Badge>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setIsEditingSlipStatus(true)}
                        className="w-full rounded-xl text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" />
                        <span>แก้ไขสถานะการชำระเงิน</span>
                      </Button>
                    </div>
                  )}

                  {/* Case 2: Already REJECTED */}
                  {activeOrderForSlip.payment.status === "REJECTED" && !isEditingSlipStatus && (
                    <div className="space-y-2.5">
                      <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                          <span>สลิปนี้ถูกปฏิเสธแล้ว</span>
                        </div>
                        <Badge variant="danger" size="sm">ปฏิเสธแล้ว</Badge>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setIsEditingSlipStatus(true)}
                        className="w-full rounded-xl text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" />
                        <span>แก้ไขสถานะ / อนุมัติใหม่</span>
                      </Button>
                    </div>
                  )}

                  {/* Case 3: PENDING or EDITING MODE */}
                  {(activeOrderForSlip.payment.status === "PENDING" || isEditingSlipStatus) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="danger"
                          isLoading={loadingAction === activeOrderForSlip.payment.id}
                          onClick={() =>
                            handleVerifyPayment(activeOrderForSlip.payment!.id, activeOrderForSlip.id, "REJECTED")
                          }
                          className="flex-1 rounded-xl text-xs font-bold h-11"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          <span>ปฏิเสธสลิป</span>
                        </Button>

                        <Button
                          variant="primary"
                          isLoading={loadingAction === activeOrderForSlip.payment.id}
                          onClick={() =>
                            handleVerifyPayment(activeOrderForSlip.payment!.id, activeOrderForSlip.id, "VERIFIED")
                          }
                          className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold h-11 shadow-md"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span>อนุมัติการชำระเงิน</span>
                        </Button>
                      </div>

                      {isEditingSlipStatus && (
                        <button
                          onClick={() => setIsEditingSlipStatus(false)}
                          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 pt-1 font-bold"
                        >
                          ยกเลิกการแก้ไข
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clear All Orders Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <Card className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    ยืนยันล้างข้อมูลคำสั่งซื้อทั้งหมด?
                  </h3>
                  <p className="text-xs text-red-600 font-medium">
                    รีเซ็ตคำสั่งซื้อเป็น 0 เพื่อเริ่มใช้งานจริง
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-red-50/70 border border-red-100 rounded-2xl text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-800">
                  การกระทำนี้จะล้างข้อมูลดังต่อไปนี้:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  <li>คำสั่งซื้อและรายการสินค้าในออเดอร์ทั้งหมด</li>
                  <li>ประวัติการเปลี่ยนสถานะและสลิปการโอนเงินทดลอง</li>
                  <li>การแจ้งเตือนเกี่ยวกับคำสั่งซื้อทั้งหมด</li>
                  <li>สินค้าในตะกร้าค้างของทุกคน</li>
                </ul>
                <p className="text-[11px] text-emerald-700 font-bold pt-1">
                  ✨ ข้อมูลสินค้า (Products) และรายชื่อนักศึกษา/ผู้ใช้ (Users) จะไม่ได้รับผลกระทบใดๆ และหมายเลขออเดอร์ถัดไปจะเริ่มนับจาก #CS-2026-00001 ใหม่อัตโนมัติ!
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsClearAllModalOpen(false)}
                  className="flex-1 rounded-xl text-xs font-bold h-11"
                  disabled={isClearingOrders}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="danger"
                  isLoading={isClearingOrders}
                  onClick={handleClearAllOrders}
                  className="flex-1 rounded-xl text-xs font-bold h-11 bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-500/20"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  <span>ยืนยันล้างข้อมูลทั้งหมด</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
