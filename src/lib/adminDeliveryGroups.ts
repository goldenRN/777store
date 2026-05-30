import { getVariantLabel } from "@/lib/variantLabel";

export type DeliveryGroupItemSummary = {
  itemId: number;
  orderId: number;
  productId: number | null;
  productName: string;
  variantId: number | null;
  variantLabel: string | null;
  quantity: number;
  price: number;
  cargoFee: number;
  deliveryFee: number;
  imageUrl: string | null;
};

export type DeliveryGroupSummary = {
  groupKey: string;
  invoiceId: string | null;
  senderInvoiceNo: string | null;
  paymentId: string | null;
  paymentStatus: "PAID" | "UNPAID";
  label: string;
  itemCount: number;
  totalQuantity: number;
  orderCount: number;
  totalCargo: number;
  totalDelivery: number;
  totalFee: number;
  paidAt: string | null;
  items: DeliveryGroupItemSummary[];
};

type SourceItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  variant_id?: number | null;
  product_name: string;
  quantity: number;
  price: number;
  image_url?: string | null;
  delivery_fee?: number | null;
  qpay_invoice_id?: string | null;
  qpay_payment_id?: string | null;
  qpay_sender_invoice_no?: string | null;
  delivery_paid_at?: string | Date | null;
  variant?: {
    id?: number | null;
    sku?: string | null;
    attribute?: unknown;
    cargo_fee?: number | null;
    images?: { image_url: string }[];
  } | null;
  product?: {
    cargo_fee?: number | null;
    images?: { image_url: string }[];
  } | null;
};

function getGroupKey(item: SourceItem) {
  if (item.qpay_invoice_id) return `invoice:${item.qpay_invoice_id}`;
  if (item.qpay_sender_invoice_no) return `sender:${item.qpay_sender_invoice_no}`;
  return `manual:${item.order_id}`;
}

function getGroupLabel(item: SourceItem) {
  if (item.qpay_sender_invoice_no) return item.qpay_sender_invoice_no;
  if (item.qpay_invoice_id) return item.qpay_invoice_id;
  return `DELIVERY-${item.order_id}`;
}

function getImageUrl(item: SourceItem) {
  return (
    item.image_url ||
    item.variant?.images?.[0]?.image_url ||
    item.product?.images?.[0]?.image_url ||
    null
  );
}

export function buildDeliveryGroups(items: SourceItem[]): DeliveryGroupSummary[] {
  const map = new Map<string, DeliveryGroupSummary>();

  for (const item of items) {
    const groupKey = getGroupKey(item);
    const cargoUnit = Math.max(0, Number(item.variant?.cargo_fee ?? item.product?.cargo_fee ?? 0));
    const quantity = Math.max(1, Number(item.quantity || 0));
    const cargoTotal = cargoUnit * quantity;
    const deliveryFee = Math.max(0, Number(item.delivery_fee ?? 0));
    const variantLabel = item.variant
      ? getVariantLabel(item.variant.attribute as Record<string, unknown> | null | undefined, item.variant.sku, item.variant.id ?? item.variant_id ?? null)
      : "";

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        groupKey,
        invoiceId: item.qpay_invoice_id ?? null,
        senderInvoiceNo: item.qpay_sender_invoice_no ?? null,
        paymentId: item.qpay_payment_id ?? null,
        paymentStatus: item.qpay_payment_id || item.delivery_paid_at ? "PAID" : "UNPAID",
        label: getGroupLabel(item),
        itemCount: 0,
        totalQuantity: 0,
        orderCount: 0,
        totalCargo: 0,
        totalDelivery: 0,
        totalFee: 0,
        paidAt: item.delivery_paid_at ? new Date(item.delivery_paid_at).toISOString() : null,
        items: [],
      });
    }

    const group = map.get(groupKey)!;
    group.itemCount += 1;
    group.totalQuantity += quantity;
    group.totalCargo += cargoTotal;
    group.totalDelivery += deliveryFee;
    group.totalFee = group.totalCargo + group.totalDelivery;
    if (item.delivery_paid_at) {
      const iso = new Date(item.delivery_paid_at).toISOString();
      if (!group.paidAt || iso > group.paidAt) group.paidAt = iso;
    }
    if (item.qpay_payment_id || item.delivery_paid_at) {
      group.paymentId = item.qpay_payment_id ?? group.paymentId ?? null;
      group.paymentStatus = "PAID";
    }
    group.items.push({
      itemId: item.id,
      orderId: item.order_id,
      productId: item.product_id ?? null,
      productName: item.product_name,
      variantId: item.variant_id ?? null,
      variantLabel: variantLabel || null,
      quantity,
      price: Number(item.price || 0),
      cargoFee: cargoTotal,
      deliveryFee,
      imageUrl: getImageUrl(item),
    });
  }

  const groups = Array.from(map.values());
  for (const group of groups) {
    group.orderCount = new Set(group.items.map((item) => item.orderId)).size;
    group.items.sort((a, b) => a.itemId - b.itemId);
  }

  groups.sort((a, b) => {
    const aTime = a.paidAt ? new Date(a.paidAt).getTime() : 0;
    const bTime = b.paidAt ? new Date(b.paidAt).getTime() : 0;
    return bTime - aTime;
  });

  return groups;
}
