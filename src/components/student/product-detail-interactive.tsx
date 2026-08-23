"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Product, Profile, ProductSize, OptionValue } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { SizeChartModal } from "./size-chart-modal";
import { addToCart } from "@/services/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { 
  Shirt, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Check, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle,
  Tag,
  Ruler,
  Images,
  Maximize2,
  Trophy,
  Info
} from "lucide-react";

import { SPORT_TYPES, SportType, buildSportNote } from "@/lib/sports";

interface Props {
  product: Product;
  profile: Profile | null;
}

export function ProductDetailInteractive({ product, profile }: Props) {
  const router = useRouter();
  const toast = useToast();

  // Images state (Multi-image gallery view)
  const images = product.images || [];
  const mainImage = images.find((i) => i.image_type === "MAIN")?.image_url || images[0]?.image_url;
  const [selectedImage, setSelectedImage] = useState<string>(mainImage || "");
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Size chart modal state
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);

  // Size selection state
  const sizes = product.sizes?.filter((s) => s.is_active) || [];
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(sizes[0] || null);

  // Customization state
  const allowCustomName = product.allow_custom_name !== false;
  const allowCustomNumber = product.allow_custom_number !== false;
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [selectedSport, setSelectedSport] = useState<string>("ไม่ได้เล่นกีฬา");
  const [note, setNote] = useState("");

  // Quantity state
  const [quantity, setQuantity] = useState(1);

  // Options state
  const [selectedOptions, setSelectedOptions] = useState<Record<string, OptionValue>>({});

  // Loading & Feedback state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Realtime live update for product details and prices
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`product-live-${product.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `id=eq.${product.id}` },
        () => {
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_sizes", filter: `product_id=eq.${product.id}` },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [product.id, router]);

  // 100% Strict & Accurate Price Calculation Logic
  const basePrice = Number(product.base_price) || 0;
  const sizeAdjustment = Number(selectedSize?.price_adjustment) || 0;
  const optionsAdjustment = Object.values(selectedOptions).reduce(
    (sum, opt) => sum + (Number(opt.price_adjustment) || 0),
    0
  );

  const customNamePrice = Number(product.custom_name_price) || 0;
  const customNumberPrice = Number(product.custom_number_price) || 0;
  
  const nameAdjustment = (customName.trim() && allowCustomName) ? customNamePrice : 0;
  const numberAdjustment = (customNumber.trim() && allowCustomNumber) ? customNumberPrice : 0;

  const unitPrice = basePrice + sizeAdjustment + optionsAdjustment + nameAdjustment + numberAdjustment;
  const totalPrice = unitPrice * quantity;

  // Compute Dynamic Sequential Step Numbers (No Number Skipping)
  let currentStep = 1;
  const sizeStep = currentStep++;
  const hasActiveOptions = product.options && product.options.some((o) => o.is_active && o.group);
  const optionsStep = hasActiveOptions ? currentStep++ : null;
  const customStep = (allowCustomName || allowCustomNumber) ? currentStep++ : null;
  const sportStep = currentStep++;
  const noteStep = currentStep++;

  const handleAddToCart = async () => {
    // 1. Mandatory Size Validation
    if (!selectedSize) {
      toast.error("กรุณาเลือกไซส์เสื้อก่อนดำเนินการ");
      setErrorMsg("กรุณาเลือกไซส์เสื้อก่อนดำเนินการ");
      return;
    }

    // 2. Mandatory Options Validation (if product has active option groups)
    if (hasActiveOptions && product.options) {
      for (const optGroup of product.options) {
        if (optGroup.is_active && optGroup.group) {
          if (!selectedOptions[optGroup.group.id]) {
            toast.error(`กรุณาเลือกตัวเลือก: ${optGroup.group.name}`);
            setErrorMsg(`กรุณาเลือกตัวเลือก: ${optGroup.group.name}`);
            return;
          }
        }
      }
    }

    // 3. Mandatory Custom Name Validation (if custom name is enabled)
    if (allowCustomName && !customName.trim()) {
      toast.error("กรุณากรอกชื่อหลังเสื้อ ");
      setErrorMsg("กรุณากรอกชื่อหลังเสื้อ ");
      return;
    }

    // 4. Mandatory Custom Number Validation (if custom number is enabled)
    if (allowCustomNumber && !customNumber.trim()) {
      toast.error("กรุณากรอกเบอร์หลังเสื้อ ");
      setErrorMsg("กรุณากรอกเบอร์หลังเสื้อ ");
      return;
    }

    // 5. Mandatory Sport Type Validation
    if (!selectedSport) {
      toast.error("กรุณาเลือกประเภทกีฬาที่ลงแข่งขัน");
      setErrorMsg("กรุณาเลือกประเภทกีฬาที่ลงแข่งขัน");
      return;
    }

    // Note is Optional (ยกเว้นหมายเหตุไม่ต้องบังคับกรอก)

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const optionValueIds = Object.values(selectedOptions).map((o) => o.id);
      const combinedNote = buildSportNote(selectedSport, note);

      const res = await addToCart({
        product_id: product.id,
        size_id: selectedSize.id,
        custom_name: allowCustomName ? customName.trim() || undefined : undefined,
        custom_number: allowCustomNumber ? customNumber.trim() || undefined : undefined,
        note: combinedNote,
        quantity,
        option_value_ids: optionValueIds,
      });

      if (!res.success) {
        toast.error(res.error || "เกิดข้อผิดพลาดในการเพิ่มลงตะกร้า");
        setErrorMsg(res.error || "เกิดข้อผิดพลาดในการเพิ่มลงตะกร้า");
        if (res.requireLogin) {
          router.push("/login");
        }
      } else {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("app:cart-changed"));
        }
        toast.success("เพิ่มสินค้าลงในตะกร้าเรียบร้อยแล้ว!");
        router.push("/cart");
        router.refresh();
      }
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Size Chart Modal */}
      <SizeChartModal isOpen={isSizeChartOpen} onClose={() => setIsSizeChartOpen(false)} />

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>ย้อนกลับไปหน้าสินค้า</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Image Gallery Carousel */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-xs rounded-3xl">
            <CardContent className="p-4 sm:p-6 space-y-4">
              
              {/* Main Image Stage */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 group">
                {selectedImage ? (
                  <Image
                    src={selectedImage}
                    alt={product.name}
                    fill
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <Shirt className="h-20 w-20 stroke-[1]" />
                  </div>
                )}

                {/* Zoom preview button */}
                {selectedImage && (
                  <button
                    onClick={() => setIsZoomOpen(true)}
                    className="absolute bottom-3 right-3 p-2 rounded-xl bg-white/80 backdrop-blur-xs text-slate-700 hover:bg-white shadow-xs border border-slate-200"
                    title="ขยายรูปภาพ"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Thumbnails row */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                  {images.map((img) => {
                    const isSelected = selectedImage === img.image_url;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setSelectedImage(img.image_url)}
                        className={`relative h-16 w-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                          isSelected
                            ? "border-blue-600 ring-2 ring-blue-100 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <Image
                          src={img.image_url}
                          alt="Thumbnail"
                          fill
                          className="object-contain p-1"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customization & Ordering Form */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="border-slate-200 bg-white rounded-3xl shadow-xs">
            <CardContent className="p-6 sm:p-8 space-y-6">
              
              {/* Product Header */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {product.name}
                </h1>
                {product.description && (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Price Tag Box */}
              <div className="flex items-center justify-between p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
                <div>
                  <span className="text-xs text-blue-600 font-semibold block">ราคาต่อชิ้น</span>
                  <span className="text-2xl font-black text-blue-700">
                    ฿{unitPrice.toLocaleString()}
                  </span>
                  {sizeAdjustment > 0 || optionsAdjustment > 0 || nameAdjustment > 0 || numberAdjustment > 0 ? (
                    <span className="text-[11px] text-slate-500 block">
                      (ราคาพื้นฐาน ฿{basePrice}
                      {sizeAdjustment > 0 ? ` + ไซส์ ฿${sizeAdjustment}` : ""}
                      {optionsAdjustment > 0 ? ` + ตัวเลือก ฿${optionsAdjustment}` : ""}
                      {nameAdjustment > 0 ? ` + ชื่อ ฿${nameAdjustment}` : ""}
                      {numberAdjustment > 0 ? ` + เบอร์ ฿${numberAdjustment}` : ""}
                      )
                    </span>
                  ) : null}
                </div>

                <Badge variant="success" className="text-xs px-3 py-1 font-bold">
                  เปิดรับพรีออเดอร์
                </Badge>
              </div>

              {/* Error / Success Feedback */}
              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-2 animate-in fade-in">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* STEP 1: SIZE SELECTION (MANDATORY *) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    {sizeStep}. เลือกไซส์เสื้อ (Size) <span className="text-red-500 font-bold">*</span>
                  </label>
                  <button
                    onClick={() => setIsSizeChartOpen(true)}
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    ดูรอบอก/ความยาวในตารางไซส์
                  </button>
                </div>

                {sizes.length === 0 ? (
                  <p className="text-xs text-amber-600">ไม่มีข้อมูลไซส์เปิดขายในขณะนี้</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {sizes.map((s) => {
                      const isSelected = selectedSize?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedSize(s);
                            setErrorMsg("");
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border font-semibold text-xs transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"
                          }`}
                        >
                          <span className="text-sm font-bold">{s.size_name}</span>
                          <span className="text-[10px] mt-0.5 opacity-80">
                            {Number(s.price_adjustment) > 0
                              ? `+฿${s.price_adjustment}`
                              : "ปกติ"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 2: DYNAMIC OPTIONS (If Active Option Groups Exist - MANDATORY *) */}
              {hasActiveOptions && product.options && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    {optionsStep}. ตัวเลือกเพิ่มเติม (Custom Options) <span className="text-red-500 font-bold">*</span>
                  </label>
                  {product.options.map((optGroup) => {
                    const group = optGroup.group;
                    if (!group || !optGroup.is_active) return null;

                    return (
                      <div key={group.id} className="space-y-2">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5 text-blue-500" />
                          <span>{group.name} <span className="text-red-500">*</span></span>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.values?.map((val) => {
                            const isValSelected = selectedOptions[group.id]?.id === val.id;
                            return (
                              <button
                                key={val.id}
                                type="button"
                                onClick={() => {
                                  setSelectedOptions((prev) => ({
                                    ...prev,
                                    [group.id]: val,
                                  }));
                                  setErrorMsg("");
                                }}
                                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                                  isValSelected
                                    ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                }`}
                              >
                                <span>{val.label}</span>
                                <span className="text-[11px] text-slate-500">
                                  {Number(val.price_adjustment) > 0
                                    ? `+฿${val.price_adjustment}`
                                    : "ฟรี"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP: CUSTOM SHIRT NAME & NUMBER INPUTS (MANDATORY *) */}
              {(allowCustomName || allowCustomNumber) && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      {customStep}. ข้อมูลสกรีนชื่อและเบอร์เสื้อ <span className="text-red-500 font-bold">*</span>
                    </label>

                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {allowCustomName && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-semibold text-slate-700">
                            ชื่อหลังเสื้อ (Custom Name) <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[11px] font-bold text-blue-600">
                            {customNamePrice > 0 ? `+฿${customNamePrice}` : "(สกรีนฟรี)"}
                          </span>
                        </div>
                        <Input
                          placeholder="เช่น OAT"
                          value={customName}
                          onChange={(e) => {
                            setCustomName(e.target.value.toUpperCase());
                            setErrorMsg("");
                          }}
                          maxLength={15}
                          required
                        />
                      </div>
                    )}

                    {allowCustomNumber && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-semibold text-slate-700">
                            เบอร์หลังเสื้อ (Custom Number) <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[11px] font-bold text-blue-600">
                            {customNumberPrice > 0 ? `+฿${customNumberPrice}` : "(สกรีนฟรี)"}
                          </span>
                        </div>
                        <Input
                          placeholder="เช่น 07 "
                          value={customNumber}
                          onChange={(e) => {
                            setCustomNumber(e.target.value);
                            setErrorMsg("");
                          }}
                          maxLength={3}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP: SPORT SELECTION (MANDATORY *) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    {sportStep}. ประเภทกีฬาที่ลงแข่งขัน (Sport Type) <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (สำหรับแยกประเภทแจกเสื้อ)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SPORT_TYPES.map((sport) => {
                    const isSportSelected = selectedSport === sport;
                    return (
                      <button
                        key={sport}
                        type="button"
                        onClick={() => {
                          setSelectedSport(sport);
                          setErrorMsg("");
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSportSelected
                            ? "border-blue-600 bg-blue-50 text-blue-700 shadow-2xs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span>{sport}</span>
                        {isSportSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP: NOTE FIELD (OPTIONAL - ไม่ต้องบังคับกรอก) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    {noteStep}. หมายเหตุเพิ่มเติม (Note)
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (ไม่บังคับกรอก)
                  </span>
                </div>
                <Input
                  placeholder="เช่น ระบุชื่อเพื่อน หรือรายละเอียดเพิ่มเติม (ไม่บังคับ)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <p className="text-[11px] text-slate-400">
                  * หมายเหตุนี้ใช้กำกับสำหรับเสื้อชิ้นนี้โดยเฉพาะ
                </p>
              </div>

              {/* QUANTITY & STRICT GRAND TOTAL SUMMARY */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    จำนวนที่ต้องการ (Quantity)
                  </span>

                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white text-slate-700 font-bold"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-extrabold text-slate-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white text-slate-700 font-bold"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Total Summary Box with Complete Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">
                      ราคารวมสุทธิ ({quantity} ตัว x ฿{unitPrice.toLocaleString()})
                    </span>
                    <span className="text-2xl font-black text-blue-400">
                      ฿{totalPrice.toLocaleString()}
                    </span>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    isLoading={submitting}
                    disabled={!selectedSize}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md font-bold h-11 px-6 text-sm"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1.5" />
                    <span>เพิ่มลงตะกร้า</span>
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>

      {/* Image Zoom Modal */}
      {isZoomOpen && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-4xl w-full aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl">
            <Image src={selectedImage} alt={product.name} fill className="object-contain" />
            <button
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
