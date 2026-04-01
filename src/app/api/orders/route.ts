import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
  const limit = Math.max(Number(searchParams.get("limit") ?? 20), 1);
  const q = (searchParams.get("q") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const payment = (searchParams.get("payment") ?? "").trim().toUpperCase();

  // auto cleanup: unpaid + expired
  await prisma.adminOrder.deleteMany({
    where: {
      payment_status: "UNPAID",
      payment_expires_at: { not: null, lt: new Date() },
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

  if (payment === "UNPAID") {
    where.payment_status = "UNPAID";
  } else {
    where.payment_status = "PAID";
  }
  if (status) {
    where.status = status;
  }

  const total = await prisma.adminOrder.count({ where });
  const pages = Math.max(Math.ceil(total / limit), 1);
  const data = await prisma.adminOrder.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json({
    data,
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
