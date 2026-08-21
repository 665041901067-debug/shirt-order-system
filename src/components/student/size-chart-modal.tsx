"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Ruler, X, Check } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SizeChartModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const sizeChartData = [
    { size: "S", chest: "36\"", length: "26\"", priceAdj: "ปกติ" },
    { size: "M", chest: "38\"", length: "27\"", priceAdj: "ปกติ" },
    { size: "L", chest: "40\"", length: "28\"", priceAdj: "ปกติ" },
    { size: "XL", chest: "42\"", length: "29\"", priceAdj: "+฿20" },
    { size: "2XL", chest: "44\"", length: "30\"", priceAdj: "+฿30" },
    { size: "3XL", chest: "46\"", length: "31\"", priceAdj: "+฿50" },
    { size: "4XL", chest: "48\"", length: "32\"", priceAdj: "+฿70" },
    { size: "5XL", chest: "50\"", length: "33\"", priceAdj: "+฿90" },
  ];

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

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-900 uppercase">
                <tr>
                  <th className="p-3">ไซส์ (Size)</th>
                  <th className="p-3">รอบอก (Chest)</th>
                  <th className="p-3">ความยาว (Length)</th>
                  <th className="p-3 text-right">ปรับราคา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sizeChartData.map((row) => (
                  <tr key={row.size} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3 font-extrabold text-blue-600">{row.size}</td>
                    <td className="p-3">{row.chest}</td>
                    <td className="p-3">{row.length}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{row.priceAdj}</td>
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
