"use client";

import React, { useState } from "react";
import ExcelJS from "exceljs";
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
  CheckCircle2
} from "lucide-react";

interface Props {
  summary: {
    sizeSummary: { size_name: string; count: number }[];
    nameSummary: { custom_name: string; count: number }[];
    numberSummary: { custom_number: string; count: number }[];
  };
  orders: Order[];
}

export function ProductionInteractive({ summary, orders }: Props) {
  const [search, setSearch] = useState("");
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>("ALL");

  // Flatten items with order details for easy factory order job sheet
  const productionList: Array<{
    id: string;
    orderNumber: string;
    studentName: string;
    studentId: string;
    phone: string;
    productName: string;
    sizeName: string;
    customName: string;
    customNumber: string;
    note: string;
    status: string;
  }> = [];

  orders.forEach((o) => {
    o.items?.forEach((item) => {
      productionList.push({
        id: item.id,
        orderNumber: o.order_number,
        studentName: `${o.profile?.first_name || ""} ${o.profile?.last_name || ""}`.trim() || "ไม่ระบุ",
        studentId: o.profile?.student_id || "-",
        phone: o.profile?.phone || "-",
        productName: item.product_name_snapshot,
        sizeName: item.size_name_snapshot || "N/A",
        customName: item.custom_name || "-",
        customNumber: item.custom_number || "-",
        note: item.note || "-",
        status: o.status,
      });
    });
  });

  const [selectedCustomFilter, setSelectedCustomFilter] = useState<string>("ALL");

  // Filtered Production List
  const filteredList = productionList.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      item.studentName.toLowerCase().includes(q) ||
      item.studentId.includes(q) ||
      item.customName.toLowerCase().includes(q) ||
      item.customNumber.includes(q) ||
      item.orderNumber.toLowerCase().includes(q);

    const matchesSize = selectedSizeFilter === "ALL" || item.sizeName === selectedSizeFilter;

    const hasName = item.customName && item.customName !== "-";
    const hasNumber = item.customNumber && item.customNumber !== "-";

    const matchesCustom =
      selectedCustomFilter === "ALL" ||
      (selectedCustomFilter === "HAS_NAME" && hasName) ||
      (selectedCustomFilter === "HAS_NUMBER" && hasNumber) ||
      (selectedCustomFilter === "PLAIN" && !hasName && !hasNumber);

    return matchesSearch && matchesSize && matchesCustom;
  });

  const hasData = productionList.length > 0;

  // 1-Click Excel Export formatted specifically for Screen & Sewing Factory
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CPE & IoT Sportswear System";
    workbook.created = new Date();

    // Sheet 1: Factory Job Order Sheet (สำหรับส่งร้านตัดเย็บสกรีนรายชิ้น)
    const jobSheet = workbook.addWorksheet("ใบสั่งงานสกรีนและตัดเย็บ");
    
    jobSheet.columns = [
      { header: "ลำดับ", key: "no", width: 8 },
      { header: "ไซส์เสื้อ (Size)", key: "size", width: 15 },
      { header: "ชื่อหลังเสื้อ (Custom Name)", key: "custom_name", width: 25 },
      { header: "เบอร์หลังเสื้อ (Custom Number)", key: "custom_number", width: 18 },
      { header: "ชื่อผู้สั่งซื้อ", key: "student_name", width: 25 },
      { header: "รหัสนักศึกษา", key: "student_id", width: 15 },
      { header: "เบอร์โทรศัพท์", key: "phone", width: 15 },
      { header: "หมายเหตุงานสกรีน", key: "note", width: 25 },
      { header: "เลขที่ออเดอร์", key: "order_number", width: 15 },
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

    productionList.forEach((item, index) => {
      const row = jobSheet.addRow({
        no: index + 1,
        size: item.sizeName,
        custom_name: item.customName,
        custom_number: item.customNumber,
        student_name: item.studentName,
        student_id: item.studentId,
        phone: item.phone,
        note: item.note,
        order_number: item.orderNumber,
      });

      row.alignment = { vertical: "middle" };
      row.getCell("no").alignment = { horizontal: "center" };
      row.getCell("size").alignment = { horizontal: "center" };
      row.getCell("custom_number").alignment = { horizontal: "center" };
    });

    // Sheet 2: Size Quantity Summary Table (สำหรับสรุปตัดเย็บผ้า)
    const summarySheet = workbook.addWorksheet("สรุปยอดตัดเย็บตามไซส์");
    summarySheet.columns = [
      { header: "ไซส์เสื้อ (Size)", key: "size", width: 20 },
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

    summary.sizeSummary.forEach((s) => {
      const nameCount = productionList.filter((p) => p.sizeName === s.size_name && p.customName !== "-").length;
      const numberCount = productionList.filter((p) => p.sizeName === s.size_name && p.customNumber !== "-").length;

      summarySheet.addRow({
        size: s.size_name,
        count: s.count,
        name_count: nameCount,
        number_count: numberCount,
      });
    });

    // Add Total Row
    const totalRow = summarySheet.addRow({
      size: "รวมทั้งหมด (TOTAL)",
      count: productionList.length,
      name_count: productionList.filter((p) => p.customName !== "-").length,
      number_count: productionList.filter((p) => p.customNumber !== "-").length,
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Factory_Production_Job_Sheet_${new Date().toISOString().split("T")[0]}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  // CSV Export for Quick View
  const handleExportCSV = () => {
    let csvContent = "\uFEFFลำดับ,ไซส์เสื้อ,ชื่อหลังเสื้อ,เบอร์หลังเสื้อ,ชื่อผู้สั่งซื้อ,รหัสนักศึกษา,เบอร์โทร,หมายเหตุ,เลขที่ออเดอร์\n";
    productionList.forEach((item, idx) => {
      csvContent += `"${idx + 1}","${item.sizeName}","${item.customName}","${item.customNumber}","${item.studentName}","${item.studentId}","${item.phone}","${item.note}","${item.orderNumber}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Factory_Production_Job_Sheet_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header (No subtitle, clean Thai) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="h-6 w-6 text-blue-600" />
            <span>ใบสั่งงานสกรีนและตัดเย็บ</span>
          </h1>
        </div>

        {hasData && (
          <div className="flex items-center gap-2">
            <Button onClick={handleExportCSV} variant="outline" className="rounded-xl shadow-xs text-xs font-bold">
              <Download className="h-3.5 w-3.5 mr-1" />
              <span>ดาวน์โหลด CSV</span>
            </Button>
            <Button onClick={handleExportExcel} className="rounded-xl shadow-xs bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              <span>ส่งออกไฟล์ Excel สำหรับส่งร้าน (.xlsx)</span>
            </Button>
          </div>
        )}
      </div>

      {!hasData ? (
        <EmptyState
          icon={Factory}
          title="ยังไม่มีข้อมูลสำหรับสรุปการผลิต"
          description="เมื่อมีออเดอร์เข้ามาในระบบ รายการไซส์ ชื่อสกรีน และเบอร์สกรีน จะถูกรวบรวมเป็นใบสั่งงานโรงงานในหน้านี้ทันที"
        />
      ) : (
        <div className="space-y-6">
          
          {/* 1. FACTORY SIZE SUMMARY BAR */}
          <Card className="border-slate-200 bg-white rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Shirt className="h-4 w-4 text-blue-600" />
                <span>สรุปยอดผลิตรวมแยกตามไซส์</span>
              </h3>
              <Badge variant="primary">
                รวมทั้งหมด {productionList.length} ตัว
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
              {summary.sizeSummary.map((s) => (
                <button
                  key={s.size_name}
                  onClick={() => setSelectedSizeFilter(selectedSizeFilter === s.size_name ? "ALL" : s.size_name)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    selectedSizeFilter === s.size_name
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
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

          {/* 2. SEARCH & FILTER CONTROLS */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <button
                  onClick={() => setSelectedSizeFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                    selectedSizeFilter === "ALL"
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                      selectedSizeFilter === s.size_name
                        ? "bg-slate-900 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    ไซส์ {s.size_name} ({s.count})
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-72">
                <Input
                  placeholder="ค้นหาด้วยชื่อนักศึกษา, ชื่อสกรีน, เบอร์สกรีน..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Custom Screen Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">ตัวกรองงานสกรีน:</span>
              {[
                { key: "ALL", label: "ทั้งหมด" },
                { key: "HAS_NAME", label: "มีสกรีนชื่อ" },
                { key: "HAS_NUMBER", label: "มีสกรีนเบอร์" },
                { key: "PLAIN", label: "ไม่สกรีน (เสื้อเปล่า)" },
              ].map((cf) => (
                <button
                  key={cf.key}
                  onClick={() => setSelectedCustomFilter(cf.key)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCustomFilter === cf.key
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cf.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. FACTORY INDIVIDUAL JOB ORDER TABLE (Mobile Card Stack & Desktop Table) */}
          
          {/* Mobile Card Stack */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredList.map((item, idx) => (
              <Card key={item.id} className="border-slate-200 bg-white rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-400 font-mono">ลำดับ #{idx + 1}</span>
                  <Badge variant="primary" className="font-extrabold text-xs">
                    ไซส์ {item.sizeName}
                  </Badge>
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
                  <p><strong>ผู้สั่งซื้อ:</strong> {item.studentName} ({item.studentId})</p>
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
                  แสดง {filteredList.length} จาก {productionList.length} รายการ
                </span>
              </CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 text-center">ลำดับ</th>
                    <th className="p-3.5 text-center">ไซส์เสื้อ</th>
                    <th className="p-3.5">ชื่อหลังเสื้อ (Custom Name)</th>
                    <th className="p-3.5 text-center">เบอร์หลังเสื้อ</th>
                    <th className="p-3.5">ผู้สั่งซื้อ (นักศึกษา)</th>
                    <th className="p-3.5">รหัสนักศึกษา</th>
                    <th className="p-3.5">หมายเหตุงานสกรีน</th>
                    <th className="p-3.5 text-right">เลขที่ออเดอร์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-3.5 text-center font-bold text-slate-400 font-mono">
                        {idx + 1}
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
                        {item.studentName}
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
