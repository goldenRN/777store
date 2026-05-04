import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

type DeliverySourceItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  variant_id: number | null;
  product_name: string;
  quantity: number;
  price: number;
  image_url?: string | null;
  status?: string | null;
  return_note?: string | null;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  delivery_district_id?: number | null;
  delivery_district_name?: string | null;
  delivery_khoroo_id?: number | null;
  delivery_khoroo_name?: string | null;
  delivery_zone?: string | null;
  delivery_fee?: number | null;
  qpay_invoice_id?: string | null;
  qpay_payment_id?: string | null;
  qpay_sender_invoice_no?: string | null;
  qpay_qr_text?: string | null;
  qpay_qr_image?: string | null;
  qpay_short_url?: string | null;
  qpay_deeplink?: Prisma.JsonValue | null;
  payment_expires_at?: Date | null;
  delivery_paid_at?: Date | null;
  order?: {
    user_id?: string | null;
    name?: string | null;
    phone1?: string | null;
  } | null;
  product?: {
    cargo_fee?: number | null;
  } | null;
  variant?: {
    sku?: string | null;
    attribute?: Prisma.JsonValue | null;
    cargo_fee?: number | null;
  } | null;
  resolved_cargo_fee?: number | null;
};

const normalizeStatus = (value?: string | null) =>
  String(value || "").trim().toLowerCase();

const isShippingStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return normalized.includes("хүргэлт") || normalized.includes("shipping");
};

const isDeliveredStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return (
    normalized.includes("хүргэгд") ||
    normalized.includes("олгосон") ||
    normalized.includes("delivered") ||
    normalized.includes("handed")
  );
};

const isReturnedStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return normalized.includes("буца") || normalized.includes("return");
};

const getVariantLabel = (variant?: {
  sku?: string | null;
  attribute?: Prisma.JsonValue | null;
} | null) => {
  if (!variant) return null;
  const attr = (variant.attribute || {}) as Record<string, unknown>;
  const type = typeof attr.type === "string" ? attr.type : "";
  const color = typeof attr.color === "string" ? attr.color : "";
  const size = typeof attr.size === "string" ? attr.size : "";
  const merged = [type, color, size].filter(Boolean).join(" / ");
  return merged || variant.sku || null;
};

const getItemCargoTotal = (item: DeliverySourceItem) => {
  const unitCargo = Math.max(
    0,
    Number(
      item.resolved_cargo_fee ??
        item.variant?.cargo_fee ??
        item.product?.cargo_fee ??
        0,
    ),
  );
  return unitCargo * Math.max(1, Number(item.quantity || 0));
};

const toJsonInput = (value?: Prisma.JsonValue | null) => {
  if (value == null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
};

const computeHeaderStatus = (statuses: string[]) => {
  if (statuses.length === 0) return "Хүргэлтэнд бүртгэгдсэн";
  if (statuses.every((status) => isReturnedStatus(status))) return "Буцаагдсан";
  if (statuses.every((status) => isDeliveredStatus(status))) return "Хүргэгдсэн";
  if (statuses.some((status) => isShippingStatus(status))) return "Хүргэлтэнд бүртгэгдсэн";
  if (statuses.some((status) => isDeliveredStatus(status)) && !statuses.some((status) => isReturnedStatus(status))) {
    return "Хүргэгдсэн";
  }
  if (statuses.some((status) => isReturnedStatus(status)) && !statuses.some((status) => isDeliveredStatus(status))) {
    return "Буцаагдсан";
  }
  return "Хүргэлтэнд бүртгэгдсэн";
};

export const buildDeliverySourceKey = (params: {
  invoiceId?: string | null;
  senderInvoiceNo?: string | null;
  itemIds: number[];
}) => {
  if (params.senderInvoiceNo) return `sender:${params.senderInvoiceNo}`;
  if (params.invoiceId) return `invoice:${params.invoiceId}`;
  const ids = [...params.itemIds].map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  return `items:${ids.join("-")}`;
};

export async function upsertDeliveryOrderFromItems(
  tx: Tx,
  params: {
    sourceKey: string;
    items: DeliverySourceItem[];
    status?: string;
    paymentStatus?: string | null;
    paymentProvider?: string | null;
    deliveryFee?: number;
    cargoFee?: number;
    totalFee?: number;
    invoiceId?: string | null;
    paymentId?: string | null;
    senderInvoiceNo?: string | null;
    qrText?: string | null;
    qrImage?: string | null;
    shortUrl?: string | null;
    deeplink?: Prisma.JsonValue | null;
    expiresAt?: Date | null;
    paidAt?: Date | null;
  },
) {
  const items = [...params.items].sort((a, b) => a.id - b.id);
  if (items.length === 0) return null;

  const first = items[0];
  const headerStatus = params.status || computeHeaderStatus(items.map((item) => String(item.status || "")));
  const deliveryFee = Math.max(
    0,
    Number(params.deliveryFee ?? items.reduce((sum, item) => sum + Number(item.delivery_fee ?? 0), 0)),
  );
  const cargoFee = Math.max(
    0,
    Number(params.cargoFee ?? items.reduce((sum, item) => sum + getItemCargoTotal(item), 0)),
  );
  const totalFee = Math.max(0, Number(params.totalFee ?? deliveryFee + cargoFee));
  const paidAt =
    params.paidAt === undefined ? first.delivery_paid_at ?? new Date() : params.paidAt;

  const deliveryOrder = await tx.adminDeliveryOrder.upsert({
    where: { source_key: params.sourceKey },
    update: {
      source_order_id: first.order_id,
      user_id: first.order?.user_id ?? null,
      name: first.delivery_name || first.order?.name || "Хүргэлтийн захиалга",
      phone: first.delivery_phone || first.order?.phone1 || "",
      address: first.delivery_address || null,
      district_id: first.delivery_district_id ?? null,
      district_name: first.delivery_district_name ?? null,
      khoroo_id: first.delivery_khoroo_id ?? null,
      khoroo_name: first.delivery_khoroo_name ?? null,
      zone: first.delivery_zone ?? null,
      status: headerStatus,
      payment_status: params.paymentStatus ?? "PAID",
      payment_provider: params.paymentProvider ?? "qpay",
      delivery_fee: deliveryFee,
      cargo_fee: cargoFee,
      total: totalFee,
      qpay_invoice_id: params.invoiceId ?? first.qpay_invoice_id ?? null,
      qpay_payment_id: params.paymentId ?? first.qpay_payment_id ?? null,
      qpay_sender_invoice_no: params.senderInvoiceNo ?? first.qpay_sender_invoice_no ?? null,
      qpay_qr_text: params.qrText ?? first.qpay_qr_text ?? null,
      qpay_qr_image: params.qrImage ?? first.qpay_qr_image ?? null,
      qpay_short_url: params.shortUrl ?? first.qpay_short_url ?? null,
      qpay_deeplink: toJsonInput(params.deeplink ?? first.qpay_deeplink ?? null),
      payment_expires_at: params.expiresAt ?? first.payment_expires_at ?? null,
      paid_at: paidAt,
    },
    create: {
      source_key: params.sourceKey,
      source_order_id: first.order_id,
      user_id: first.order?.user_id ?? null,
      name: first.delivery_name || first.order?.name || "Хүргэлтийн захиалга",
      phone: first.delivery_phone || first.order?.phone1 || "",
      address: first.delivery_address || null,
      district_id: first.delivery_district_id ?? null,
      district_name: first.delivery_district_name ?? null,
      khoroo_id: first.delivery_khoroo_id ?? null,
      khoroo_name: first.delivery_khoroo_name ?? null,
      zone: first.delivery_zone ?? null,
      status: headerStatus,
      payment_status: params.paymentStatus ?? "PAID",
      payment_provider: params.paymentProvider ?? "qpay",
      delivery_fee: deliveryFee,
      cargo_fee: cargoFee,
      total: totalFee,
      qpay_invoice_id: params.invoiceId ?? first.qpay_invoice_id ?? null,
      qpay_payment_id: params.paymentId ?? first.qpay_payment_id ?? null,
      qpay_sender_invoice_no: params.senderInvoiceNo ?? first.qpay_sender_invoice_no ?? null,
      qpay_qr_text: params.qrText ?? first.qpay_qr_text ?? null,
      qpay_qr_image: params.qrImage ?? first.qpay_qr_image ?? null,
      qpay_short_url: params.shortUrl ?? first.qpay_short_url ?? null,
      qpay_deeplink: toJsonInput(params.deeplink ?? first.qpay_deeplink ?? null),
      payment_expires_at: params.expiresAt ?? first.payment_expires_at ?? null,
      paid_at: paidAt,
    },
    select: { id: true },
  });

  for (const item of items) {
    await tx.adminDeliveryOrderItem.upsert({
      where: { order_item_id: item.id },
      update: {
        delivery_order_id: deliveryOrder.id,
        order_id: item.order_id,
        product_id: item.product_id ?? null,
        variant_id: item.variant_id ?? null,
        product_name: item.product_name,
        variant_label: getVariantLabel(item.variant),
        quantity: item.quantity,
        price: item.price,
        image_url: item.image_url ?? null,
        cargo_fee: getItemCargoTotal(item),
        status: item.status || headerStatus,
        return_note: item.return_note ?? null,
      },
      create: {
        delivery_order_id: deliveryOrder.id,
        order_id: item.order_id,
        order_item_id: item.id,
        product_id: item.product_id ?? null,
        variant_id: item.variant_id ?? null,
        product_name: item.product_name,
        variant_label: getVariantLabel(item.variant),
        quantity: item.quantity,
        price: item.price,
        image_url: item.image_url ?? null,
        cargo_fee: getItemCargoTotal(item),
        status: item.status || headerStatus,
        return_note: item.return_note ?? null,
      },
    });
  }

  await tx.adminDeliveryOrderItem.deleteMany({
    where: {
      delivery_order_id: deliveryOrder.id,
      order_item_id: { notIn: items.map((item) => item.id) },
    },
  });

  return deliveryOrder;
}

export async function syncDeliveryOrdersByOrderItemIds(
  tx: Tx,
  orderItemIds: number[],
  params?: { status?: string; returnNote?: string | null },
) {
  const ids = Array.from(new Set(orderItemIds.map(Number).filter((value) => Number.isFinite(value) && value > 0)));
  if (ids.length === 0) return;

  if (params?.status) {
    await tx.adminDeliveryOrderItem.updateMany({
      where: { order_item_id: { in: ids } },
      data: {
        status: params.status,
        return_note: params.returnNote ?? null,
      },
    });
  }

  const affectedItems = await tx.adminDeliveryOrderItem.findMany({
    where: { order_item_id: { in: ids } },
    select: { delivery_order_id: true },
  });
  const deliveryOrderIds = Array.from(new Set(affectedItems.map((item) => item.delivery_order_id)));
  if (deliveryOrderIds.length === 0) return;

  for (const deliveryOrderId of deliveryOrderIds) {
    const items = await tx.adminDeliveryOrderItem.findMany({
      where: { delivery_order_id: deliveryOrderId },
      select: { status: true, cargo_fee: true, quantity: true, price: true },
    });
    const status = computeHeaderStatus(items.map((item) => item.status || ""));
    const header = await tx.adminDeliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      select: { delivery_fee: true },
    });
    const cargoTotal = items.reduce(
      (sum, item) => sum + Math.max(0, Number(item.cargo_fee || 0)),
      0,
    );
    await tx.adminDeliveryOrder.update({
      where: { id: deliveryOrderId },
      data: {
        status,
        cargo_fee: cargoTotal,
        total: cargoTotal + Math.max(0, Number(header?.delivery_fee || 0)),
      },
    });
  }
}

export async function syncDeliveryOrdersByOrderItemIdsWithPrisma(
  orderItemIds: number[],
  params?: { status?: string; returnNote?: string | null },
) {
  await prisma.$transaction(async (tx) => {
    await syncDeliveryOrdersByOrderItemIds(tx, orderItemIds, params);
  });
}
