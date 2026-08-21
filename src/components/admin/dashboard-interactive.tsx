"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Order } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusBadgeVariant, getStatusLabel } from "@/lib/order-status";
import { 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Factory, 
  Package, 
  BarChart3, 
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Users,
  Shirt,
  Tag,
  CheckCheck,
  FileCheck
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

interface Props {
  initialMetrics: {
    totalOrders: number;
    totalSales: number;
    pendingPayment: number;
    paymentReview: number;
    paid: number;
    production: number;
    readyForPickup: number;
    completed: number;
  };
  orders: Order[];
}

const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#64748B"];

export function DashboardInteractive({ initialMetrics, orders }: Props) {
  const [metrics] = useState(initialMetrics);

  const hasData = orders.length > 0;

  // 1. Process size distribution data
  const sizeCounts: Record<string, number> = {};
  let totalItemsCount = 0;
  let customNameCount = 0;
  let customNumberCount = 0;

  orders.forEach((o) => {
    o.items?.forEach((item) => {
      const sizeName = item.size_name_snapshot || "N/A";
      const q = item.quantity || 1;
      sizeCounts[sizeName] = (sizeCounts[sizeName] || 0) + q;
      totalItemsCount += q;

      if (item.custom_name && item.custom_name.trim()) customNameCount += q;
      if (item.custom_number && item.custom_number.trim()) customNumberCount += q;
    });
  });

  const sizeChartData = Object.entries(sizeCounts).map(([size, count]) => ({
    size,
    count,
  }));

  // 2. Process status distribution
  const statusCounts: Record<string, number> = {};
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({
    name: getStatusLabel(name),
    value,
  }));

  // 3. Process Academic Year Breakdown
  const yearCounts: Record<string, { count: number; totalSales: number }> = {};
  orders.forEach((o) => {
    const yr = o.profile?.academic_year || "ไม่ระบุชั้นปี";
    if (!yearCounts[yr]) yearCounts[yr] = { count: 0, totalSales: 0 };
    yearCounts[yr].count += 1;
    yearCounts[yr].totalSales += Number(o.total_amount) || 0;
  });

  // 4. Financial Status Totals
  const paidSales = orders
    .filter((o) => ["PAID", "ORDER_ACCEPTED", "READY_FOR_PICKUP", "COMPLETED"].includes(o.status))
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const pendingReviewSales = orders
    .filter((o) => o.status === "PAYMENT_REVIEW")
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const pendingPaymentSales = orders
    .filter((o) => o.status === "PENDING_PAYMENT")
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  // 5. Recent 5 Orders
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-8">
      
      {/* Header (No subtitle, clean Thai) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">แดชบอร์ดสรุปยอดภาพรวม</h1>
        </div>

        <Link href="/admin/orders">
          <Button className="rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white">
            <ShoppingBag className="h-4 w-4 mr-1.5" />
            <span>จัดการคำสั่งซื้อทั้งหมด</span>
          </Button>
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">ยอดคำสั่งซื้อทั้งหมด</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.totalOrders} รายการ</h3>
              <span className="text-[11px] text-blue-600 font-semibold mt-1 block">
                รวมเสื้อทั้งสิ้น {totalItemsCount} ตัว
              </span>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">ยอดขายรวมสุทธิ</span>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
                ฿{metrics.totalSales.toLocaleString()}
              </h3>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                ชำระแล้ว ฿{paidSales.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">สกรีนชื่อ & เบอร์</span>
              <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">
                {customNameCount + customNumberCount} จุด
              </h3>
              <span className="text-[11px] text-indigo-600 font-semibold mt-1 block">
                ชื่อ {customNameCount} ตัว • เบอร์ {customNumberCount} ตัว
              </span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Shirt className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">รอตรวจสอบสลิป</span>
              <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
                {metrics.paymentReview} รายการ
              </h3>
              <span className="text-[11px] text-amber-600 font-semibold mt-1 block">
                รอยืนยันยอด ฿{pendingReviewSales.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

      </div>

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="ยังไม่มีข้อมูลสำหรับสรุปผล"
          description="เมื่อมีนักศึกษาสั่งซื้อเสื้อเข้ามา สรุปยอดผลิตแยกไซส์ ยอดเงิน และรายงานสรุปสำหรับส่งโรงงานจะแสดงผลในหน้านี้ทันที"
          action={
            <Link href="/admin/products">
              <Button className="rounded-xl">
                <span>จัดการสินค้า</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          
          {/* 1. FACTORY PRODUCTION SUMMARY TABLE (1-Click Order to Factory) */}
          <Card className="border-slate-200 bg-white rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-200 pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-blue-600" />
                  <span>สรุปยอดเสื้อสั่งผลิตแยกตามไซส์ส่งโรงงาน (Factory Order Breakdown)</span>
                </div>
                <Badge variant="primary" size="sm">
                  รวมผลิตทั้งหมด {totalItemsCount} ตัว
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
                {Object.entries(sizeCounts).map(([size, count]) => (
                  <div key={size} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-slate-500 block uppercase">ไซส์ {size}</span>
                    <span className="text-xl font-extrabold text-blue-600">{count}</span>
                    <span className="text-[10px] text-slate-400 block">ตัว</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2. CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Size Distribution Bar Chart */}
            <Card className="lg:col-span-7 border-slate-200 bg-white rounded-2xl shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>การกระจายตัวของไซส์เสื้อ (Size Distribution Bar Chart)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sizeChartData}>
                    <XAxis dataKey="size" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Breakdown Pie Chart */}
            <Card className="lg:col-span-5 border-slate-200 bg-white rounded-2xl shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span>สัดส่วนสถานะคำสั่งซื้อ (Order Status Ratio)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>

          {/* 3. BREAKDOWN BY ACADEMIC YEAR & FINANCIAL SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Academic Year Summary */}
            <Card className="lg:col-span-6 border-slate-200 bg-white rounded-2xl shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>สรุปยอดสั่งซื้อจำแนกตามชั้นปี (Academic Year Breakdown)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {Object.entries(yearCounts).map(([year, data]) => (
                    <div key={year} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{year}</span>
                        <span className="text-[11px] text-slate-500">{data.count} คำสั่งซื้อ</span>
                      </div>
                      <span className="text-sm font-extrabold text-blue-600">
                        ฿{data.totalSales.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Financial Settlement Status */}
            <Card className="lg:col-span-6 border-slate-200 bg-white rounded-2xl shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  <span>สรุปสถานะการชำระเงิน (Financial Status Breakdown)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 block">อนุมัติการชำระเงินแล้ว (Paid)</span>
                    <span className="text-[11px] text-emerald-600">ยอดเงินที่เข้าบัญชีเรียบร้อย</span>
                  </div>
                  <span className="text-base font-extrabold text-emerald-700">
                    ฿{paidSales.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-amber-800 block">รอตรวจสอบสลิป (Payment Review)</span>
                    <span className="text-[11px] text-amber-600">สลิปที่แนบเข้ามา รอแอดมินอนุมัติ</span>
                  </div>
                  <span className="text-base font-extrabold text-amber-700">
                    ฿{pendingReviewSales.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">ยังไม่ชำระเงิน (Pending Payment)</span>
                    <span className="text-[11px] text-slate-500">รายการรอดำเนินการโอน</span>
                  </div>
                  <span className="text-base font-extrabold text-slate-800">
                    ฿{pendingPaymentSales.toLocaleString()}
                  </span>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* 4. RECENT ORDERS FEED */}
          <Card className="border-slate-200 bg-white rounded-2xl shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-blue-600" />
                <span>รายการคำสั่งซื้อล่าสุด (Recent Orders Feed)</span>
              </CardTitle>
              <Link href="/admin/orders" className="text-xs font-bold text-blue-600 hover:underline">
                ดูทั้งหมด
              </Link>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-2">
                    <div>
                      <span className="font-mono font-extrabold text-blue-600 text-xs">#{o.order_number}</span>
                      <span className="text-xs font-bold text-slate-900 ml-2">
                        {o.profile?.first_name} {o.profile?.last_name} ({o.profile?.student_id})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-slate-900">
                        ฿{Number(o.total_amount).toLocaleString()}
                      </span>
                      <Badge variant={getStatusBadgeVariant(o.status)} size="sm">
                        {getStatusLabel(o.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      )}

    </div>
  );
}
