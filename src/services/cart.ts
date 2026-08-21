"use server";

import { createClient } from "@/lib/supabase/server";
import { Cart, CartItem } from "@/types";

export async function getUserCart(): Promise<Cart | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user) return null;

    // Get or create cart for current user
    let { data: cart } = await supabase
      .from("carts")
      .select(`
        *,
        items:cart_items(
          *,
          product:products(
            *,
            images:product_images(*)
          ),
          size:product_sizes(*),
          selected_options:cart_item_options(
            option_value_id
          )
        )
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cart) {
      const { data: newCart } = await supabase
        .from("carts")
        .insert({ user_id: user.id })
        .select()
        .single();

      if (newCart) {
        cart = { ...newCart, items: [] };
      }
    }

    return cart as Cart | null;
  } catch (err: any) {
    return null;
  }
}

export async function addToCart(payload: {
  product_id: string;
  size_id: string;
  custom_name?: string;
  custom_number?: string;
  note?: string;
  quantity: number;
  option_value_ids?: string[];
}): Promise<{ success: boolean; error?: string; requireLogin?: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { 
        success: false, 
        error: "เซสชันหมดอายุหรือไม่พบผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
        requireLogin: true
      };
    }

    // Ensure cart exists
    let { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cart) {
      const { data: newCart, error: cartErr } = await supabase
        .from("carts")
        .insert({ user_id: user.id })
        .select("id")
        .single();

      if (cartErr || !newCart) {
        return { success: false, error: "ไม่สามารถสร้างตะกร้าสินค้าได้" };
      }
      cart = newCart;
    }

    // Insert Cart Item
    const { data: cartItem, error: itemErr } = await supabase
      .from("cart_items")
      .insert({
        cart_id: cart.id,
        product_id: payload.product_id,
        size_id: payload.size_id,
        custom_name: payload.custom_name || null,
        custom_number: payload.custom_number || null,
        note: payload.note || null,
        quantity: payload.quantity || 1,
      })
      .select("id")
      .single();

    if (itemErr || !cartItem) {
      return { success: false, error: itemErr?.message || "เพิ่มสินค้าลงตะกร้าไม่สำเร็จ" };
    }

    // Insert Selected Options if any
    if (payload.option_value_ids && payload.option_value_ids.length > 0) {
      const optionRows = payload.option_value_ids.map((valId) => ({
        cart_item_id: cartItem.id,
        option_value_id: valId,
      }));

      await supabase.from("cart_item_options").insert(optionRows);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ" };
  }
}

export async function removeCartItem(cartItemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "ลบสินค้าไม่สำเร็จ" };
  }
}

export async function updateCartItemQuantity(cartItemId: string, quantity: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    if (quantity <= 0) {
      return removeCartItem(cartItemId);
    }

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", cartItemId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "ปรับจำนวนไม่สำเร็จ" };
  }
}

export async function clearCart(cartId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "ล้างตะกร้าไม่สำเร็จ" };
  }
}
