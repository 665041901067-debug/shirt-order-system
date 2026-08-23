"use client";

import React, { useEffect } from "react";
import { ProductSize } from "@/types";
import { Ruler, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  // Lock background body scroll completely when modal is open to prevent nested scroll conflict
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isOpen]);

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs overscroll-none animate-in fade-in duration-200"
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[88vh] sm:max-h-[85vh] bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 sm:zoom-in-95 duration-200"
      >
        {/* Mobile Pull Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Modal Header (Fixed at top) */}
        <div className="shrink-0 px-5 sm:px-6 pt-2 sm:pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
                <Ruler className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <span>ตารางวัดขนาดไซส์เสื้อ (Size Chart)</span>
            </h3>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>ขนาดรอบอกและยาวเป็นนิ้ว แนะนำวัดรอบอกเพื่อเลือกไซส์ที่พอดีที่สุด</span>
          </p>
        </div>

        {/* Modal Body (Single Independent Smooth Scroll Container) */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-3.5">
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-900 uppercase sticky top-0 z-10">
                <tr>
                  <th className="p-2.5 sm:p-3 text-center">ไซส์</th>
                  <th className="p-2.5 sm:p-3 text-center">รอบอก</th>
                  <th className="p-2.5 sm:p-3 text-center">ความยาว</th>
                  <th className="p-2.5 sm:p-3 text-right">ปรับราคา</th>
                  {basePrice !== undefined && (
                    <th className="p-2.5 sm:p-3 text-right">ราคารวม</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sizeChartData.map((row) => (
                  <tr key={row.size} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-2.5 sm:p-3 text-center font-extrabold text-blue-600">
                      {row.size}
                    </td>
                    <td className="p-2.5 sm:p-3 text-center text-slate-800">
                      {row.chest}
                    </td>
                    <td className="p-2.5 sm:p-3 text-center text-slate-800">
                      {row.length}
                    </td>
                    <td className="p-2.5 sm:p-3 text-right font-bold text-slate-900">
                      <span
                        className={
                          row.priceAdjNum > 0
                            ? "text-blue-600 font-bold"
                            : "text-slate-500"
                        }
                      >
                        {row.priceAdj}
                      </span>
                    </td>
                    {basePrice !== undefined && (
                      <td className="p-2.5 sm:p-3 text-right font-black text-blue-700 font-mono">
                        ฿{row.calculatedTotal?.toLocaleString()}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer (Fixed at bottom - always visible) */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/80">
          <Button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl h-10 sm:h-11 shadow-xs"
          >
            เข้าใจแล้ว
          </Button>
        </div>
      </div>
    </div>
  );
}
