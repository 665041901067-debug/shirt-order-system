"use client";

import React, { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/client";
import { getProductionSummary, getAllAdminOrders } from "@/services/admin";
import { Order } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Factory,
  Download,
  Shirt,
  Hash,
  User,
  FileSpreadsheet,
  Search,
  FileText,
  Printer,
  CheckCircle2,
  Trophy,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  Check
} from "lucide-react";
import { SPORT_TYPES, extractSportType, cleanNoteWithoutSport, getSportBadgeColor } from "@/lib/sports";

interface Props {
  summary: {
    sizeSummary: { size_name: string; count: number }[];
    nameSummary: { custom_name: string; count: number }[];
    numberSummary: { custom_number: string; count: number }[];
  };
  orders: Order[];
}

export function ProductionInteractive({ summary: initialSummary, orders: initialOrders }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>("ALL");
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>("ALL");
  const [selectedCustomFilter, setSelectedCustomFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("ORDER_ASC");
  const [exportScope, setExportScope] = useState<"FILTERED" | "ALL">("FILTERED");

  useEffect(() => {
    setSummary(initialSummary);
    setOrders(initialOrders);
  }, [initialSummary, initialOrders]);

  // Realtime Live Sync for Production Summary & Orders
  useEffect(() => {
    const supabase = createClient();

    const fetchLatestProductionData = async () => {
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

        if (data) {
          setOrders(data as Order[]);
        }
      } catch (e) { }
    };

    const channel = supabase
      .channel(`admin-production-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchLatestProductionData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => {
          fetchLatestProductionData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          fetchLatestProductionData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchLatestProductionData();
        }
      )
      .subscribe();

    window.addEventListener("app:order-changed", fetchLatestProductionData);
    window.addEventListener("app:cart-changed", fetchLatestProductionData);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("app:order-changed", fetchLatestProductionData);
      window.removeEventListener("app:cart-changed", fetchLatestProductionData);
    };
  }, []);

  // Flatten items with order details for easy factory order job sheet
  const productionList: Array<{
    id: string;
    orderNumber: string;
    studentName: string;
    nickname: string;
    studentId: string;
    phone: string;
    productName: string;
    sizeName: string;
    customName: string;
    customNumber: string;
    sportType: string;
    note: string;
    status: string;
  }> = [];

  orders.forEach((o) => {
    if (o.status === "CANCELLED") return;
    o.items?.forEach((item) => {
      const sport = extractSportType(item);
      const cleanNote = cleanNoteWithoutSport(item.note);
      const qty = Math.max(1, Number(item.quantity) || 1);

      for (let i = 0; i < qty; i++) {
        productionList.push({
          id: qty > 1 ? `${item.id}-${i + 1}` : item.id,
          orderNumber: o.order_number,
          studentName: `${o.profile?.first_name || ""} ${o.profile?.last_name || ""}`.trim() || "ไม่ระบุ",
          nickname: o.profile?.nickname || "-",
          studentId: o.profile?.student_id || "-",
          phone: o.profile?.phone || "-",
          productName: item.product_name_snapshot || "เสื้อกีฬา",
          sizeName: item.size_name_snapshot || "N/A",
          customName: item.custom_name || "-",
          customNumber: item.custom_number || "-",
          sportType: sport,
          note: cleanNote || "-",
          status: o.status,
        });
      }
    });
  });

  // Calculate dynamic size summary directly from productionList for 100% Realtime consistency
  const sizeMap: Record<string, number> = {};
  productionList.forEach((p) => {
    const size = p.sizeName || "N/A";
    sizeMap[size] = (sizeMap[size] || 0) + 1;
  });
  const standardSizeOrder = ["3XS", "2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "FREE SIZE", "FREESIZE", "F"];
  const dynamicSizeSummary = Object.entries(sizeMap)
    .sort(([a], [b]) => {
      const idxA = standardSizeOrder.indexOf(a.toUpperCase());
      const idxB = standardSizeOrder.indexOf(b.toUpperCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    })
    .map(([size_name, count]) => ({ size_name, count }));

  // Calculate Sport Breakdown Summary for distributors
  const sportSummary = SPORT_TYPES.map((sport) => {
    const count = productionList.filter((p) => {
      if (sport === "ไม่ได้เล่นกีฬา") {
        return p.sportType === "ไม่ได้เล่นกีฬา" || !p.sportType;
      }
      return p.sportType.includes(sport);
    }).length;
    return { sport, count };
  });

  // Filtered Production List
  const filteredList = productionList.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      item.studentName.toLowerCase().includes(q) ||
      item.nickname.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.studentId.includes(q) ||
      item.customName.toLowerCase().includes(q) ||
      item.customNumber.includes(q) ||
      item.sportType.toLowerCase().includes(q) ||
      item.orderNumber.toLowerCase().includes(q);

    const matchesSize = selectedSizeFilter === "ALL" || item.sizeName === selectedSizeFilter;
    const matchesSport =
      selectedSportFilter === "ALL" ||
      (selectedSportFilter === "ไม่ได้เล่นกีฬา"
        ? item.sportType === "ไม่ได้เล่นกีฬา" || !item.sportType
        : item.sportType.includes(selectedSportFilter));

    const hasName = item.customName && item.customName !== "-";
    const hasNumber = item.customNumber && item.customNumber !== "-";

    const matchesCustom =
      selectedCustomFilter === "ALL" ||
      (selectedCustomFilter === "HAS_NAME" && hasName) ||
      (selectedCustomFilter === "HAS_NUMBER" && hasNumber) ||
      (selectedCustomFilter === "PLAIN" && !hasName && !hasNumber);

    return matchesSearch && matchesSize && matchesSport && matchesCustom;
  });

  // Sorted List based on admin preference
  const filteredAndSortedList = [...filteredList].sort((a, b) => {
    if (sortBy === "ORDER_ASC") {
      return a.orderNumber.localeCompare(b.orderNumber, undefined, { numeric: true });
    }
    if (sortBy === "ORDER_DESC") {
      return b.orderNumber.localeCompare(a.orderNumber, undefined, { numeric: true });
    }
    if (sortBy === "SIZE_ASC") {
      const idxA = standardSizeOrder.indexOf(a.sizeName.toUpperCase());
      const idxB = standardSizeOrder.indexOf(b.sizeName.toUpperCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.sizeName.localeCompare(b.sizeName);
    }
    if (sortBy === "STUDENT_ID_ASC") {
      return a.studentId.localeCompare(b.studentId, undefined, { numeric: true });
    }
    if (sortBy === "STUDENT_NAME_ASC") {
      return a.studentName.localeCompare(b.studentName, "th");
    }
    if (sortBy === "SPORT_ASC") {
      return a.sportType.localeCompare(b.sportType, "th");
    }
    return 0;
  });

  const exportList = exportScope === "FILTERED" ? filteredAndSortedList : productionList;
  const hasData = productionList.length > 0;
  const isFilterActive =
    search !== "" ||
    selectedSizeFilter !== "ALL" ||
    selectedSportFilter !== "ALL" ||
    selectedCustomFilter !== "ALL" ||
    sortBy !== "ORDER_ASC";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedSizeFilter("ALL");
    setSelectedSportFilter("ALL");
    setSelectedCustomFilter("ALL");
    setSortBy("ORDER_ASC");
  };

  // 1-Click Excel Export formatted specifically for Screen & Sewing Factory + Distributors
  const handleExportExcel = async (exportItems = exportList) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CPE & IoT Sportswear System";
    workbook.created = new Date();

    // Sheet 1: Factory Job Order Sheet (สำหรับส่งร้านตัดเย็บสกรีนและคนแจกเสื้อ)
    const jobSheet = workbook.addWorksheet("ใบสั่งงานสกรีนและตัดเย็บ");

    jobSheet.columns = [
      { header: "ลำดับ", key: "no", width: 8 },
      { header: "รายการสินค้า / แบบเสื้อ", key: "product_name", width: 30 },
      { header: "ประเภทกีฬา", key: "sport", width: 22 },
      { header: "ไซส์เสื้อ (Size)", key: "size", width: 15 },
      { header: "ชื่อหลังเสื้อ (Custom Name)", key: "custom_name", width: 25 },
      { header: "เบอร์หลังเสื้อ (Custom Number)", key: "custom_number", width: 18 },
      { header: "ชื่อผู้สั่งซื้อ", key: "student_name", width: 25 },
      { header: "ชื่อเล่น", key: "nickname", width: 16 },
      { header: "รหัสนักศึกษา", key: "student_id", width: 16 },
      { header: "เบอร์โทรศัพท์", key: "phone", width: 16 },
      { header: "หมายเหตุ", key: "note", width: 25 },
      { header: "เลขที่ออเดอร์", key: "order_number", width: 16 },
    ];

    // Style Header Row
    const headerRow = jobSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Navy Blue
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    exportItems.forEach((item, index) => {
      const row = jobSheet.addRow({
        no: index + 1,
        product_name: item.productName,
        sport: item.sportType,
        size: item.sizeName,
        custom_name: item.customName,
        custom_number: item.customNumber,
        student_name: item.studentName,
        nickname: item.nickname,
        student_id: item.studentId,
        phone: item.phone,
        note: item.note,
        order_number: item.orderNumber,
      });

      row.alignment = { vertical: "middle" };
      row.getCell("no").alignment = { horizontal: "center" };
      row.getCell("sport").alignment = { horizontal: "center" };
      row.getCell("size").alignment = { horizontal: "center" };
      row.getCell("nickname").alignment = { horizontal: "center" };
      row.getCell("custom_number").alignment = { horizontal: "center" };
    });

    // Sheet 2: Size Quantity Summary Table (สำหรับสรุปตัดเย็บผ้า แยกตามแบบเสื้อและไซส์)
    const summarySheet = workbook.addWorksheet("สรุปยอดตัดเย็บตามไซส์");
    summarySheet.columns = [
      { header: "รายการสินค้า / แบบเสื้อ", key: "product_name", width: 30 },
      { header: "ไซส์เสื้อ (Size)", key: "size", width: 18 },
      { header: "จำนวนที่ต้องตัดเย็บ (ตัว)", key: "count", width: 25 },
      { header: "จำนวนสกรีนชื่อ (ตัว)", key: "name_count", width: 25 },
      { header: "จำนวนสกรีนเบอร์ (ตัว)", key: "number_count", width: 25 },
    ];

    const sumHeaderRow = summarySheet.getRow(1);
    sumHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    sumHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };

    // Group by product and size
    const productSizeMap: Record<string, { productName: string; sizeName: string; count: number; nameCount: number; numberCount: number }> = {};
    exportItems.forEach((p) => {
      const key = `${p.productName}___${p.sizeName}`;
      if (!productSizeMap[key]) {
        productSizeMap[key] = {
          productName: p.productName,
          sizeName: p.sizeName,
          count: 0,
          nameCount: 0,
          numberCount: 0,
        };
      }
      productSizeMap[key].count += 1;
      if (p.customName !== "-") productSizeMap[key].nameCount += 1;
      if (p.customNumber !== "-") productSizeMap[key].numberCount += 1;
    });

    Object.values(productSizeMap).forEach((entry) => {
      summarySheet.addRow({
        product_name: entry.productName,
        size: entry.sizeName,
        count: entry.count,
        name_count: entry.nameCount,
        number_count: entry.numberCount,
      });
    });

    // Add Total Row for Size Sheet
    const totalRow = summarySheet.addRow({
      product_name: "รวมทั้งหมด (TOTAL)",
      size: "-",
      count: exportItems.length,
      name_count: exportItems.filter((p) => p.customName !== "-").length,
      number_count: exportItems.filter((p) => p.customNumber !== "-").length,
    });
    totalRow.font = { bold: true };

    // Sheet 3: Sport Summary Table (สำหรับคนแจกเสื้อแยกถุงตามประเภทกีฬา)
    const sportSheet = workbook.addWorksheet("สรุปยอดแจกเสื้อตามกีฬา");
    sportSheet.columns = [
      { header: "ประเภทกีฬา", key: "sport", width: 25 },
      { header: "จำนวนเสื้อทั้งหมด (ตัว)", key: "count", width: 25 },
    ];

    const sportHeaderRow = sportSheet.getRow(1);
    sportHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    sportHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF059669" }, // Emerald Green
    };

    const exportSportSummary = SPORT_TYPES.map((sport) => {
      const count = exportItems.filter((p) => {
        if (sport === "ไม่ได้เล่นกีฬา") {
          return p.sportType === "ไม่ได้เล่นกีฬา" || !p.sportType;
        }
        return p.sportType.includes(sport);
      }).length;
      return { sport, count };
    }).filter((s) => s.count > 0);

    exportSportSummary.forEach((s) => {
      sportSheet.addRow({
        sport: s.sport,
        count: s.count,
      });
    });

    const sportTotalRow = sportSheet.addRow({
      sport: "รวมทั้งหมด (TOTAL)",
      count: exportItems.length,
    });
    sportTotalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const isFiltered = exportItems.length !== productionList.length;
    const filenameSuffix = isFiltered ? `Filtered_${exportItems.length}_items` : "All_items";
    anchor.download = `Factory_Production_Job_Sheet_${filenameSuffix}_${new Date().toISOString().split("T")[0]}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  // CSV Export for Quick View
  const handleExportCSV = (exportItems = exportList) => {
    let csvContent = "\uFEFFลำดับ,ประเภทกีฬา,ไซส์เสื้อ,ชื่อหลังเสื้อ,เบอร์หลังเสื้อ,ชื่อผู้สั่งซื้อ,ชื่อเล่น,รหัสนักศึกษา,เบอร์โทร,หมายเหตุ,เลขที่ออเดอร์\n";
    exportItems.forEach((item, idx) => {
      csvContent += `"${idx + 1}","${item.sportType}","${item.sizeName}","${item.customName}","${item.customNumber}","${item.studentName}","${item.nickname}","${item.studentId}","${item.phone}","${item.note}","${item.orderNumber}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const isFiltered = exportItems.length !== productionList.length;
    const filenameSuffix = isFiltered ? `Filtered_${exportItems.length}_items` : "All_items";
    a.download = `Factory_Production_Job_Sheet_${filenameSuffix}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="h-6 w-6 text-blue-600" />
            <span>ยอดสั่งผลิตและใบสั่งงาน</span>
          </h1>
        </div>

        {/* Action Export Controls */}
        {hasData && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Export Scope Selector */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setExportScope("FILTERED")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${exportScope === "FILTERED"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                ตามตัวกรอง ({filteredAndSortedList.length})
              </button>
              <button
                onClick={() => setExportScope("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${exportScope === "ALL"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                ทั้งหมด ({productionList.length})
              </button>
            </div>

            <Button
              onClick={() => handleExportCSV(exportList)}
              variant="outline"
              className="rounded-xl font-bold text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
            >
              <Download className="h-4 w-4 mr-1.5 text-slate-500" />
              <span>ส่งออก CSV ({exportList.length})</span>
            </Button>

            <Button
              onClick={() => handleExportExcel(exportList)}
              className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5 text-white" />
              <span>ส่งออก Excel ({exportList.length})</span>
            </Button>
          </div>
        )}
      </div>

      {!hasData ? (
        <EmptyState
          icon={Factory}
          title="ยังไม่มียอดที่ต้องสั่งผลิต"
          description="เมื่อมีคำสั่งซื้อที่ได้รับการอนุมัติชำระเงินแล้ว ระบบจะรวบรวมยอดแยกตามไซส์ กีฬา และรายชื่อสกรีนให้อัตโนมัติ"
        />
      ) : (
        <div className="space-y-6">

          {/* 1. SPORT BREAKDOWN SUMMARY CARD (สำหรับคนแจกเสื้อ) */}
          <Card className="border-emerald-200 bg-linear-to-br from-emerald-50/50 to-white rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-600" />
                <span>สรุปยอดแยกตามประเภทกีฬา (สำหรับคนแจกเสื้อ)</span>
              </h3>
              <Badge variant="success" className="font-bold">
                รวม {productionList.length} ตัว
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-center">
              {sportSummary.map((s) => (
                <button
                  key={s.sport}
                  onClick={() => setSelectedSportFilter(selectedSportFilter === s.sport ? "ALL" : s.sport)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${selectedSportFilter === s.sport
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300"
                      : "border-emerald-200/80 bg-white hover:bg-emerald-50/50 text-slate-800"
                    }`}
                >
                  <span className="block text-[11px] opacity-80 truncate">{s.sport}</span>
                  <span className="text-lg font-extrabold">{s.count}</span>
                  <span className="block text-[10px] opacity-75">ตัว</span>
                </button>
              ))}
            </div>
          </Card>

          {/* 2. SIZE QUANTITY SUMMARY CARD */}
          <Card className="border-slate-200 bg-white rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Shirt className="h-4 w-4 text-blue-600" />
                <span>สรุปยอดผลิตรวมแยกตามไซส์ (สำหรับโรงงานตัดเย็บ)</span>
              </h3>
              <Badge variant="primary">
                รวมทั้งหมด {productionList.length} ตัว
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
              {dynamicSizeSummary.map((s) => (
                <button
                  key={s.size_name}
                  onClick={() => setSelectedSizeFilter(selectedSizeFilter === s.size_name ? "ALL" : s.size_name)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${selectedSizeFilter === s.size_name
                      ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                    }`}
                >
                  <span className="block text-[11px] opacity-80 uppercase">ไซส์ {s.size_name}</span>
                  <span className="text-lg font-extrabold">{s.count}</span>
                  <span className="block text-[10px] opacity-80">ตัว</span>
                </button>
              ))}
            </div>
          </Card>

          {/* 3. SEARCH, SORT & FILTER CONTROLS */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <button
                  onClick={() => setSelectedSizeFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${selectedSizeFilter === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  ดูทุกไซส์ ({productionList.length})
                </button>
                {summary.sizeSummary.map((s) => (
                  <button
                    key={s.size_name}
                    onClick={() => setSelectedSizeFilter(s.size_name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${selectedSizeFilter === s.size_name
                        ? "bg-slate-900 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    ไซส์ {s.size_name} ({s.count})
                  </button>
                ))}
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="w-full sm:w-64">
                  <Input
                    placeholder="ค้นหาชื่อผู้สั่ง, กีฬา, ชื่อสกรีน, เบอร์..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-xl text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Custom Screen & Sport Filter & Sort Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">

              {/* Left: Screen Filters & Sorting Dropdown */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-600 mr-1">กรองสกรีน:</span>
                  {[
                    { key: "ALL", label: "ทั้งหมด" },
                    { key: "HAS_NAME", label: "มีชื่อสกรีน" },
                    { key: "HAS_NUMBER", label: "มีเบอร์สกรีน" },
                    { key: "PLAIN", label: "เสื้อเปล่า" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setSelectedCustomFilter(f.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${selectedCustomFilter === f.key
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                  <ArrowUpDown className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">เรียงลำดับ:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="ORDER_ASC">🔢 เลขออเดอร์ (น้อย ➔ มาก)</option>
                    <option value="ORDER_DESC">🔢 เลขออเดอร์ (มาก ➔ น้อย)</option>
                    <option value="SIZE_ASC">📏 ไซส์เสื้อ (S ➔ 8XL)</option>
                    <option value="STUDENT_ID_ASC">🎓 รหัสนักศึกษา (น้อย ➔ มาก)</option>
                    <option value="STUDENT_NAME_ASC">👤 ชื่อผู้สั่งซื้อ (ก-ฮ)</option>
                    <option value="SPORT_ASC">⚽ ประเภทกีฬา</option>
                  </select>
                </div>
              </div>

              {/* Right: Sport Filter Dropdown & Reset */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-600">กีฬา:</span>
                  <select
                    value={selectedSportFilter}
                    onChange={(e) => setSelectedSportFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800"
                  >
                    <option value="ALL">ทุกประเภทกีฬา</option>
                    {SPORT_TYPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {isFilterActive && (
                  <Button
                    onClick={handleResetFilters}
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    <span>ล้างตัวกรอง</span>
                  </Button>
                )}
              </div>

            </div>
          </div>

          {/* 4. PRODUCTION JOB LIST */}
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredAndSortedList.map((item, idx) => (
              <Card key={item.id} className="border-slate-200 bg-white rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">#{idx + 1}</span>
                    <Badge variant="primary" className="font-extrabold text-xs">
                      ไซส์ {item.sizeName}
                    </Badge>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${getSportBadgeColor(item.sportType)}`}>
                    {item.sportType}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-semibold">แบบเสื้อ:</span>
                  <span>{item.productName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">ชื่อสกรีนหลังเสื้อ</span>
                    <span className="font-extrabold text-blue-700 text-sm uppercase">
                      {item.customName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">เบอร์สกรีนหลังเสื้อ</span>
                    <span className="font-extrabold text-blue-700 text-sm font-mono">
                      #{item.customNumber}
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-700 pt-1">
                  <p>
                    <strong>ผู้สั่งซื้อ:</strong> {item.studentName} {item.nickname !== "-" && <span className="text-blue-600 font-bold">({item.nickname})</span>} ({item.studentId})
                  </p>
                  {item.note !== "-" && <p className="text-amber-700"><strong>หมายเหตุ:</strong> {item.note}</p>}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden md:block border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs">
            <CardHeader className="bg-slate-50/80 border-b border-slate-200 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>ตารางใบสั่งงานสกรีนและตัดเย็บรายชิ้น (Production Job Sheet)</span>
                </div>
                <span className="text-xs text-slate-500 font-normal">
                  แสดง {filteredAndSortedList.length} จาก {productionList.length} รายการ
                </span>
              </CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 text-center">ลำดับ</th>
                    <th className="p-3.5">รายการสินค้า / แบบเสื้อ</th>
                    <th className="p-3.5 text-center">ประเภทกีฬา</th>
                    <th className="p-3.5 text-center">ไซส์เสื้อ</th>
                    <th className="p-3.5">ชื่อหลังเสื้อ (Custom Name)</th>
                    <th className="p-3.5 text-center">เบอร์หลังเสื้อ</th>
                    <th className="p-3.5">ผู้สั่งซื้อ (นักศึกษา)</th>
                    <th className="p-3.5">รหัสนักศึกษา</th>
                    <th className="p-3.5">หมายเหตุ</th>
                    <th className="p-3.5 text-right">เลขที่ออเดอร์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAndSortedList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-3.5 text-center font-bold text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      <td className="p-3.5 font-semibold text-slate-900">
                        {item.productName}
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${getSportBadgeColor(item.sportType)}`}>
                          {item.sportType}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <Badge variant="primary" className="font-extrabold text-xs">
                          {item.sizeName}
                        </Badge>
                      </td>

                      <td className="p-3.5 font-extrabold text-blue-700 uppercase">
                        {item.customName !== "-" ? item.customName : <span className="text-slate-300 font-normal">-</span>}
                      </td>

                      <td className="p-3.5 text-center font-extrabold text-blue-700 font-mono text-sm">
                        {item.customNumber !== "-" ? `#${item.customNumber}` : <span className="text-slate-300 font-normal">-</span>}
                      </td>

                      <td className="p-3.5 text-slate-900 font-bold">
                        <span>{item.studentName}</span>
                        {item.nickname !== "-" && (
                          <span className="text-blue-600 font-bold ml-1.5">
                            ({item.nickname})
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-mono text-slate-600">
                        {item.studentId}
                      </td>

                      <td className="p-3.5 text-slate-600 italic">
                        {item.note !== "-" ? item.note : <span className="text-slate-300 font-normal">-</span>}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-slate-500">
                        #{item.orderNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}

    </div>
  );
}
