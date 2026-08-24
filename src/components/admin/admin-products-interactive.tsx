"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Product, ProductSize, ProductImage, ProductImageType } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { getAllAdminProducts } from "@/services/products";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { 
  Shirt, 
  Plus, 
  Trash2, 
  Edit, 
  Sparkles, 
  Check, 
  Images, 
  Settings2, 
  Upload, 
  PlusCircle, 
  FileImage,
  Star,
  Eye,
  Maximize2,
  X,
  RefreshCw,
  Loader2,
  ChevronRight,
  SlidersHorizontal
} from "lucide-react";

interface Props {
  initialProducts: Product[];
}

export function AdminProductsInteractive({ initialProducts }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadingImgId, setUploadingImgId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // Realtime Live Sync for Admin Products & Images
  useEffect(() => {
    const supabase = createClient();

    const fetchLatestProducts = async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select(`
            *,
            images:product_images(*),
            sizes:product_sizes(*),
            campaign:campaigns(*)
          `)
          .order("created_at", { ascending: false });

        if (data) {
          setProducts(data as Product[]);
        }
      } catch (e) {}
    };

    const channel = supabase
      .channel(`admin-products-live-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchLatestProducts();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_sizes" },
        () => {
          fetchLatestProducts();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_images" },
        () => {
          fetchLatestProducts();
        }
      )
      .subscribe();

    window.addEventListener("app:product-changed", fetchLatestProducts);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("app:product-changed", fetchLatestProducts);
    };
  }, []);

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
    // 1. Instant Optimistic state update (0ms)
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, is_active: !currentStatus } : p))
    );

    // 2. Backend update
    const supabase = createClient();
    await supabase
      .from("products")
      .update({ is_active: !currentStatus })
      .eq("id", productId);

    toast.info(!currentStatus ? "เปิดขายสินค้าเรียบร้อยแล้ว" : "ปิดการขายสินค้าเรียบร้อยแล้ว");
    window.dispatchEvent(new CustomEvent("app:product-changed"));
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?")) return;
    
    // 1. Instant Optimistic state update (0ms)
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    // 2. Backend delete
    const supabase = createClient();
    await supabase.from("products").delete().eq("id", productId);

    toast.success("ลบสินค้าเรียบร้อยแล้ว");
    window.dispatchEvent(new CustomEvent("app:product-changed"));
  };

  const handleAddSize = () => {
    setEditingSizes([...editingSizes, { size_name: "5XL", price_adjustment: 90 }]);
  };

  const handleRemoveSize = (index: number) => {
    setEditingSizes(editingSizes.filter((_, i) => i !== index));
  };

  // 1. Multi-File Image Upload directly to Supabase storage + DB
  const handleFileUploadForProduct = async (productId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImgId(productId);
    const supabase = createClient();
    const targetProduct = products.find((p) => p.id === productId);
    const currentImages = targetProduct?.images || [];
    const hasMainImage = currentImages.some((i) => i.image_type === "MAIN");

    try {
      const newImagesList: ProductImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${productId}_${Date.now()}_${i}.${fileExt}`;
        const filePath = fileName;

        let uploadedUrl = "";
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("products")
          .upload(filePath, file, { upsert: true });

        if (uploadErr) {
          const { data: pubUrl } = supabase.storage.from("products").getPublicUrl(filePath);
          uploadedUrl = pubUrl.publicUrl;
        } else {
          const { data: pubUrl } = supabase.storage.from("products").getPublicUrl(uploadData.path);
          uploadedUrl = pubUrl.publicUrl;
        }

        // If product currently has no main image, make the first uploaded image MAIN; otherwise GALLERY
        const isFirstAndNoMain = !hasMainImage && i === 0;
        const imgType = isFirstAndNoMain ? "MAIN" : "GALLERY";

        const { data: newImg } = await supabase
          .from("product_images")
          .insert({
            product_id: productId,
            image_url: uploadedUrl,
            image_type: imgType,
            display_order: currentImages.length + i + 1,
          })
          .select()
          .single();

        if (newImg) {
          newImagesList.push(newImg as ProductImage);
        }
      }

      if (newImagesList.length > 0) {
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === productId) {
              return { ...p, images: [...(p.images || []), ...newImagesList] };
            }
            return p;
          })
        );
        toast.success(`อัปโหลดรูปภาพใหม่ ${newImagesList.length} รูปเรียบร้อยแล้ว!`);
        window.dispatchEvent(new CustomEvent("app:product-changed"));
      }
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    } finally {
      setUploadingImgId(null);
    }
  };

  // 2. Set image as MAIN (Cover Photo)
  const handleSetMainImage = async (productId: string, imageId: string) => {
    setActionLoadingId(imageId);
    const supabase = createClient();

    // 1. Optimistic Update (0ms)
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedImgs: ProductImage[] = (p.images || []).map((img) => ({
            ...img,
            image_type: (img.id === imageId ? "MAIN" : (img.image_type === "MAIN" ? "GALLERY" : img.image_type)) as ProductImageType,
          }));
          return { ...p, images: updatedImgs };
        }
        return p;
      })
    );

    try {
      // 2. Update any other MAIN images of this product to GALLERY
      await supabase
        .from("product_images")
        .update({ image_type: "GALLERY" })
        .eq("product_id", productId)
        .eq("image_type", "MAIN");

      // 3. Update this image to MAIN
      await supabase
        .from("product_images")
        .update({ image_type: "MAIN" })
        .eq("id", imageId);

      toast.success("ตั้งเป็นรูปภาพหลักเรียบร้อยแล้ว!");
      window.dispatchEvent(new CustomEvent("app:product-changed"));
    } catch (err: any) {
      toast.error("ไม่สามารถตั้งรูปหลักได้");
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Delete an image
  const handleDeleteImage = async (productId: string, imageId: string) => {
    if (!confirm("คุณต้องการลบรูปภาพนี้ใช่หรือไม่?")) return;

    setActionLoadingId(imageId);
    const supabase = createClient();

    // 1. Optimistic Update (0ms)
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const remainingImgs: ProductImage[] = (p.images || []).filter((img) => img.id !== imageId);
          // If deleted image was MAIN, promote the first remaining image to MAIN
          const wasMain = (p.images || []).find((img) => img.id === imageId)?.image_type === "MAIN";
          if (wasMain && remainingImgs.length > 0) {
            remainingImgs[0] = { ...remainingImgs[0], image_type: "MAIN" as ProductImageType };
          }
          return { ...p, images: remainingImgs };
        }
        return p;
      })
    );

    try {
      await supabase.from("product_images").delete().eq("id", imageId);
      toast.success("ลบรูปภาพเรียบร้อยแล้ว!");
      window.dispatchEvent(new CustomEvent("app:product-changed"));
    } catch (err: any) {
      toast.error("ไม่สามารถลบรูปภาพได้");
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Change Image Type Tag (MAIN, FRONT, BACK, GALLERY)
  const handleChangeImageType = async (productId: string, imageId: string, newType: string) => {
    setActionLoadingId(imageId);
    const supabase = createClient();

    if (newType === "MAIN") {
      await handleSetMainImage(productId, imageId);
      return;
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedImgs: ProductImage[] = (p.images || []).map((img) =>
            img.id === imageId ? { ...img, image_type: newType as ProductImageType } : img
          );
          return { ...p, images: updatedImgs };
        }
        return p;
      })
    );

    try {
      await supabase
        .from("product_images")
        .update({ image_type: newType })
        .eq("id", imageId);

      toast.success(`เปลี่ยนประเภทรูปภาพเป็น ${newType} เรียบร้อยแล้ว`);
      window.dispatchEvent(new CustomEvent("app:product-changed"));
    } catch (err: any) {
      toast.error("ไม่สามารถเปลี่ยนประเภทรูปภาพได้");
    } finally {
      setActionLoadingId(null);
    }
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

      toast.success("บันทึกการแก้ไขสินค้าเรียบร้อยแล้ว!");
      window.dispatchEvent(new CustomEvent("app:product-changed"));
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

      toast.success("สร้างสินค้าใหม่เรียบร้อยแล้ว!");
      window.dispatchEvent(new CustomEvent("app:product-changed"));
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

        <Button onClick={openCreateModal} className="rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm">
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
            const images = product.images || [];
            const mainImgObj = images.find((i) => i.image_type === "MAIN") || images[0];
            const mainImg = mainImgObj?.image_url;

            return (
              <Card key={product.id} className="border-slate-200 bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                
                <div>
                  {/* Main Product Showcase Cover Image */}
                  <div className="relative aspect-square w-full bg-slate-100 overflow-hidden group">
                    {mainImg ? (
                      <img src={mainImg} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Shirt className="h-16 w-16 stroke-[1]" />
                        <span className="text-xs mt-2 font-medium">ไม่มีรูปภาพสินค้า</span>
                      </div>
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {mainImg && (
                        <span className="bg-slate-900/80 backdrop-blur-md text-amber-300 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-sm">
                          <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                          <span>รูปหลัก (Cover)</span>
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <Badge variant={product.is_active ? "success" : "danger"} className="font-bold shadow-sm">
                        {product.is_active ? "เปิดขายอยู่" : "ปิดการขาย"}
                      </Badge>
                    </div>

                    {/* Image Preview Overlay Button */}
                    {mainImg && (
                      <button
                        onClick={() => setPreviewZoomImage(mainImg)}
                        className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-xl text-xs font-bold backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-md"
                        title="ดูรูปภาพขนาดเต็ม"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        <span>ขยายรูป</span>
                      </button>
                    )}
                  </div>

                  <CardContent className="p-5 space-y-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 leading-snug">{product.name}</h3>
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

                    {/* Price and Top Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">ราคาเริ่มต้น</span>
                        <span className="text-xl font-black text-blue-600 font-mono">
                          ฿{Number(product.base_price).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(product)}
                          className="rounded-xl text-xs font-bold"
                        >
                          <Settings2 className="h-3.5 w-3.5 mr-1 text-slate-600" />
                          <span>แก้ไขข้อมูล</span>
                        </Button>

                        <Button
                          size="sm"
                          variant={product.is_active ? "outline" : "primary"}
                          onClick={() => handleToggleProductStatus(product.id, product.is_active)}
                          className="rounded-xl text-xs font-bold"
                        >
                          {product.is_active ? "ปิดขาย" : "เปิดขาย"}
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="rounded-xl p-2"
                          title="ลบสินค้านี้"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 📸 FULL PRODUCT GALLERY & IMAGE MANAGER SECTION */}
                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          <Images className="h-4 w-4 text-blue-600" />
                          <span>รูปภาพสินค้าทั้งหมด ({images.length} รูป)</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {images.length > 0 ? "คลิกรูปเพื่อดู/จัดการ" : "ยังไม่มีรูปภาพ"}
                        </span>
                      </div>

                      {/* Horizontal Grid of Uploaded Images */}
                      {images.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                          {images.map((img, idx) => {
                            const isMain = img.image_type === "MAIN";
                            const isLoading = actionLoadingId === img.id;

                            return (
                              <div
                                key={img.id}
                                className={`relative group/img rounded-xl overflow-hidden aspect-square border-2 transition-all bg-white ${
                                  isMain ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-200 hover:border-blue-400"
                                }`}
                              >
                                <img
                                  src={img.image_url}
                                  alt={`Product image ${idx + 1}`}
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() => setPreviewZoomImage(img.image_url)}
                                />

                                {/* Tag Badge on Top */}
                                <div className="absolute top-1 left-1">
                                  {isMain ? (
                                    <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                                      <Star className="h-2.5 w-2.5 fill-current" />
                                      <span>หลัก</span>
                                    </span>
                                  ) : img.image_type === "FRONT" ? (
                                    <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                                      หน้า
                                    </span>
                                  ) : img.image_type === "BACK" ? (
                                    <span className="bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                                      หลัง
                                    </span>
                                  ) : (
                                    <span className="bg-slate-700/80 text-white text-[9px] font-medium px-1 py-0.2 rounded shadow-xs">
                                      ประกอบ
                                    </span>
                                  )}
                                </div>

                                {/* Loading Overlay */}
                                {isLoading && (
                                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                )}

                                {/* Action Overlay on Hover/Touch */}
                                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col justify-between p-1">
                                  <div className="flex justify-end gap-1">
                                    {/* Delete Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteImage(product.id, img.id)}
                                      className="p-1 bg-red-600 hover:bg-red-500 text-white rounded-md text-[10px] font-bold shadow-xs transition-colors"
                                      title="ลบรูปภาพนี้"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>

                                  <div className="space-y-0.5">
                                    {/* Set as Main Button */}
                                    {!isMain && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetMainImage(product.id, img.id)}
                                        className="w-full py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-[9px] font-extrabold shadow-xs transition-colors block text-center"
                                        title="ตั้งเป็นรูปหลักสำหรับแสดงหน้าสินค้าและออเดอร์"
                                      >
                                        ★ รูปหลัก
                                      </button>
                                    )}

                                    {/* Type Switcher */}
                                    <select
                                      value={img.image_type || "GALLERY"}
                                      onChange={(e) => handleChangeImageType(product.id, img.id, e.target.value)}
                                      className="w-full bg-slate-800 text-white text-[9px] rounded px-1 py-0.5 border border-slate-700 font-bold focus:outline-none"
                                    >
                                      <option value="MAIN">รูปหลัก (Cover)</option>
                                      <option value="FRONT">ด้านหน้า (Front)</option>
                                      <option value="BACK">ด้านหลัง (Back)</option>
                                      <option value="GALLERY">รูปประกอบ (Gallery)</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Multi-File Upload Button */}
                      <div className="border border-dashed border-blue-300 rounded-2xl p-3 text-center bg-blue-50/40 hover:bg-blue-50 transition-colors">
                        <input
                          type="file"
                          multiple
                          accept="image/png, image/jpeg, image/webp, image/jpg"
                          onChange={(e) => handleFileUploadForProduct(product.id, e.target.files)}
                          className="hidden"
                          id={`product-file-upload-${product.id}`}
                        />
                        <label
                          htmlFor={`product-file-upload-${product.id}`}
                          className="cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-blue-700"
                        >
                          {uploadingImgId === product.id ? (
                            <span className="flex items-center gap-2 text-blue-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>กำลังอัปโหลดและบันทึกรูปภาพ...</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <Upload className="h-4 w-4 text-blue-600" />
                              <span>+ เพิ่มรูปภาพสินค้า (เลือกได้หลายรูป)</span>
                            </span>
                          )}
                        </label>
                      </div>
                    </div>

                  </CardContent>
                </div>

              </Card>
            );
          })}
        </div>
      )}

      {/* Full Resolution Image Lightbox Modal */}
      {previewZoomImage && (
        <div
          onClick={() => setPreviewZoomImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center"
          >
            <img
              src={previewZoomImage}
              alt="Full resolution preview"
              className="max-h-[85vh] w-auto max-w-full object-contain"
            />
            <button
              onClick={() => setPreviewZoomImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-full font-bold transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
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
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold p-1">
                  <X className="h-5 w-5" />
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
                      placeholder="เช่น เสื้อกีฬาสาขา CPE & IoT 2026 (สีน้ำเงิน)"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">รายละเอียดสินค้า</label>
                    <Input
                      placeholder="คำอธิบายรายละเอียดสั้นๆ..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="rounded-xl text-xs h-10"
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
                        className="rounded-xl text-xs h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">หมวดหมู่</label>
                      <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="rounded-xl text-xs h-10"
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

                <Button type="submit" isLoading={submitting} className="w-full mt-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white h-11">
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
