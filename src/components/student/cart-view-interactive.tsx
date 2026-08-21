"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Cart, CartItem } from "@/types";
import { updateCartItemQuantity, removeCartItem, clearCart } from "@/services/cart";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Shirt, 
  ArrowLeft,
  FileText,
  Tag
} from "lucide-react";
import { extractSportType, cleanNoteWithoutSport, getSportBadgeColor } from "@/lib/sports";

interface Props {
  initialCart: Cart | null;
}

export function CartViewInteractive({ initialCart }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [cart, setCart] = useState<Cart | null>(initialCart);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const items = cart?.items || [];

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    setLoadingItemId(itemId);
    const res = await updateCartItemQuantity(itemId, newQty);
    if (res.success) {
      if (newQty <= 0) {
        setCart((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : null);
        toast.success("นำสินค้าออกจากตะกร้าแล้ว");
      } else {
        setCart((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i)),
              }
            : null
        );
        toast.info("อัปเดตจำนวนสินค้าเรียบร้อย");
      }
      router.refresh();
    } else {
      toast.error(res.error || "ไม่สามารถอัปเดตจำนวนสินค้าได้");
    }
    setLoadingItemId(null);
  };

  const handleRemoveItem = async (itemId: string) => {
    setLoadingItemId(itemId);
    const res = await removeCartItem(itemId);
    if (res.success) {
      setCart((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : null);
      toast.success("นำสินค้าออกจากตะกร้าเรียบร้อยแล้ว");
      router.refresh();
    } else {
      toast.error(res.error || "ไม่สามารถลบรายการได้");
    }
    setLoadingItemId(null);
  };

  const handleClearCart = async () => {
    if (!cart?.id) return;
    const res = await clearCart(cart.id);
    if (res.success) {
      setCart((prev) => prev ? { ...prev, items: [] } : null);
      toast.success("ล้างตะกร้าสินค้าเรียบร้อยแล้ว");
      router.refresh();
    } else {
      toast.error(res.error || "ไม่สามารถล้างตะกร้าได้");
    }
  };

  // Pricing calculations
  const calculateItemTotals = (item: CartItem) => {
    const base = Number(item.product?.base_price) || 0;
    const sizeAdj = Number(item.size?.price_adjustment) || 0;
    const optionsAdj = 0; 
    const unitPrice = base + sizeAdj + optionsAdj;
    return unitPrice * item.quantity;
  };

  const subtotal = items.reduce((sum, item) => sum + (Number(item.product?.base_price) || 0) * item.quantity, 0);
  const sizeAdjustments = items.reduce((sum, item) => sum + (Number(item.size?.price_adjustment) || 0) * item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + calculateItemTotals(item), 0);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="ไม่มีสินค้าในตะกร้า"
        description="คุณยังไม่ได้เลือกเสื้อกีฬาลงในตะกร้า สามารถเลือกดูสินค้าและสั่งซื้อได้ทันที"
        action={
          <Link href="/products">
            <Button className="rounded-xl font-bold">
              <span>ดูสินค้าทั้งหมด</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            <span>ตะกร้าสินค้า ({items.length} รายการ)</span>
          </h1>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearCart}
          className="text-slate-500 hover:text-red-600 hover:bg-red-50 self-start sm:self-auto rounded-xl text-xs"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          <span>ล้างตะกร้าสินค้า</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => {
            const product = item.product;
            const size = item.size;
            const mainImg = product?.images?.find((i) => i.image_type === "MAIN")?.image_url || product?.images?.[0]?.image_url;
            const itemTotal = calculateItemTotals(item);
            const sportType = extractSportType(item);
            const cleanNote = cleanNoteWithoutSport(item.note);

            return (
              <Card key={item.id} className="border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    
                    {/* Thumbnail */}
                    <div className="relative aspect-square h-24 w-24 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                      {mainImg ? (
                        <Image src={mainImg} alt={product?.name || "สินค้า"} fill className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                          <Shirt className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    {/* Content Specs */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base text-slate-900">
                            {product?.name || "เสื้อกีฬาสาขา"}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="secondary" size="sm">
                              ไซส์: {size?.size_name || "S"}
                            </Badge>
                            {Number(size?.price_adjustment) > 0 && (
                              <span className="text-[11px] text-slate-500 font-mono">
                                (+฿{size?.price_adjustment})
                              </span>
                            )}
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getSportBadgeColor(sportType)}`}>
                              กีฬา: {sportType}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={loadingItemId === item.id}
                          className="text-slate-400 hover:text-red-600 p-1 transition-colors rounded-lg"
                          title="ลบรายการ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Custom Name / Number Overlay details */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 font-medium block">ชื่อหลังเสื้อ:</span>
                          <span className="font-bold text-slate-800">
                            {item.custom_name ? item.custom_name : "(ไม่ระบุ)"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">เบอร์หลังเสื้อ:</span>
                          <span className="font-bold text-blue-600 font-mono">
                            {item.custom_number ? `#${item.custom_number}` : "(ไม่ระบุ)"}
                          </span>
                        </div>
                      </div>

                      {/* Item Note */}
                      {cleanNote && (
                        <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="italic">หมายเหตุ: {cleanNote}</span>
                        </div>
                      )}

                      {/* Quantity & Price Action */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center border border-slate-200 rounded-xl bg-white p-0.5">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={loadingItemId === item.id}
                            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-700 font-bold text-xs"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={loadingItemId === item.id}
                            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-700 font-bold text-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 font-medium block">ราคารวมรายการนี้</span>
                          <span className="text-base font-extrabold text-blue-600">
                            ฿{itemTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="lg:col-span-4">
          <Card className="border-slate-200 bg-white rounded-2xl shadow-md sticky top-24">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                สรุปคำสั่งซื้อ
              </h2>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>ราคาเสื้อพื้นฐาน</span>
                  <span className="font-semibold text-slate-800">฿{subtotal.toLocaleString()}</span>
                </div>

                {sizeAdjustments > 0 && (
                  <div className="flex justify-between">
                    <span>ค่าปรับตามไซส์เสื้อ</span>
                    <span className="font-semibold text-slate-800">฿{sizeAdjustments.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>ส่วนลด</span>
                  <span className="font-semibold text-emerald-600">฿0</span>
                </div>

                <div className="flex justify-between">
                  <span>ค่าจัดส่ง / รับสินค้าที่สาขา</span>
                  <span className="font-semibold text-slate-800">ฟรี (รับที่สาขา)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">ราคารวมทั้งสิ้น</span>
                  <span className="text-2xl font-black text-blue-600">
                    ฿{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <Link href="/checkout" className="block w-full pt-2">
                <Button className="w-full h-12 text-base font-bold rounded-xl shadow-md bg-blue-600 hover:bg-blue-500 text-white">
                  <span>ดำเนินการสั่งซื้อและชำระเงิน</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
