import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export const normalizeDeliveryStatus = (value?: string | null) =>
  String(value || "").trim().toLowerCase();

export const isArrivedDeliveryStatus = (status?: string | null) => {
  const normalized = normalizeDeliveryStatus(status);
  return normalized.includes("ирсэн") || normalized.includes("arrived");
};

export const isShippingDeliveryStatus = (status?: string | null) => {
  const normalized = normalizeDeliveryStatus(status);
  return normalized.includes("хүргэлт") || normalized.includes("shipping");
};

export const isDeliveredDeliveryStatus = (status?: string | null) => {
  const normalized = normalizeDeliveryStatus(status);
  return (
    normalized.includes("олгосон") ||
    normalized.includes("delivered") ||
    normalized.includes("handed")
  );
};

export const isReturnedDeliveryStatus = (status?: string | null) => {
  const normalized = normalizeDeliveryStatus(status);
  return normalized.includes("буца") || normalized.includes("return");
};

export async function getDeliveryStatusNames(fallbackStatus: string) {
  const statuses = await prisma.adminStatus.findMany({ orderBy: { id: "asc" } });
  const pending =
    statuses.find((s) => s.name.includes("Хүлээгд"))?.name ||
    statuses[0]?.name ||
    fallbackStatus;
  const arrived =
    statuses.find((s) => s.name.includes("ирсэн"))?.name ||
    statuses.find((s) => s.name.toLowerCase().includes("arrived"))?.name ||
    pending;
  const shipping =
    statuses.find((s) => s.name.includes("Хүргэлт"))?.name ||
    statuses.find((s) => s.name.toLowerCase().includes("shipping"))?.name ||
    pending;
  const delivered =
    statuses.find((s) => s.name.includes("олгосон"))?.name ||
    statuses.find((s) => s.name.toLowerCase().includes("delivered"))?.name ||
    shipping;
  const returned =
    statuses.find((s) => s.name.includes("Буца"))?.name ||
    statuses.find((s) => s.name.toLowerCase().includes("return"))?.name ||
    pending;
  return { pending, arrived, shipping, delivered, returned };
}

export async function recomputeOrderStatusesFromItems(orderIds: number[]) {
  const uniqueOrderIds = Array.from(
    new Set(orderIds.filter((value) => Number.isFinite(value) && value > 0)),
  );
  if (uniqueOrderIds.length === 0) return;

  const orders = await prisma.adminOrder.findMany({
    where: { id: { in: uniqueOrderIds } },
    select: { id: true, status: true },
  });
  const items = await prisma.adminOrderItem.findMany({
    where: { order_id: { in: uniqueOrderIds } },
    select: { order_id: true, status: true },
  });

  const orderMap = new Map(orders.map((order) => [order.id, order]));
  const itemMap = new Map<number, string[]>();
  for (const item of items) {
    const list = itemMap.get(item.order_id) ?? [];
    list.push(item.status || "");
    itemMap.set(item.order_id, list);
  }

  const updates = [];
  for (const orderId of uniqueOrderIds) {
    const order = orderMap.get(orderId);
    if (!order) continue;
    const statuses = itemMap.get(orderId) ?? [];
    if (statuses.length === 0) continue;

    const names = await getDeliveryStatusNames(order.status);
    const hasPending = statuses.some(
      (status) =>
        normalizeDeliveryStatus(status).includes("хүлээгд") ||
        normalizeDeliveryStatus(status) === "pending",
    );
    const hasArrived = statuses.some((status) => isArrivedDeliveryStatus(status));
    const hasShipping = statuses.some((status) => isShippingDeliveryStatus(status));
    const hasDelivered = statuses.some((status) => isDeliveredDeliveryStatus(status));
    const allReturned = statuses.every((status) => isReturnedDeliveryStatus(status));
    const allDelivered = statuses.every((status) => isDeliveredDeliveryStatus(status));

    let nextStatus = order.status;
    if (allReturned) {
      nextStatus = names.returned;
    } else if (allDelivered) {
      nextStatus = names.delivered;
    } else if (hasPending) {
      nextStatus = names.pending;
    } else if (hasArrived) {
      nextStatus = names.arrived;
    } else if (hasShipping) {
      nextStatus = names.shipping;
    } else if (hasDelivered) {
      nextStatus = names.delivered;
    }

    if (nextStatus !== order.status) {
      updates.push(
        prisma.adminOrder.update({
          where: { id: orderId },
          data: { status: nextStatus },
        }),
      );
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}

export async function markDeliveryInvoiceItemsPaid(params: {
  invoiceId: string;
  paymentId?: string | null;
  request: Request;
}) {
  const { invoiceId, paymentId, request } = params;
  const items = await prisma.adminOrderItem.findMany({
    where: { qpay_invoice_id: invoiceId },
    include: { order: true },
  });
  if (items.length === 0) return null;

  const names = await getDeliveryStatusNames(items[0].order?.status || items[0].status);
  const alreadyPaidIds = new Set(
    items.filter((item) => item.qpay_payment_id).map((item) => item.id),
  );

  await prisma.$transaction(
    items.map((item) =>
      prisma.adminOrderItem.update({
        where: { id: item.id },
        data: {
          status: names.shipping,
          qpay_payment_id: paymentId ?? item.qpay_payment_id ?? null,
          delivery_paid_at: new Date(),
        },
      }),
    ),
  );

  await recomputeOrderStatusesFromItems(items.map((item) => item.order_id));

  for (const item of items) {
    if (alreadyPaidIds.has(item.id)) continue;
    await logAdminAction({
      request,
      action: "ORDER_ITEM_DELIVERY_REGISTERED",
      entityType: "AdminOrderItem",
      entityId: item.id,
      details: {
        order_id: item.order_id,
        item_id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        status: names.shipping,
        payment_method: "QPAY",
        delivery_fee: item.delivery_fee ?? 0,
      },
    });
  }

  return {
    items,
    shippingStatus: names.shipping,
  };
}
