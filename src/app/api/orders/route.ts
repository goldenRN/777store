import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDeliveryGroups } from "@/lib/adminDeliveryGroups";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
  const limit = Math.max(Number(searchParams.get("limit") ?? 20), 1);
  const q = (searchParams.get("q") ?? "").trim();
  let status = (searchParams.get("status") ?? "").trim();
  const payment = (searchParams.get("payment") ?? "").trim().toUpperCase();
  const deletedOnly = searchParams.get("deleted") === "true";

  // auto cleanup: unpaid + expired
  await prisma.adminOrder.deleteMany({
    where: {
      payment_status: "UNPAID",
      payment_expires_at: { not: null, lt: new Date() },
      deleted_at: null,
    },
  });

  const where: Record<string, unknown> =
    q.length > 0
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone1: { contains: q } },
            ...(Number.isFinite(Number(q)) ? [{ id: Number(q) }] : []),
          ],
        }
      : {};

  if (status) {
    const key = status.toLowerCase();
    if (key === "pending") {
      const first = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
      if (first?.name) status = first.name;
    } else if (key === "confirmed") {
      status = "Бараа ирсэн";
    } else if (key === "shipping" || key === "shipped") {
      status = "Хүргэлтэнд бүртгэгдсэн";
    } else if (key === "delivered" || key === "completed") {
      status = "Хүргэгдсэн";
    } else if (key === "cancelled" || key === "canceled") {
      status = "Цуцлагдсан";
    }
  }

  if (!deletedOnly) {
    // Default admin order views are for PAID orders unless explicitly requested.
    if (payment === "UNPAID") {
      where.payment_status = "UNPAID";
    } else {
      where.payment_status = "PAID";
    }
  } else {
    // Deleted list: show both PAID/UNPAID unless explicitly filtered.
    if (payment === "PAID") where.payment_status = "PAID";
    if (payment === "UNPAID") where.payment_status = "UNPAID";
  }
  if (status) {
    where.status = status;
  }
  where.deleted_at = deletedOnly ? { not: null } : null;

  const total = await prisma.adminOrder.count({ where });
  const pages = Math.max(Math.ceil(total / limit), 1);
  const data = await prisma.adminOrder.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const orderIds = data.map((order) => order.id);
  let deliveryItemsByOrder = new Map<number, any[]>();

  if (orderIds.length > 0) {
    const deliveryItems = await prisma.adminOrderItem.findMany({
      where: {
        order_id: { in: orderIds },
        delivery_method: "delivery",
      },
      select: {
        id: true,
        order_id: true,
        product_id: true,
        variant_id: true,
        product_name: true,
        quantity: true,
        price: true,
        image_url: true,
        delivery_fee: true,
        qpay_invoice_id: true,
        qpay_payment_id: true,
        qpay_sender_invoice_no: true,
        delivery_paid_at: true,
        product: { select: { cargo_fee: true, images: { select: { image_url: true }, take: 1 } } },
        variant: {
          select: {
            id: true,
            sku: true,
            attribute: true,
            cargo_fee: true,
            images: { select: { image_url: true }, take: 1 },
          },
        },
      },
    });

    deliveryItemsByOrder = deliveryItems.reduce((map, item) => {
      const current = map.get(item.order_id) ?? [];
      current.push(item);
      map.set(item.order_id, current);
      return map;
    }, new Map<number, typeof deliveryItems>());
  }

  const enrichedData = data.map((order) => ({
    ...order,
    delivery_groups: buildDeliveryGroups(deliveryItemsByOrder.get(order.id) ?? []),
  }));

  return NextResponse.json({
    data: enrichedData,
    meta: { page, limit, total, pages },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, orderType, items, note } = body ?? {};

  if (!orderType || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "orderType болон items шаардлагатай" },
      { status: 400 }
    );
  }

  const productIds = items.map((item: { productId: string }) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json(
      { error: "Зарим бараа олдсонгүй" },
      { status: 400 }
    );
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  const orderItems = items.map((item: { productId: string; qty?: number }) => {
    const product = productMap.get(item.productId);
    const qty = Math.max(Number(item.qty ?? 1), 1);
    const unitPrice = product?.salePrice ?? product?.price ?? 0;
    return {
      productId: item.productId,
      qty,
      unitPrice,
    };
  });

  const total = orderItems.reduce(
    (sum: number, item: { qty: number; unitPrice: number }) =>
      sum + item.qty * item.unitPrice,
    0
  );

  const order = await prisma.order.create({
    data: {
      userId: userId ?? null,
      orderType,
      total,
      note: note ?? null,
      items: {
        create: orderItems,
      },
    },
    include: { items: true },
  });

  return NextResponse.json(order, { status: 201 });
}
