export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "PAID"
  | "ORDER_ACCEPTED"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED";

export const ORDER_STEPS = [
  { 
    status: "PENDING_PAYMENT", 
    label: "รอชำระเงิน", 
  },
  { 
    status: "PAYMENT_REVIEW", 
    label: "รอตรวจสอบสลิป", 
  },
  { 
    status: "ORDER_ACCEPTED", 
    label: "อนุมัติแล้ว", 
  },
  { 
    status: "READY_FOR_PICKUP", 
    label: "พร้อมรับสินค้า", 
  },
  { 
    status: "COMPLETED", 
    label: "รับสินค้าแล้ว", 
  },
];

export function getStatusLabel(status: string): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return "รอชำระเงิน";
    case "PAYMENT_REVIEW":
      return "รอตรวจสอบสลิป";
    case "PAID":
    case "ORDER_ACCEPTED":
    case "PREPARING":
    case "PRODUCTION":
      return "อนุมัติแล้ว";
    case "READY_FOR_PICKUP":
      return "พร้อมรับสินค้า";
    case "COMPLETED":
      return "รับสินค้าแล้ว";
    case "CANCELLED":
      return "ยกเลิก";
    default:
      return status;
  }
}

export function getStatusBadgeVariant(status: string): "default" | "primary" | "secondary" | "success" | "danger" | "warning" | "info" {
  switch (status) {
    case "PENDING_PAYMENT":
      return "warning";
    case "PAYMENT_REVIEW":
      return "info";
    case "PAID":
    case "ORDER_ACCEPTED":
    case "PREPARING":
    case "PRODUCTION":
      return "primary";
    case "READY_FOR_PICKUP":
      return "secondary";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "danger";
    default:
      return "default";
  }
}
