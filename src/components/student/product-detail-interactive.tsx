"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Product, Profile, ProductSize, OptionValue } from "@/types";
import { ShirtPreview } from "./shirt-preview";
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
  Maximize2
} from "lucide-react";

import { SPORT_TYPES, SportType, buildSportNote } from "@/lib/sports";

interface Props {
  product: Product;
  profile: Profile | null;
}

export function ProductDetailInteractive({ product, profile }: Props) {
  const router = useRouter();

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

  const toast = useToast();

  const handleAddToCart = async () => {
    if (!selectedSize) {
      toast.error("กรุณาเลือกไซส์เสื้อก่อนเพิ่มลงในตะกร้า");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

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

    setSubmitting(false);

    if (!res.success) {
      toast.error(res.error || "เกิดข้อผิดพลาดในการเพิ่มลงตะกร้า");
    } else {
      toast.success("เพิ่มสินค้าลงในตะกร้าเรียบร้อยแล้ว!");
      router.push("/cart");
      router.refresh();
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

          {/* Main Product Image View with Zoom / Multi-image */}
          <div className="relative aspect-square w-full bg-[#F8FAFC] rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs group flex items-center justify-center p-3">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Shirt className="h-20 w-20 stroke-[1]" />
                <span className="text-sm mt-2 font-medium">ไม่มีรูปภาพ</span>
              </div>
            )}

            {selectedImage && (
              <button
                onClick={() => setIsZoomOpen(true)}
                className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs text-slate-800 px-3 py-1.5 rounded-xl shadow-md hover:bg-white transition-all flex items-center gap-1.5 text-xs font-semibold border border-slate-200/60"
              >
                <Maximize2 className="h-4 w-4 text-blue-600" />
                <span>ขยายรูปใหญ่</span>
              </button>
            )}
          </div>

          {/* Multi-Image Thumbnails Gallery Carousel */}
          {images.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Images className="h-4 w-4 text-blue-600" />
                <span>รูปภาพสินค้าหลายมุมมอง ({images.length} รูป)</span>
              </span>

              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.image_url)}
                    className={`relative h-20 w-20 flex-shrink-0 rounded-2xl border-2 overflow-hidden bg-[#F8FAFC] transition-all p-1 flex items-center justify-center ${
                      selectedImage === img.image_url
                        ? "border-blue-600 ring-2 ring-blue-500/20 scale-105"
                        : "border-slate-200 hover:border-slate-300 opacity-80"
                    }`}
                  >
                    <img src={img.image_url} alt={img.image_type || "thumbnail"} className="max-h-full max-w-full object-contain" />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[9px] text-white text-center font-bold uppercase py-0.5">
                      {img.image_type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Product Specs, Size, Options, Customization & Add to Cart */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="border-slate-200 shadow-md bg-white rounded-3xl">
            <CardContent className="p-6 md:p-8 space-y-6">
              
              {/* Category & Title */}
              <div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="mb-2">
                    {product.category || "เสื้อกีฬาสาขา"}
                  </Badge>

                  {/* Size Chart Modal Trigger Button */}
                  <button
                    onClick={() => setIsSizeChartOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200"
                  >
                    <Ruler className="h-4 w-4" />
                    <span>ตารางไซส์เสื้อ (Size Chart)</span>
                  </button>
                </div>

                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {product.name}
                </h1>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {product.description || "เสื้อกีฬาสาขาคุณภาพสูง ทนทาน ออกแบบให้กระชับสวมใส่สบาย"}
                </p>
              </div>

              {/* Price Display */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">ราคาต่อชิ้น</span>
                  <span className="text-2xl font-extrabold text-blue-600">
                    ฿{unitPrice.toLocaleString()}
                  </span>
                  {sizeAdjustment > 0 || optionsAdjustment > 0 ? (
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      (ราคาพื้นฐาน ฿{basePrice}
                      {sizeAdjustment > 0 && ` + ไซส์ ฿${sizeAdjustment}`}
                      {optionsAdjustment > 0 && ` + สกรีน ฿${optionsAdjustment}`})
                    </span>
                  ) : null}
                </div>

                <Badge variant="success" className="text-xs px-3 py-1">
                  เปิดรับพรีออเดอร์
                </Badge>
              </div>

              {/* Error / Success Feedback */}
              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* 1. SIZE SELECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    1. เลือกไซส์เสื้อ (Size) *
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
                          onClick={() => setSelectedSize(s)}
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

              {/* 2. DYNAMIC OPTIONS */}
              {product.options && product.options.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    2. ตัวเลือกเพิ่มเติม (Custom Options)
                  </label>
                  {product.options.map((optGroup) => {
                    const group = optGroup.group;
                    if (!group || !optGroup.is_active) return null;

                    return (
                      <div key={group.id} className="space-y-2">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5 text-blue-500" />
                          <span>{group.name}</span>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.values?.map((val) => {
                            const isValSelected = selectedOptions[group.id]?.id === val.id;
                            return (
                              <button
                                key={val.id}
                                type="button"
                                onClick={() =>
                                  setSelectedOptions((prev) => ({
                                    ...prev,
                                    [group.id]: val,
                                  }))
                                }
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

              {/* 3. CUSTOM SHIRT NAME & NUMBER INPUTS (Controlled by Admin Toggles) */}
              {(allowCustomName || allowCustomNumber) && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    3. ข้อมูลสกรีนชื่อและเบอร์เสื้อ
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {allowCustomName && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-semibold text-slate-700">ชื่อหลังเสื้อ (Custom Name)</label>
                          <span className="text-[11px] font-bold text-blue-600">
                            {customNamePrice > 0 ? `+฿${customNamePrice}` : "(สกรีนฟรี)"}
                          </span>
                        </div>
                        <Input
                          placeholder="เช่น OAT"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                          maxLength={15}
                        />
                      </div>
                    )}

                    {allowCustomNumber && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-semibold text-slate-700">เบอร์หลังเสื้อ (Custom Number)</label>
                          <span className="text-[11px] font-bold text-blue-600">
                            {customNumberPrice > 0 ? `+฿${customNumberPrice}` : "(สกรีนฟรี)"}
                          </span>
                        </div>
                        <Input
                          placeholder="เช่น 07"
                          value={customNumber}
                          onChange={(e) => setCustomNumber(e.target.value)}
                          maxLength={3}
                        />
                      </div>
                    )}
                  </div>

                  {/* Sport Selection */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        ประเภทกีฬาที่ลงแข่งขัน (Sport Type)
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
                            onClick={() => setSelectedSport(sport)}
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

                  {/* Note Field (Order Item Note) */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-slate-700">
                      หมายเหตุเพิ่มเติม (Note)
                    </label>
                    <Input
                      placeholder="เช่น ระบุชื่อเพื่อน หรือรายละเอียดเพิ่มเติม"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-400">
                      * หมายเหตุนี้ใช้กำกับสำหรับเสื้อชิ้นนี้โดยเฉพาะ
                    </p>
                  </div>
                </div>
              )}

              {/* 4. QUANTITY & TOTAL PRICE SUMMARY */}
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

                {/* Total Summary */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">ราคารวมสุทธิ (Grand Total)</span>
                    <span className="text-2xl font-black text-blue-400">
                      ฿{totalPrice.toLocaleString()}
                    </span>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    isLoading={submitting}
                    disabled={!selectedSize}
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md"
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
