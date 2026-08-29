"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getUserOrders } from "@/services/orders";
import { Order, OrderStatus } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, ArrowRight, ShoppingBag, Eye, Search, Radio } from "lucide-react";
import { getStatusBadgeVariant, getStatusLabel } from "@/lib/order-status";
import { extractSportType, getSportBadgeColor } from "@/lib/sports";

interface Props {
  initialOrders: Order[];
}

export function StudentOrdersInteractive({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  // Keep state in sync with initial props
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Supabase Realtime Listener for Live Order Status Updates
  useEffect(() => {
    const supabase = createClient();

    const fetchLatestOrders = async () => {
      try {
        const freshOrders = await getUserOrders();
        setOrders(freshOrders);
      } catch (e) {}
    };

    const channel = supabase
      .channel(`student-orders-live-${Date.now()}`)
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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.items?.some((item) =>
        item.product_name_snapshot.toLowerCase().includes(search.toLowerCase())
      );

    let matchesStatus = true;
    if (selectedStatusFilter === "PENDING") {
      matchesStatus = order.status === "PENDING_PAYMENT" || order.status === "PAYMENT_REVIEW";
    } else if (selectedStatusFilter === "PROCESSING") {
      matchesStatus = ["PAID", "ORDER_ACCEPTED", "PREPARING", "PRODUCTION"].includes(order.status);
    } else if (selectedStatusFilter === "READY") {
      matchesStatus = order.status === "READY_FOR_PICKUP";
    } else if (selectedStatusFilter === "COMPLETED") {
      matchesStatus = order.status === "COMPLETED";
    } else if (selectedStatusFilter === "CANCELLED") {
      matchesStatus = order.status === "CANCELLED";
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            <span>ประวัติการสั่งซื้อ</span>
          </h1>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="ค้นหาหมายเลขออเดอร์, ชื่อสินค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Filter Status Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        {[
          { key: "ALL", label: `ทั้งหมด (${orders.length})` },
          { 
            key: "PENDING", 
            label: `รอชำระ/ตรวจสลิป (${orders.filter(o => o.status === "PENDING_PAYMENT" || o.status === "PAYMENT_REVIEW").length})` 
          },
          { 
            key: "PROCESSING", 
            label: `อนุมัติแล้ว (${orders.filter(o => ["PAID", "ORDER_ACCEPTED", "PREPARING", "PRODUCTION"].includes(o.status)).length})` 
          },
          { 
            key: "READY", 
            label: `พร้อมรับสินค้า (${orders.filter(o => o.status === "READY_FOR_PICKUP").length})` 
          },
          { 
            key: "COMPLETED", 
            label: `รับสินค้าแล้ว (${orders.filter(o => o.status === "COMPLETED").length})` 
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatusFilter(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedStatusFilter === tab.key
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="ไม่พบรายการคำสั่งซื้อ"
          description="ยังไม่มีประวัติการสั่งซื้อที่ตรงกับเงื่อนไขการค้นหา"
          action={
            <Link href="/products" prefetch={true}>
              <Button className="rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white">
                <span>เลือกชมสินค้า</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const itemCount = order.items?.length || 0;

            return (
              <Card
                key={order.id}
                className="border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs hover:border-blue-300 transition-all"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block">
                        หมายเลขออเดอร์
                      </span>
                      <span className="font-extrabold text-blue-600 font-mono text-base">
                        #{order.order_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusBadgeVariant(order.status)} size="sm">
                        {getStatusLabel(order.status)}
                      </Badge>
                      <span suppressHydrationWarning className="text-xs text-slate-400 font-mono">
                        {new Date(order.created_at).toLocaleDateString("th-TH")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-600 font-medium">
                        รายการสินค้า {itemCount} รายการ:
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {order.items?.map((item) => {
                          const sport = extractSportType(item);
                          return (
                            <span
                              key={item.id}
                              className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-semibold flex items-center gap-1.5"
                            >
                              <span>{item.product_name_snapshot} ({item.size_name_snapshot}) × {item.quantity}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getSportBadgeColor(sport)}`}>
                                {sport}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium block">
                          ยอดรวมสุทธิ
                        </span>
                        <span className="text-lg font-black text-slate-900">
                          ฿{Number(order.total_amount).toLocaleString()}
                        </span>
                      </div>

                      <Link href={`/orders/${order.id}`} prefetch={true}>
                        <Button size="sm" className="rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          <span>ติดตามสถานะ</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
