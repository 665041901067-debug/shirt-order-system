"use server";

import { createClient } from "@/lib/supabase/server";
import { Order, Product, Campaign, Profile, OrderStatus, PaymentStatus } from "@/types";
import { getStatusLabel } from "@/lib/order-status";

export async function getAdminDashboardMetrics() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total_amount, created_at");

  const activeOrders = orders?.filter((o) => o.status !== "CANCELLED") || [];
  const totalOrders = activeOrders.length;
  const totalSales = activeOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const pendingPayment = orders?.filter((o) => o.status === "PENDING_PAYMENT").length || 0;
  const paymentReview = orders?.filter((o) => o.status === "PAYMENT_REVIEW").length || 0;
  const paid = orders?.filter((o) => o.status === "PAID" || o.status === "ORDER_ACCEPTED").length || 0;
  const production = orders?.filter((o) => o.status === "PRODUCTION" || o.status === "PREPARING").length || 0;
  const readyForPickup = orders?.filter((o) => o.status === "READY_FOR_PICKUP").length || 0;
  const completed = orders?.filter((o) => o.status === "COMPLETED").length || 0;
  const cancelled = orders?.filter((o) => o.status === "CANCELLED").length || 0;

  return {
    totalOrders,
    totalSales,
    pendingPayment,
    paymentReview,
    paid,
    production,
    readyForPickup,
    completed,
    cancelled,
  };
}

export async function getAllAdminOrders(statusFilter?: string): Promise<Order[]> {
  const supabase = await createClient();

  let query = supabase
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
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "ALL") {
    query = query.eq("status", statusFilter);
  }

  const { data: orders } = await query;
  return (orders || []) as Order[];
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  // Get current order for logging
  const { data: currentOrder } = await supabase
    .from("orders")
    .select("status, user_id, order_number")
    .eq("id", orderId)
    .single();

  if (!currentOrder) {
    return { success: false, error: "ไม่พบคำสั่งซื้อ" };
  }

  // Update order status
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const thaiStatusLabel = getStatusLabel(newStatus);

  // Parallel background tasks: history, notification, audit log
  Promise.allSettled([
    supabase.from("order_status_history").insert({
      order_id: orderId,
      old_status: currentOrder.status,
      new_status: newStatus,
      changed_by: user.id,
      note: note || `เปลี่ยนสถานะเป็น ${thaiStatusLabel}`,
    }),
    supabase.from("notifications").insert({
      user_id: currentOrder.user_id,
      title: `อัปเดตสถานะออเดอร์ #${currentOrder.order_number}`,
      message: `คำสั่งซื้อของคุณถูกเปลี่ยนสถานะเป็น: ${thaiStatusLabel}`,
      type: "ORDER_STATUS",
      link_url: `/orders/${orderId}`,
    }),
    supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "UPDATE_ORDER_STATUS",
      entity_type: "orders",
      entity_id: orderId,
      metadata: { old_status: currentOrder.status, new_status: newStatus },
    }),
  ]).catch(() => {});

  return { success: true };
}

export async function verifyPayment(
  paymentId: string,
  status: PaymentStatus,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "ไม่พบข้อมูลผู้ใช้" };

  const { data: payment } = await supabase
    .from("payments")
    .select("order_id")
    .eq("id", paymentId)
    .single();

  if (!payment) return { success: false, error: "ไม่พบข้อมูลการชำระเงิน" };

  const { error: payErr } = await supabase
    .from("payments")
    .update({
      status,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      notes,
    })
    .eq("id", paymentId);

  if (payErr) return { success: false, error: payErr.message };

  // If verified, auto transition order status to ORDER_ACCEPTED (รับคำสั่งซื้อแล้ว)
  if (status === "VERIFIED") {
    await updateOrderStatus(payment.order_id, "ORDER_ACCEPTED", "ยืนยันการชำระเงินและรับคำสั่งซื้อเรียบร้อยแล้ว");
  }

  return { success: true };
}

export async function getProductionSummary(): Promise<{
  sizeSummary: { size_name: string; count: number }[];
  nameSummary: { custom_name: string; count: number }[];
  numberSummary: { custom_number: string; count: number }[];
}> {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("order_items")
    .select("size_name_snapshot, custom_name, custom_number, quantity");

  const sizeMap: Record<string, number> = {};
  const nameMap: Record<string, number> = {};
  const numberMap: Record<string, number> = {};

  items?.forEach((item) => {
    const qty = Number(item.quantity) || 1;
    if (item.size_name_snapshot) {
      sizeMap[item.size_name_snapshot] = (sizeMap[item.size_name_snapshot] || 0) + qty;
    }
    if (item.custom_name) {
      nameMap[item.custom_name] = (nameMap[item.custom_name] || 0) + qty;
    }
    if (item.custom_number) {
      numberMap[item.custom_number] = (numberMap[item.custom_number] || 0) + qty;
    }
  });

  return {
    sizeSummary: Object.entries(sizeMap).map(([size_name, count]) => ({ size_name, count })),
    nameSummary: Object.entries(nameMap).map(([custom_name, count]) => ({ custom_name, count })),
    numberSummary: Object.entries(numberMap).map(([custom_number, count]) => ({ custom_number, count })),
  };
}

export async function clearAllOrdersData(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    return { success: false, error: "เฉพาะผู้ดูแลระบบเท่านั้นที่มีสิทธิ์ล้างข้อมูลคำสั่งซื้อ" };
  }

  try {
    // 1. Delete order item options
    await supabase.from("order_item_options").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    
    // 2. Delete order items
    await supabase.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 3. Delete order status history
    await supabase.from("order_status_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 4. Delete payments
    await supabase.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 5. Delete order notifications
    await supabase.from("notifications").delete().or("type.eq.ORDER_STATUS,link_url.ilike.%orders%");

    // 6. Delete carts and cart items
    await supabase.from("cart_item_options").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("cart_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 7. Delete all orders
    const { error: ordErr } = await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (ordErr) throw ordErr;

    // 8. Log audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "CLEAR_ALL_ORDERS",
      entity_type: "orders",
      metadata: { cleared_at: new Date().toISOString() },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการล้างข้อมูล" };
  }
}

export async function updateOrderDetails(
  orderId: string,
  updatedItems: {
    id: string;
    size_name_snapshot: string;
    size_price_snapshot: number;
    custom_name?: string;
    custom_number?: string;
    note?: string;
    quantity: number;
    subtotal: number;
  }[],
  newTotalAmount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    return { success: false, error: "เฉพาะผู้ดูแลระบบเท่านั้นที่มีสิทธิ์แก้ไขออเดอร์" };
  }

  try {
    // 1. Update each order item
    for (const item of updatedItems) {
      const { error: itemErr } = await supabase
        .from("order_items")
        .update({
          size_name_snapshot: item.size_name_snapshot,
          size_price_snapshot: item.size_price_snapshot,
          custom_name: item.custom_name || "",
          custom_number: item.custom_number || "",
          note: item.note || "",
          quantity: item.quantity,
          subtotal: item.subtotal,
        })
        .eq("id", item.id);

      if (itemErr) {
        return { success: false, error: itemErr.message };
      }
    }

    // 2. Update order total amount
    const { error: orderErr } = await supabase
      .from("orders")
      .update({
        total_amount: newTotalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (orderErr) {
      return { success: false, error: orderErr.message };
    }

    // 3. Update payment amount if exists
    await supabase
      .from("payments")
      .update({ amount: newTotalAmount })
      .eq("order_id", orderId);

    // 4. Log audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "UPDATE_ORDER_DETAILS",
      entity_type: "orders",
      entity_id: orderId,
      metadata: { new_total_amount: newTotalAmount, items_count: updatedItems.length },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "เกิดข้อผิดพลาดในการบันทึกแก้ไขออเดอร์" };
  }
}
