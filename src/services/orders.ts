"use server";

import { createClient } from "@/lib/supabase/server";
import { Order, OrderStatus } from "@/types";

export async function generateOrderNumber(): Promise<string> {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const prefix = `CS-${year}-`;

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true });

  const nextSeq = (count || 0) + 1;
  const seqPadded = String(nextSeq).padStart(5, "0");
  return `${prefix}${seqPadded}`;
}

export async function createOrderFromCart(payload: {
  payment_method: "QR_PAYMENT" | "CASH" | "BANK_TRANSFER";
  slip_url?: string;
}): Promise<{ success: boolean; orderId?: string; orderNumber?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "ไม่พบข้อมูลผู้ใช้งาน" };
  }

  // 1. Fetch user's cart with items and relations
  const { data: cart } = await supabase
    .from("carts")
    .select(`
      id,
      items:cart_items(
        id,
        quantity,
        custom_name,
        custom_number,
        note,
        product:products(id, name, base_price),
        size:product_sizes(id, size_name, price_adjustment),
        selected_options:cart_item_options(
          option_value:option_values(
            id,
            label,
            price_adjustment,
            group:option_groups(name)
          )
        )
      )
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cart || !cart.items || cart.items.length === 0) {
    return { success: false, error: "ไม่มีรายการสินค้าในตะกร้า" };
  }

  // 2. SERVER-SIDE PRICE RECALCULATION & SNAPSHOT BUILDING
  let calculatedSubtotal = 0;
  let calculatedSizeAdj = 0;
  let calculatedOptionTotal = 0;

  const orderItemsData: any[] = [];

  for (const item of cart.items as any[]) {
    const product = item.product;
    const size = item.size;

    if (!product || !size) {
      return { success: false, error: "ข้อมูลสินค้าหรือไซส์ไม่ถูกต้อง" };
    }

    const basePrice = Number(product.base_price) || 0;
    const sizePrice = Number(size.price_adjustment) || 0;
    const qty = Number(item.quantity) || 1;

    let itemOptionTotal = 0;
    const itemOptionSnapshots: any[] = [];

    if (item.selected_options) {
      for (const opt of item.selected_options) {
        const val = opt.option_value;
        if (val) {
          const optPrice = Number(val.price_adjustment) || 0;
          itemOptionTotal += optPrice;
          itemOptionSnapshots.push({
            option_group_name_snapshot: val.group?.name || "ตัวเลือก",
            option_label_snapshot: val.label,
            price_snapshot: optPrice,
          });
        }
      }
    }

    const itemUnitPrice = basePrice + sizePrice + itemOptionTotal;
    const itemSubtotal = itemUnitPrice * qty;

    calculatedSubtotal += basePrice * qty;
    calculatedSizeAdj += sizePrice * qty;
    calculatedOptionTotal += itemOptionTotal * qty;

    orderItemsData.push({
      product_id: product.id,
      size_id: size.id,
      product_name_snapshot: product.name,
      base_price_snapshot: basePrice,
      size_name_snapshot: size.size_name,
      size_price_snapshot: sizePrice,
      custom_name: item.custom_name,
      custom_number: item.custom_number,
      note: item.note,
      quantity: qty,
      subtotal: itemSubtotal,
      options: itemOptionSnapshots,
    });
  }

  const grandTotal = calculatedSubtotal + calculatedSizeAdj + calculatedOptionTotal;

  // 3. Generate Order Number
  const orderNumber = await generateOrderNumber();

  // 4. Initial Status
  const initialStatus: OrderStatus = payload.payment_method === "CASH" 
    ? "PENDING_PAYMENT" 
    : (payload.slip_url ? "PAYMENT_REVIEW" : "PENDING_PAYMENT");

  // 5. Insert Order
  const { data: newOrder, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      status: initialStatus,
      subtotal: calculatedSubtotal,
      size_adjustments: calculatedSizeAdj,
      option_total: calculatedOptionTotal,
      discount: 0,
      shipping_fee: 0,
      total_amount: grandTotal,
    })
    .select("id")
    .single();

  if (orderErr || !newOrder) {
    return { success: false, error: orderErr?.message || "สร้างคำสั่งซื้อไม่สำเร็จ" };
  }

  // 6. Insert Order Items & Options Snapshots
  for (const itemData of orderItemsData) {
    const { options, ...itemInsert } = itemData;
    const { data: insertedItem } = await supabase
      .from("order_items")
      .insert({
        ...itemInsert,
        order_id: newOrder.id,
      })
      .select("id")
      .single();

    if (insertedItem && options.length > 0) {
      const optionRows = options.map((opt: any) => ({
        ...opt,
        order_item_id: insertedItem.id,
      }));
      await supabase.from("order_item_options").insert(optionRows);
    }
  }

  // 7. Insert Payment record
  await supabase.from("payments").insert({
    order_id: newOrder.id,
    payment_method: payload.payment_method,
    slip_url: payload.slip_url || null,
    amount: grandTotal,
    status: payload.slip_url ? "PENDING" : "PENDING",
  });

  // 8. Insert Order Status History
  await supabase.from("order_status_history").insert({
    order_id: newOrder.id,
    new_status: initialStatus,
    changed_by: user.id,
    note: "คำสั่งซื้อถูกสร้างในระบบ",
  });

  // 9. Clear User Cart
  await supabase.from("cart_items").delete().eq("cart_id", cart.id);

  return {
    success: true,
    orderId: newOrder.id,
    orderNumber,
  };
}

export async function getUserOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      items:order_items(
        *,
        options:order_item_options(*)
      ),
      payment:payments(*)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (orders || []) as Order[];
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: order } = await supabase
    .from("orders")
    .select(`
      *,
      items:order_items(
        *,
        options:order_item_options(*)
      ),
      payment:payments(*),
      profile:profiles(*)
    `)
    .eq("id", id)
    .single();

  return order as Order | null;
}
