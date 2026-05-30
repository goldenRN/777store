import type { DeliveryGroupSummary } from "@/lib/adminDeliveryGroups";

export type Order = {
  id: number;
  name: string;
  email: string | null;
  phone1: string;
  phone2: string | null;
  status: string;
  created_at: string;
  total: number;
  is_delivery_order?: boolean;
  source_order_id?: number | null;
  delivery_address?: string | null;
  delivery_fee?: number | null;
  cargo_fee?: number | null;
  item_count?: number | null;
  quantity_total?: number | null;
  payment_status?: string | null;
  payment_provider?: string | null;
  payment_method_name?: string | null;
  qpay_qr_image?: string | null;
  qpay_qr_text?: string | null;
  qpay_short_url?: string | null;
  payment_expires_at?: string | null;
  related_delivery_order_id?: number | null;
  related_delivery_order_count?: number | null;
  deleted_at?: string | null;
  deleted_by_name?: string | null;
  deleted_by_phone?: string | null;
  deleted_reason?: string | null;
  delivery_groups?: DeliveryGroupSummary[];
};

export type ProductBuyer = {
  order_id: number;
  name: string;
  phone: string;
  qty: number;
  unit_price: number;
  total_price: number;
  status: string | null;
  received: boolean;
};

export type ProductVariantSummary = {
  variant_id: number;
  label: string;
  stock: number | null;
  ordered_qty: number;
  pending_qty: number;
  handed_qty: number;
  delivery_qty: number;
  arrived_qty: number | null;
  remaining_qty: number | null;
  cargo_fee: number | null;
  cargo_note: string | null;
  arrived: boolean;
  closed: boolean;
};

export type ProductSummary = {
  product_id: number | null;
  product_name: string;
  product_description: string;
  image_url: string | null;
  product_stock: number | null;
  product_ordered_qty: number | null;
  handed_qty: number;
  delivery_qty: number;
  arrived_qty: number | null;
  arrival_status: string | null;
  cargo_fee: number | null;
  cargo_note: string | null;
  order_accept_status: string | null;
  total_qty: number;
  pending_qty: number;
  order_count: number;
  item_ids: number[];
  buyers: ProductBuyer[];
  variants: ProductVariantSummary[];
  all_variants_arrived?: boolean;
  uniform_variant_cargo?: boolean;
};

export type PaymentMethod = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type AdminProductOption = {
  id: number;
  name: string;
  price: number;
  discount_price: number | null;
  bulk_prices?: unknown | null;
  images?: { image_url: string }[];
};

export type VariantOption = {
  id: number;
  sku: string | null;
  attribute: Record<string, unknown> | null;
  price: number | null;
};

export type CreateItemDraft = {
  product_id: number | "";
  product_query?: string;
  qty: number;
  variant_id?: number | "";
};

export type ArrivedTarget = {
  productId: number;
  productName: string;
  variantId: number | null;
  variantLabel: string | null;
  applyToAllVariants: boolean;
  handedQty?: number;
  deliveryQty?: number;
};

export type ProductSortField = "product_name" | "total_qty" | "product_stock" | "remaining";

export type OrderColumn = {
  key: string;
  label: string;
  sortable?: boolean;
};
