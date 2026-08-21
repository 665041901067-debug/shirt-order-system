"use client";

import React from "react";
import Image from "next/image";

interface ShirtPreviewProps {
  imageUrl?: string;
  name?: string;
  number?: string;
  productName?: string;
}

export function ShirtPreview({
  imageUrl,
  name = "",
  number = "",
  productName = "เสื้อกีฬา",
}: ShirtPreviewProps) {
  return (
    <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-800 group">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />

      {/* Main Shirt Image or Fallback Visual */}
      {imageUrl ? (
        <div className="relative w-full h-full p-4 flex items-center justify-center">
          <Image
            src={imageUrl}
            alt={productName}
            fill
            className="object-contain p-6 transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
      ) : (
        <div className="relative w-4/5 h-4/5 bg-gradient-to-b from-blue-900 via-blue-950 to-slate-900 rounded-3xl border border-blue-500/30 flex flex-col items-center justify-center p-6 shadow-2xl">
          {/* Default Graphic Shirt Mockup if image URL not uploaded yet */}
          <div className="text-blue-400 font-bold text-xs tracking-widest uppercase mb-4 opacity-80">
            CPE & IoT SPORTSWEAR
          </div>
        </div>
      )}

      {/* Realtime Customization Text Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-center px-4">
        {/* Name Overlay */}
        {name ? (
          <div className="text-white font-black text-xl md:text-2xl tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-black/40 px-4 py-1 rounded-md backdrop-blur-xs border border-white/10 mb-1 animate-in fade-in zoom-in-95 duration-200">
            {name}
          </div>
        ) : (
          <div className="text-slate-400/50 font-semibold text-xs tracking-widest uppercase bg-black/20 px-3 py-1 rounded-md border border-white/5 mb-1">
            [ ตัวอย่างชื่อ ]
          </div>
        )}

        {/* Number Overlay */}
        {number ? (
          <div className="text-blue-400 font-extrabold text-4xl md:text-6xl tracking-tighter drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] bg-black/40 px-5 py-0.5 rounded-lg backdrop-blur-xs border border-blue-500/30 animate-in fade-in zoom-in-95 duration-200">
            {number}
          </div>
        ) : (
          <div className="text-slate-500/50 font-extrabold text-3xl md:text-5xl tracking-tighter bg-black/20 px-4 py-0.5 rounded-lg border border-white/5">
            00
          </div>
        )}
      </div>

      {/* Live Badge */}
      <div className="absolute top-3 left-3 bg-blue-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs shadow-md border border-blue-400/30 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>LIVE PREVIEW</span>
      </div>
    </div>
  );
}
