import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

const normRole = (v?: string | null) =>
  String(v || "").toUpperCase().replace(/\s+/g, "_");
const requireAdmin = (request: NextRequest) => {
  const role = normRole(request.headers.get("x-actor-role"));
  return role === "SUPER_ADMIN" || role === "ADMIN";
};

const normalizeStatus = (value?: string | null) =>
  String(value || "").trim().toLowerCase();

const isDeliveredStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return (
    normalized.includes("хүргэгд") ||
    normalized.includes("олгосон") ||
    normalized.includes("delivered") ||
    normalized.includes("handed")
  );
};

const resolveImage = (url?: string | null) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) return raw;
  return `/uploads/${raw}`;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const deliveryOrder = await prisma.adminDeliveryOrder.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { id: "asc" },
      },
    },
  });

  if (!deliveryOrder) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      id: deliveryOrder.id,
      source_order_id: deliveryOrder.source_order_id,
      name: deliveryOrder.name,
      phone1: deliveryOrder.phone,
      phone2: null,
      email: null,
      status: deliveryOrder.status,
      created_at: deliveryOrder.created_at,
      total: deliveryOrder.total,
      payment_status: deliveryOrder.payment_status,
      payment_provider: deliveryOrder.payment_provider,
      payment_method_name:
        deliveryOrder.payment_provider?.toLowerCase() === "qpay"
          ? "QPay"
          : deliveryOrder.payment_provider,
      delivery_method: "delivery",
      delivery_name: deliveryOrder.name,
      delivery_phone: deliveryOrder.phone,
      delivery_address: deliveryOrder.address,
      delivery_district_id: deliveryOrder.district_id,
      delivery_district_name: deliveryOrder.district_name,
      delivery_khoroo_id: deliveryOrder.khoroo_id,
      delivery_khoroo_name: deliveryOrder.khoroo_name,
      delivery_zone: deliveryOrder.zone,
      delivery_fee: deliveryOrder.delivery_fee,
      cargo_fee: deliveryOrder.cargo_fee,
      qpay_invoice_id: deliveryOrder.qpay_invoice_id,
      qpay_payment_id: deliveryOrder.qpay_payment_id,
      qpay_sender_invoice_no: deliveryOrder.qpay_sender_invoice_no,
      qpay_qr_image: deliveryOrder.qpay_qr_image,
      qpay_qr_text: deliveryOrder.qpay_qr_text,
      qpay_short_url: deliveryOrder.qpay_short_url,
      qpay_deeplink: deliveryOrder.qpay_deeplink,
      payment_expires_at: deliveryOrder.payment_expires_at,
      paid_at: deliveryOrder.paid_at,
      is_delivery_order: true,
    },
    items: deliveryOrder.items.map((item) => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      image_url: resolveImage(item.image_url),
      cargo_fee: item.cargo_fee,
      return_note: item.return_note,
      status: item.status,
      delivery_fee: 0,
      variant: item.variant_label
        ? {
            id: item.variant_id,
            sku: item.variant_label,
            attribute: null,
            images: [],
          }
        : null,
      product: {
        images: item.image_url ? [{ image_url: resolveImage(item.image_url) }] : [],
      },
    })),
    delivery_groups: [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }
  if (!requireAdmin(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action ?? "").trim().toLowerCase();
  if (action !== "mark_delivered") {
    return NextResponse.json({ message: "Unsupported action" }, { status: 400 });
  }

  const deliveryOrder = await prisma.adminDeliveryOrder.findUnique({
    where: { id },
    include: {
      items: {
        select: {
          order_id: true,
          order_item_id: true,
        },
      },
    },
  });

  if (!deliveryOrder) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const orderItemIds = deliveryOrder.items
    .map((item) => Number(item.order_item_id))
    .filter((value) => Number.isFinite(value) && value > 0);
  const sourceOrderIds = Array.from(
    new Set(
      deliveryOrder.items
        .map((item) => Number(item.order_id))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );

  await prisma.$transaction(async (tx) => {
    await tx.adminDeliveryOrder.update({
      where: { id },
      data: { status: "Хүргэгдсэн" },
    });

    if (orderItemIds.length > 0) {
      await tx.adminDeliveryOrderItem.updateMany({
        where: { delivery_order_id: id },
        data: { status: "Хүргэгдсэн" },
      });

      await tx.adminOrderItem.updateMany({
        where: { id: { in: orderItemIds } },
        data: { status: "Хүргэгдсэн" },
      });
    }

    for (const orderId of sourceOrderIds) {
      const sourceOrder = await tx.adminOrder.findUnique({
        where: { id: orderId },
        select: {
          items: {
            select: { status: true },
          },
        },
      });
      if (!sourceOrder) continue;
      const statuses = sourceOrder.items
        .map((item) => String(item.status || "").trim())
        .filter(Boolean);
      if (statuses.length === 0) continue;
      if (statuses.every((status) => isDeliveredStatus(status))) {
        await tx.adminOrder.update({
          where: { id: orderId },
          data: { status: "Хүргэгдсэн" },
        });
      }
    }
  });

  await logAdminAction({
    request,
    action: "DELIVERY_ORDER_MARK_DELIVERED",
    entityType: "AdminDeliveryOrder",
    entityId: String(id),
    details: {
      delivery_order_id: id,
      order_item_ids: orderItemIds,
      source_order_ids: sourceOrderIds,
      status: "Хүргэгдсэн",
    },
  });

  return NextResponse.json({ success: true, id, status: "Хүргэгдсэн" });
}
