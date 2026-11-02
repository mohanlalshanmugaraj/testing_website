export type UserRole = 'admin' | 'customer';

export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_path: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number; // in INR decimal, e.g. 1499.00
  stock_quantity: number;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_images?: ProductImage[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
  products?: {
    id: string;
    name: string;
    product_images?: ProductImage[];
  } | null;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  total_amount: number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  shipping_address?: ShippingAddress | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  profiles?: Profile | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
