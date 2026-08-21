export type UserRole = 'STUDENT' | 'ADMIN';

export type AdminPermission = 
  | 'SUPER_ADMIN' 
  | 'ORDER_ADMIN' 
  | 'FINANCE_ADMIN' 
  | 'PRODUCTION_ADMIN';

export interface Profile {
  id: string; // refs auth.users
  email?: string;
  student_id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  phone: string;
  academic_year: string;
  major: string;
  role: UserRole;
  admin_permissions: AdminPermission[];
  is_deleted?: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'DRAFT' | 'OPEN' | 'PAUSED' | 'CLOSED';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  banner_url?: string;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  base_price: number;
  category: string;
  allow_custom_name?: boolean;
  allow_custom_number?: boolean;
  custom_name_price?: number;
  custom_number_price?: number;
  preview_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  sizes?: ProductSize[];
  options?: ProductOptionGroup[];
  campaign?: Campaign;
}

export type ProductImageType = 
  | 'MAIN' 
  | 'FRONT' 
  | 'BACK' 
  | 'DETAIL' 
  | 'SIZE_CHART' 
  | 'GALLERY';

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  image_type: ProductImageType;
  display_order: number;
  created_at: string;
}

export interface ProductSize {
  id: string;
  product_id: string;
  size_name: string;
  price_adjustment: number;
  stock: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface OptionValue {
  id: string;
  group_id: string;
  label: string;
  price_adjustment: number;
  display_order: number;
  created_at: string;
}

export interface OptionGroup {
  id: string;
  name: string;
  is_required: boolean;
  display_order: number;
  created_at: string;
  values?: OptionValue[];
}

export interface ProductOptionGroup {
  id: string;
  product_id: string;
  group_id: string;
  is_active: boolean;
  created_at: string;
  group?: OptionGroup;
}

export interface CartItemOption {
  option_value_id: string;
  group_name: string;
  value_label: string;
  price_adjustment: number;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  size_id: string;
  custom_name?: string;
  custom_number?: string;
  note?: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
  size?: ProductSize;
  selected_options?: CartItemOption[];
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items: CartItem[];
}

export type OrderStatus = 
  | 'PENDING_PAYMENT'
  | 'PAYMENT_REVIEW'
  | 'PAID'
  | 'ORDER_ACCEPTED'
  | 'PREPARING'
  | 'PRODUCTION'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethodType = 'QR_PAYMENT' | 'CASH' | 'BANK_TRANSFER';

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface OrderItemOptionSnapshot {
  id?: string;
  order_item_id?: string;
  option_group_name_snapshot: string;
  option_label_snapshot: string;
  price_snapshot: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  size_id: string;
  product_name_snapshot: string;
  base_price_snapshot: number;
  size_name_snapshot: string;
  size_price_snapshot: number;
  custom_name?: string;
  custom_number?: string;
  note?: string;
  quantity: number;
  subtotal: number;
  options?: OrderItemOptionSnapshot[];
}

export interface Payment {
  id: string;
  order_id: string;
  payment_method: PaymentMethodType;
  slip_url?: string;
  amount: number;
  status: PaymentStatus;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: PaymentMethodType;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  promptpay_no?: string;
  qr_image_url?: string;
  instruction?: string;
  is_active: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  subtotal: number;
  size_adjustments: number;
  option_total: number;
  discount: number;
  shipping_fee: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  payment?: Payment;
  profile?: Profile;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status?: OrderStatus;
  new_status: OrderStatus;
  changed_by: string;
  note?: string;
  created_at: string;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'ORDER_STATUS' | 'PAYMENT' | 'SYSTEM';
  read: boolean;
  link_url?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}
