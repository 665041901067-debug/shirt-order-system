"use client";

import React from "react";
import { ProductSize } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Ruler, X, Check } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sizes?: ProductSize[];
  basePrice?: number;
}

// Standard Thai Sportswear Size Dimensions Guidelines
const STANDARD_DIMENSIONS: Record<string, { chest: string; length: string }> = {
  "3XS": { chest: "30\"", length: "23\"" },
  "2XS": { chest: "32\"", length: "24\"" },
  "XS": { chest: "34\"", length: "25\"" },
  "S": { chest: "36\"", length: "26\"" },
  "M": { chest: "38\"", length: "27\"" },
  "L": { chest: "40\"", length: "28\"" },
  "XL": { chest: "42\"", length: "29\"" },
  "2XL": { chest: "44\"", length: "30\"" },
  "3XL": { chest: "46\"", length: "31\"" },
  "4XL": { chest: "48\"", length: "32\"" },
  "5XL": { chest: "50\"", length: "33\"" },
  "6XL": { chest: "52\"", length: "34\"" },
  "7XL": { chest: "54\"", length: "35\"" },
  "8XL": { chest: "56\"", length: "36\"" },
  "FREE SIZE": { chest: "42\"", length: "29\"" },
  "FREESIZE": { chest: "42\"", length: "29\"" },
  "F": { chest: "42\"", length: "29\"" },
};

export function SizeChartModal({ isOpen, onClose, sizes = [], basePrice }: Props) {
  if (!isOpen) return null;

  // If sizes are provided from database, map them dynamically; otherwise fallback
  const activeSizes = sizes.length > 0
    ? sizes.filter((s) => s.is_active !== false)
    : [
        { id: "1", size_name: "S", price_adjustment: 0 },
        { id: "2", size_name: "M", price_adjustment: 0 },
        { id: "3", size_name: "L", price_adjustment: 0 },
        { id: "4", size_name: "XL", price_adjustment: 0 },
        { id: "5", size_name: "2XL", price_adjustment: 0 },
        { id: "6", size_name: "3XL", price_adjustment: 0 },
        { id: "7", size_name: "4XL", price_adjustment: 0 },
        { id: "8", size_name: "5XL", price_adjustment: 0 },
      ];

  const sizeChartData = activeSizes.map((s) => {
    const nameUpper = (s.size_name || "").toUpperCase().trim();
    const dims = STANDARD_DIMENSIONS[nameUpper] || {
      chest: "-",
      length: "-",
    };

    const priceAdjNum = Number(s.price_adjustment) || 0;
    const priceAdjLabel =
      priceAdjNum > 0
        ? `+฿${priceAdjNum}`
        : priceAdjNum < 0
        ? `-฿${Math.abs(priceAdjNum)}`
        : "ปกติ";

    const calculatedTotal = basePrice !== undefined ? basePrice + priceAdjNum : null;

    return {
      size: s.size_name,
      chest: dims.chest,
      length: dims.length,
      priceAdj: priceAdjLabel,
      priceAdjNum,
      calculatedTotal,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <Card className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl space-y-4">
        <CardContent className="p-6 space-y-4">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Ruler className="h-5 w-5 text-blue-600" />
              <span>ตารางวัดขนาดไซส์เสื้อ (Size Chart Guidelines)</span>
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-xs text-slate-500">
            * ขนาดรอบอก (Chest) และความยาว (Length) เป็นนิ้ว แนะนำให้วัดขนาดรอบอกเพื่อเลือกไซส์ที่พอดีที่สุด
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-80">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-900 uppercase sticky top-0">
                <tr>
                  <th className="p-3">ไซส์ (Size)</th>
                  <th className="p-3">รอบอก (Chest)</th>
                  <th className="p-3">ความยาว (Length)</th>
                  <th className="p-3 text-right">ปรับราคา</th>
                  {basePrice !== undefined && (
                    <th className="p-3 text-right">ราคารวม</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sizeChartData.map((row) => (
                  <tr key={row.size} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3 font-extrabold text-blue-600">{row.size}</td>
                    <td className="p-3">{row.chest}</td>
                    <td className="p-3">{row.length}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      <span
                        className={
                          row.priceAdjNum > 0
                            ? "text-blue-600"
                            : "text-slate-700"
                        }
                      >
                        {row.priceAdj}
                      </span>
                    </td>
                    {basePrice !== undefined && (
                      <td className="p-3 text-right font-black text-blue-700">
                        ฿{row.calculatedTotal?.toLocaleString()}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              เข้าใจแล้ว
            </button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
