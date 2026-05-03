import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { buildDeliverySourceKey, upsertDeliveryOrderFromItems } from "@/lib/deliveryOrders";

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

  const paidItems = await prisma.adminOrderItem.findMany({
    where: { qpay_invoice_id: invoiceId },
    include: {
      order: true,
      product: true,
      variant: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    await upsertDeliveryOrderFromItems(tx, {
      sourceKey: buildDeliverySourceKey({
        senderInvoiceNo: paidItems[0]?.qpay_sender_invoice_no ?? null,
        invoiceId,
        itemIds: paidItems.map((item) => item.id),
      }),
      items: paidItems,
      status: names.shipping,
      paymentStatus: "PAID",
      paymentProvider: "qpay",
      invoiceId,
      paymentId: paymentId ?? paidItems[0]?.qpay_payment_id ?? null,
      senderInvoiceNo: paidItems[0]?.qpay_sender_invoice_no ?? null,
      qrText: paidItems[0]?.qpay_qr_text ?? null,
      qrImage: paidItems[0]?.qpay_qr_image ?? null,
      shortUrl: paidItems[0]?.qpay_short_url ?? null,
      deeplink: paidItems[0]?.qpay_deeplink ?? null,
      expiresAt: paidItems[0]?.payment_expires_at ?? null,
      paidAt: new Date(),
    });
  });

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

export async function markOrderInvoicePaid(params: {
  orderId: number;
  paymentId?: string | null;
  request: Request;
}) {
  const { orderId, paymentId, request } = params;
  const order = await prisma.adminOrder.findUnique({
    where: { id: orderId },
  });
  if (!order || order.deleted_at) return null;

  const statuses = await getDeliveryStatusNames(order.status);
  const statusNorm = normalizeDeliveryStatus(order.status);
  const isArrived =
    statusNorm.includes("бараа ирсэн") || statusNorm.includes("arrived");
  const shouldShip =
    order.delivery_method === "delivery" &&
    (order.order_kind === "ready" || isArrived);
  const nextStatus = shouldShip ? statuses.shipping : statuses.pending;
  const shouldBackfillOrderedQty =
    order.payment_status !== "PAID" && String(order.order_kind || "") === "preorder";

  if (shouldBackfillOrderedQty) {
    const items = await prisma.adminOrderItem.findMany({
      where: { order_id: order.id, product_id: { not: null } },
      select: { product_id: true, variant_id: true, quantity: true },
    });
    if (items.length > 0) {
      const productIds = Array.from(
        new Set(items.map((it) => it.product_id).filter((x): x is number => x != null)),
      );
      const products = await prisma.adminProduct.findMany({
        where: { id: { in: productIds } },
        include: { type: true },
      });
      const isPreorderProduct = (p: {
        type?: { has_duration?: boolean | null; name?: string | null } | null;
      }) => {
        const type = p?.type ?? null;
        if (type?.has_duration === true) return true;
        const name = String(type?.name ?? "").toLowerCase();
        if (name.includes("захиал") || name.includes("урьдчил") || name.includes("preorder")) return true;
        if (name.includes("лайв") || name.includes("live")) return true;
        return false;
      };
      const preorderProductIds = new Set<number>(
        products.filter((p) => isPreorderProduct(p)).map((p) => p.id),
      );
      const preorderItems = items.filter(
        (it) => it.product_id != null && preorderProductIds.has(it.product_id),
      );
      if (preorderItems.length > 0) {
        const productUpdates = preorderItems.map((it) =>
          prisma.adminProduct.update({
            where: { id: it.product_id as number },
            data: { ordered_qty: { increment: it.quantity } },
          }),
        );
        const variantUpdates = preorderItems
          .filter((it) => it.variant_id != null)
          .map((it) =>
            prisma.adminProductVariant.update({
              where: { id: it.variant_id as number },
              data: { ordered_qty: { increment: it.quantity } },
            }),
          );
        await prisma.$transaction([...productUpdates, ...variantUpdates]);
      }
    }
  }

  await prisma.adminOrder.update({
    where: { id: order.id },
    data: {
      ...(order.payment_status === "PAID"
        ? {}
        : {
            payment_status: "PAID",
            qpay_payment_id: paymentId ?? order.qpay_payment_id ?? null,
            paid_at: new Date(),
          }),
      status: nextStatus,
      items: {
        updateMany: {
          where: { order_id: order.id },
          data: { status: nextStatus },
        },
      },
    },
  });

  if (!shouldShip) {
    return { orderId: order.id, status: nextStatus };
  }

  const linkedArrivedItems = order.qpay_sender_invoice_no
    ? await prisma.adminOrderItem.findMany({
        where: {
          qpay_sender_invoice_no: order.qpay_sender_invoice_no,
          order_id: { not: order.id },
        },
        include: {
          order: true,
          product: true,
          variant: true,
        },
      })
    : [];

  if (linkedArrivedItems.length > 0) {
    const names = await getDeliveryStatusNames(linkedArrivedItems[0].order?.status || linkedArrivedItems[0].status);
    await prisma.$transaction(
      linkedArrivedItems.map((item) =>
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

    for (const item of linkedArrivedItems) {
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
  }

  const freshOrderItems = await prisma.adminOrderItem.findMany({
    where: { order_id: order.id },
    include: {
      order: true,
      product: true,
      variant: true,
    },
  });

  const refreshedLinkedItems =
    linkedArrivedItems.length > 0
      ? await prisma.adminOrderItem.findMany({
          where: { id: { in: linkedArrivedItems.map((item) => item.id) } },
          include: {
            order: true,
            product: true,
            variant: true,
          },
        })
      : [];

  const deliverySourceItems = [
    ...freshOrderItems.map((item) => ({
      ...item,
      delivery_name: item.order?.delivery_name ?? item.delivery_name,
      delivery_phone: item.order?.delivery_phone ?? item.delivery_phone,
      delivery_address: item.order?.delivery_address ?? item.delivery_address,
      delivery_district_id: item.order?.delivery_district_id ?? item.delivery_district_id,
      delivery_district_name:
        item.order?.delivery_district_name ?? item.delivery_district_name,
      delivery_khoroo_id: item.order?.delivery_khoroo_id ?? item.delivery_khoroo_id,
      delivery_khoroo_name: item.order?.delivery_khoroo_name ?? item.delivery_khoroo_name,
      delivery_zone: item.order?.delivery_zone ?? item.delivery_zone,
      delivery_fee: item.order?.delivery_fee ?? item.delivery_fee,
      qpay_invoice_id: order.qpay_invoice_id,
      qpay_payment_id: paymentId ?? order.qpay_payment_id ?? null,
      qpay_sender_invoice_no: order.qpay_sender_invoice_no,
      qpay_qr_text: order.qpay_qr_text,
      qpay_qr_image: order.qpay_qr_image,
      qpay_short_url: order.qpay_short_url,
      qpay_deeplink: order.qpay_deeplink,
      payment_expires_at: order.payment_expires_at,
      delivery_paid_at: order.paid_at ?? new Date(),
      resolved_cargo_fee: 0,
    })),
    ...refreshedLinkedItems,
  ];

  await prisma.$transaction(async (tx) => {
    await upsertDeliveryOrderFromItems(tx, {
      sourceKey: buildDeliverySourceKey({
        senderInvoiceNo: order.qpay_sender_invoice_no ?? null,
        invoiceId: order.qpay_invoice_id ?? null,
        itemIds: deliverySourceItems.map((item) => item.id),
      }),
      items: deliverySourceItems,
      status: statuses.shipping,
      paymentStatus: "PAID",
      paymentProvider: order.payment_provider ?? "qpay",
      invoiceId: order.qpay_invoice_id ?? null,
      paymentId: paymentId ?? order.qpay_payment_id ?? null,
      senderInvoiceNo: order.qpay_sender_invoice_no ?? null,
      qrText: order.qpay_qr_text ?? null,
      qrImage: order.qpay_qr_image ?? null,
      shortUrl: order.qpay_short_url ?? null,
      deeplink: order.qpay_deeplink ?? null,
      expiresAt: order.payment_expires_at ?? null,
      paidAt: order.paid_at ?? new Date(),
      deliveryFee: Number(order.delivery_fee ?? 0),
      totalFee: Number(order.total ?? 0),
    });
  });

  await recomputeOrderStatusesFromItems(refreshedLinkedItems.map((item) => item.order_id));

  return { orderId: order.id, status: nextStatus, linkedArrivedItemCount: refreshedLinkedItems.length };
}
