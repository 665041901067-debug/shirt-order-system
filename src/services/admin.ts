"use server";

import { createClient } from "@/lib/supabase/server";
import { Order, Product, Campaign, Profile, OrderStatus, PaymentStatus } from "@/types";

export async function getAdminDashboardMetrics() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total_amount, created_at");

  const totalOrders = orders?.length || 0;
  const totalSales = orders?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;

  const pendingPayment = orders?.filter((o) => o.status === "PENDING_PAYMENT").length || 0;
  const paymentReview = orders?.filter((o) => o.status === "PAYMENT_REVIEW").length || 0;
  const paid = orders?.filter((o) => o.status === "PAID").length || 0;
  const production = orders?.filter((o) => o.status === "PRODUCTION").length || 0;
  const readyForPickup = orders?.filter((o) => o.status === "READY_FOR_PICKUP").length || 0;
  const completed = orders?.filter((o) => o.status === "COMPLETED").length || 0;

  return {
    totalOrders,
    totalSales,
    pendingPayment,
    paymentReview,
    paid,
    production,
    readyForPickup,
    completed,
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
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "ไม่พบข้อมูลผู้ใช้" };

  const { data: currentOrder } = await supabase
    .from("orders")
    .select("status, user_id, order_number")
    .eq("id", orderId)
    .single();

  if (!currentOrder) return { success: false, error: "ไม่พบข้อมูลคำสั่งซื้อ" };

  // Update order status
  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (updateErr) return { success: false, error: updateErr.message };

  // Insert status history
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    old_status: currentOrder.status,
    new_status: newStatus,
    changed_by: user.id,
    note: note || `เปลี่ยนสถานะเป็น ${newStatus}`,
  });

  // Create In-App Notification for Student
  await supabase.from("notifications").insert({
    user_id: currentOrder.user_id,
    title: `อัปเดตสถานะออเดอร์ #${currentOrder.order_number}`,
    message: `คำสั่งซื้อของคุณถูกเปลี่ยนสถานะเป็น: ${newStatus}`,
    type: "ORDER_STATUS",
    link_url: `/orders/${orderId}`,
  });

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "UPDATE_ORDER_STATUS",
    entity_type: "orders",
    entity_id: orderId,
    metadata: { old_status: currentOrder.status, new_status: newStatus },
  });

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
