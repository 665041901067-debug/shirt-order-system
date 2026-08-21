"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product, Campaign } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Shirt, 
  Sparkles, 
  ArrowRight, 
  Calendar, 
  ShoppingBag, 
  Search, 
  Radio, 
  Filter,
  Eye,
  CheckCircle2,
  Zap
} from "lucide-react";

interface Props {
  initialCampaign: Campaign | null;
  initialProducts: Product[];
}

export function StudentHomeInteractive({ initialCampaign, initialProducts }: Props) {
  const [campaign, setCampaign] = useState<Campaign | null>(initialCampaign);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Realtime WebSocket Subscriptions for Products & Campaigns
  useEffect(() => {
    const supabase = createClient();

    const productChannel = supabase
      .channel("student-realtime-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        async () => {
          const { data } = await supabase
            .from("products")
            .select(`
              *,
              images:product_images(*),
              sizes:product_sizes(*),
              campaign:campaigns(*)
            `)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

          if (data) setProducts(data as Product[]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        async () => {
          const { data } = await supabase
            .from("campaigns")
            .select("*")
            .eq("status", "OPEN")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          setCampaign((data as Campaign) || null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productChannel);
    };
  }, []);

  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category || "ทั่วไป")))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || (p.category || "ทั่วไป") === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      
      {/* Active Campaign Hero Banner */}
      {campaign ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white p-8 md:p-12 shadow-2xl shadow-blue-900/20 border border-blue-700/30">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute right-40 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-200 border-blue-400/30 backdrop-blur-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-300 animate-pulse" />
                <span>แคมเปญเปิดสั่งซื้อปัจจุบัน</span>
              </Badge>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>เปิดรับออเดอร์</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              {campaign.title}
            </h1>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              {campaign.description || "เปิดสั่งซื้อเสื้อกีฬาสาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT ประจำปี เลือกสกรีนชื่อและเบอร์เสื้อได้ตามต้องการ"}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-blue-200">
              <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-xs">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span>เปิดถึง: {new Date(campaign.end_date).toLocaleDateString("th-TH")}</span>
              </div>
            </div>
          </div>

          {campaign.banner_url && (
            <div className="absolute right-0 top-0 bottom-0 w-1/3 hidden lg:block opacity-40 mix-blend-overlay">
              <Image src={campaign.banner_url} alt={campaign.title} fill className="object-cover" />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl bg-slate-50 p-2 border border-slate-200/80 shadow-xs flex items-center justify-center">
            <img src="/images/logo.png" alt="CPE & IoT Logo" className="h-full w-full object-contain" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">สาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              ระบบสั่งซื้อเสื้อกีฬา
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              เลือกซื้อเสื้อกีฬาสาขา กำหนดตัวเลือก สกรีนชื่อ สกรีนเบอร์เสื้อ พร้อมติดตามสถานะกระบวนการผลิตแบบเรียลไทม์
            </p>
          </div>
        </div>
      )}

      {/* Interactive Controls Bar: Search & Category Filter Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Shirt className="h-5 w-5 text-blue-600" />
              <span>รายการสินค้าที่เปิดจำหน่าย ({filteredProducts.length})</span>
            </h2>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาสินค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat === "ALL" ? "สินค้าทั้งหมด" : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="ไม่พบรายการสินค้า"
          description="ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่น"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const mainImg = product.images?.find((i) => i.image_type === "MAIN")?.image_url || product.images?.[0]?.image_url;

            return (
              <Card
                key={product.id}
                className="group border-slate-200 bg-white rounded-3xl overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 transition-all duration-300 flex flex-col"
              >
                {/* Product Image Box */}
                <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                  {mainImg ? (
                    <Image
                      src={mainImg}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Shirt className="h-16 w-16 stroke-[1]" />
                      <span className="text-xs mt-2 font-medium">ไม่มีรูปภาพ</span>
                    </div>
                  )}

                  {product.category && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" size="sm" className="bg-white/90 backdrop-blur-xs font-semibold shadow-xs">
                        {product.category}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {product.description || "เสื้อกีฬาสาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT"}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">ราคาเริ่มต้น</span>
                      <span className="text-xl font-black text-blue-600">
                        ฿{Number(product.base_price).toLocaleString()}
                      </span>
                    </div>

                    <Link href={`/products/${product.id}`} prefetch={true}>
                      <Button className="rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md">
                        <span>สั่งซื้อ</span>
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
