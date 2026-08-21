"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Product, ProductSize, ProductImage } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Shirt, Plus, Trash2, Edit, Sparkles, Check, Images, Settings2, Upload, PlusCircle, FileImage } from "lucide-react";

interface Props {
  initialProducts: Product[];
}

export function AdminProductsInteractive({ initialProducts }: Props) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadingImgId, setUploadingImgId] = useState<string | null>(null);

  // Product Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    base_price: 350,
    category: "เสื้อกีฬาสาขา",
    preview_enabled: true,
    allow_custom_name: true,
    allow_custom_number: true,
    custom_name_price: 0,
    custom_number_price: 0,
  });

  // Sizes management state for editing
  const [editingSizes, setEditingSizes] = useState<{ size_name: string; price_adjustment: number }[]>([
    { size_name: "S", price_adjustment: 0 },
    { size_name: "M", price_adjustment: 0 },
    { size_name: "L", price_adjustment: 0 },
    { size_name: "XL", price_adjustment: 20 },
    { size_name: "2XL", price_adjustment: 30 },
    { size_name: "3XL", price_adjustment: 50 },
    { size_name: "4XL", price_adjustment: 70 },
  ]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      base_price: 350,
      category: "เสื้อกีฬาสาขา",
      preview_enabled: true,
      allow_custom_name: true,
      allow_custom_number: true,
      custom_name_price: 0,
      custom_number_price: 0,
    });
    setEditingSizes([
      { size_name: "S", price_adjustment: 0 },
      { size_name: "M", price_adjustment: 0 },
      { size_name: "L", price_adjustment: 0 },
      { size_name: "XL", price_adjustment: 20 },
      { size_name: "2XL", price_adjustment: 30 },
      { size_name: "3XL", price_adjustment: 50 },
      { size_name: "4XL", price_adjustment: 70 },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      description: p.description || "",
      base_price: Number(p.base_price) || 350,
      category: p.category || "เสื้อกีฬาสาขา",
      preview_enabled: p.preview_enabled !== false,
      allow_custom_name: p.allow_custom_name !== false,
      allow_custom_number: p.allow_custom_number !== false,
      custom_name_price: Number(p.custom_name_price) || 0,
      custom_number_price: Number(p.custom_number_price) || 0,
    });
    if (p.sizes && p.sizes.length > 0) {
      setEditingSizes(
        p.sizes.map((s) => ({
          size_name: s.size_name,
          price_adjustment: Number(s.price_adjustment) || 0,
        }))
      );
    }
    setIsModalOpen(true);
  };

  const handleToggleProductStatus = async (productId: string, currentStatus: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_active: !currentStatus })
      .eq("id", productId);

    if (!error) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_active: !currentStatus } : p))
      );
      router.refresh();
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      router.refresh();
    }
  };

  const handleAddSize = () => {
    setEditingSizes([...editingSizes, { size_name: "5XL", price_adjustment: 90 }]);
  };

  const handleRemoveSize = (index: number) => {
    setEditingSizes(editingSizes.filter((_, i) => i !== index));
  };

  // Multi-File Image Upload directly from file selector
  const handleFileUploadForProduct = async (productId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImgId(productId);
    const supabase = createClient();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${productId}_${Date.now()}_${i}.${fileExt}`;
      const filePath = fileName;

      let uploadedUrl = "";
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("products")
        .upload(filePath, file);

      if (uploadErr) {
        const { data: pubUrl } = supabase.storage.from("products").getPublicUrl(filePath);
        uploadedUrl = pubUrl.publicUrl;
      } else {
        const { data: pubUrl } = supabase.storage.from("products").getPublicUrl(uploadData.path);
        uploadedUrl = pubUrl.publicUrl;
      }

      const imgType = i === 0 ? "MAIN" : i === 1 ? "FRONT" : i === 2 ? "BACK" : "GALLERY";

      const { data: newImg } = await supabase
        .from("product_images")
        .insert({
          product_id: productId,
          image_url: uploadedUrl,
          image_type: imgType,
          display_order: i + 1,
        })
        .select()
        .single();

      if (newImg) {
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === productId) {
              return { ...p, images: [...(p.images || []), newImg as ProductImage] };
            }
            return p;
          })
        );
      }
    }

    setUploadingImgId(null);
    router.refresh();
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    const supabase = createClient();

    if (editingProduct) {
      let { error: updateErr } = await supabase
        .from("products")
        .update({
          name: formData.name,
          description: formData.description,
          base_price: formData.base_price,
          category: formData.category,
          preview_enabled: formData.preview_enabled,
          allow_custom_name: formData.allow_custom_name,
          allow_custom_number: formData.allow_custom_number,
          custom_name_price: formData.custom_name_price,
          custom_number_price: formData.custom_number_price,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingProduct.id);

      if (updateErr && updateErr.message.includes("allow_custom_name")) {
        const fallbackRes = await supabase
          .from("products")
          .update({
            name: formData.name,
            description: formData.description,
            base_price: formData.base_price,
            category: formData.category,
            preview_enabled: formData.preview_enabled,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingProduct.id);
        updateErr = fallbackRes.error;
      }

      if (updateErr) {
        setErrorMsg(updateErr.message);
        setSubmitting(false);
        return;
      }

      // Re-insert sizes
      await supabase.from("product_sizes").delete().eq("product_id", editingProduct.id);
      
      const sizesToInsert = editingSizes.map((s, idx) => ({
        product_id: editingProduct.id,
        size_name: s.size_name,
        price_adjustment: s.price_adjustment,
        stock: 999,
        display_order: idx + 1,
      }));

      await supabase.from("product_sizes").insert(sizesToInsert);

      setSubmitting(false);
      setIsModalOpen(false);
      router.refresh();
    } else {
      let newProd: any = null;
      let error: any = null;

      const res = await supabase
        .from("products")
        .insert({
          name: formData.name,
          description: formData.description,
          base_price: formData.base_price,
          category: formData.category,
          preview_enabled: formData.preview_enabled,
          allow_custom_name: formData.allow_custom_name,
          allow_custom_number: formData.allow_custom_number,
          custom_name_price: formData.custom_name_price,
          custom_number_price: formData.custom_number_price,
          is_active: true,
        })
        .select()
        .single();

      if (res.error && res.error.message.includes("allow_custom_name")) {
        const fallbackRes = await supabase
          .from("products")
          .insert({
            name: formData.name,
            description: formData.description,
            base_price: formData.base_price,
            category: formData.category,
            preview_enabled: formData.preview_enabled,
            is_active: true,
          })
          .select()
          .single();

        newProd = fallbackRes.data;
        error = fallbackRes.error;
      } else {
        newProd = res.data;
        error = res.error;
      }

      if (error || !newProd) {
        setErrorMsg(error?.message || "สร้างสินค้าไม่สำเร็จ");
        setSubmitting(false);
        return;
      }

      const sizesToInsert = editingSizes.map((s, idx) => ({
        product_id: newProd.id,
        size_name: s.size_name,
        price_adjustment: s.price_adjustment,
        stock: 999,
        display_order: idx + 1,
      }));

      await supabase.from("product_sizes").insert(sizesToInsert);

      setSubmitting(false);
      setIsModalOpen(false);
      setProducts([newProd as Product, ...products]);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shirt className="h-6 w-6 text-blue-600" />
            <span>จัดการสินค้า</span>
          </h1>
        </div>

        <Button onClick={openCreateModal} className="rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          <span>เพิ่มสินค้าใหม่</span>
        </Button>
      </div>

      {/* Product List or Empty State */}
      {products.length === 0 ? (
        <EmptyState
          icon={Shirt}
          title="ยังไม่มีรายการสินค้าในระบบ"
          description="กดปุ่ม 'เพิ่มสินค้าใหม่' ด้านบน เพื่อเริ่มต้นลงข้อมูลสินค้า ราคา ไซส์ และรูปภาพหลายมุมมอง"
          action={
            <Button onClick={openCreateModal} className="rounded-xl">
              <Plus className="h-4 w-4 mr-1" />
              <span>เพิ่มสินค้าใหม่</span>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const mainImg = product.images?.find((i) => i.image_type === "MAIN")?.image_url || product.images?.[0]?.image_url;

            return (
              <Card key={product.id} className="border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs">
                <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                  {mainImg ? (
                    <img src={mainImg} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Shirt className="h-16 w-16 stroke-[1]" />
                      <span className="text-xs mt-2 font-medium">ไม่มีรูปภาพ</span>
                    </div>
                  )}

                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <Badge variant={product.is_active ? "success" : "danger"}>
                      {product.is_active ? "เปิดขายอยู่" : "ปิดการขาย"}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{product.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]">
                      {product.description || "ไม่มีรายละเอียดสินค้า"}
                    </p>

                    {/* Active Controls Overview */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <Badge variant={product.allow_custom_name !== false ? "primary" : "secondary"} size="sm">
                        {product.allow_custom_name !== false ? `✓ ชื่อ (${Number(product.custom_name_price) > 0 ? `+฿${product.custom_name_price}` : "ฟรี"})` : "✕ ปิดสกรีนชื่อ"}
                      </Badge>
                      <Badge variant={product.allow_custom_number !== false ? "primary" : "secondary"} size="sm">
                        {product.allow_custom_number !== false ? `✓ เบอร์ (${Number(product.custom_number_price) > 0 ? `+฿${product.custom_number_price}` : "ฟรี"})` : "✕ ปิดสกรีนเบอร์"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">ราคาเริ่มต้น</span>
                      <span className="text-lg font-extrabold text-blue-600">
                        ฿{Number(product.base_price).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(product)}
                        className="rounded-xl text-xs"
                      >
                        <Settings2 className="h-3.5 w-3.5 mr-1" />
                        <span>แก้ไขข้อมูล</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleProductStatus(product.id, product.is_active)}
                        className="rounded-xl text-xs"
                      >
                        {product.is_active ? "ปิดขาย" : "เปิดขาย"}
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="rounded-xl p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Multi-File Upload Input for Images */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Images className="h-3.5 w-3.5 text-blue-600" />
                      <span>อัปโหลดรูปภาพสินค้าหลายรูป (Multi-Image Upload):</span>
                    </span>

                    <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50 hover:bg-slate-100/60 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => handleFileUploadForProduct(product.id, e.target.files)}
                        className="hidden"
                        id={`product-file-upload-${product.id}`}
                      />
                      <label htmlFor={`product-file-upload-${product.id}`} className="cursor-pointer flex items-center justify-center gap-2 text-xs font-semibold text-blue-600">
                        <FileImage className="h-4 w-4" />
                        <span>{uploadingImgId === product.id ? "กำลังอัปโหลด..." : "+ เลือกรูปภาพเพิ่ม (เลือกได้หลายรูป)"}</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Product Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <Card className="w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span>{editingProduct ? `แก้ไขสินค้า: ${editingProduct.name}` : "เพิ่มสินค้าใหม่เข้าสู่ระบบ"}</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                  ✕
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-5">
                
                {/* 1. Basic Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">1. ข้อมูลทั่วไป</h4>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">ชื่อสินค้า *</label>
                    <Input
                      placeholder="เช่น เสื้อกีฬาสาขา CPE & IoT 2026"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">รายละเอียดสินค้า</label>
                    <Input
                      placeholder="คำอธิบายรายละเอียดสั้นๆ..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">ราคาเริ่มต้น (บาท) *</label>
                      <Input
                        type="number"
                        value={formData.base_price}
                        onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">หมวดหมู่</label>
                      <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Custom Name & Custom Number Toggles AND Pricing */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">2. ควบคุมการสกรีนตัวหนังสือและราคาเพิ่มเติม</h4>

                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.allow_custom_name}
                          onChange={(e) => setFormData({ ...formData, allow_custom_name: e.target.checked })}
                          className="h-4 w-4 rounded text-blue-600"
                        />
                        <span className="text-xs font-bold text-slate-800">เปิดให้สกรีนชื่อหลังเสื้อ</span>
                      </label>

                      {formData.allow_custom_name && (
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-xs text-slate-500 font-semibold">คิดค่าสกรีนชื่อ (+บาท):</span>
                          <Input
                            type="number"
                            placeholder="0 = สกรีนฟรี"
                            value={formData.custom_name_price}
                            onChange={(e) => setFormData({ ...formData, custom_name_price: Number(e.target.value) })}
                            className="text-xs h-8 w-32"
                          />
                          <span className="text-[11px] text-slate-400">บาท (0 = ฟรี)</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.allow_custom_number}
                          onChange={(e) => setFormData({ ...formData, allow_custom_number: e.target.checked })}
                          className="h-4 w-4 rounded text-blue-600"
                        />
                        <span className="text-xs font-bold text-slate-800">เปิดให้สกรีนเบอร์หลังเสื้อ</span>
                      </label>

                      {formData.allow_custom_number && (
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-xs text-slate-500 font-semibold">คิดค่าสกรีนเบอร์ (+บาท):</span>
                          <Input
                            type="number"
                            placeholder="0 = สกรีนฟรี"
                            value={formData.custom_number_price}
                            onChange={(e) => setFormData({ ...formData, custom_number_price: Number(e.target.value) })}
                            className="text-xs h-8 w-32"
                          />
                          <span className="text-[11px] text-slate-400">บาท (0 = ฟรี)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Dynamic Sizes & Price Adjustments */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      3. กำหนดไซส์เสื้อและการเพิ่มราคา (+บาท)
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddSize}
                      className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>เพิ่มไซส์</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {editingSizes.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="w-24">
                          <Input
                            placeholder="ชื่อไซส์"
                            value={s.size_name}
                            onChange={(e) => {
                              const updated = [...editingSizes];
                              updated[idx].size_name = e.target.value;
                              setEditingSizes(updated);
                            }}
                            className="text-xs h-8 font-bold"
                          />
                        </div>

                        <div className="flex-1 flex items-center gap-1">
                          <span className="text-xs text-slate-500 font-semibold">+฿</span>
                          <Input
                            type="number"
                            placeholder="บวกราคา"
                            value={s.price_adjustment}
                            onChange={(e) => {
                              const updated = [...editingSizes];
                              updated[idx].price_adjustment = Number(e.target.value);
                              setEditingSizes(updated);
                            }}
                            className="text-xs h-8"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSize(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" isLoading={submitting} className="w-full mt-4 rounded-xl">
                  <span>{editingProduct ? "บันทึกการแก้ไขทั้งหมด" : "บันทึกและสร้างสินค้า"}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
