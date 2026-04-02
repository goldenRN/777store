import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "").trim();
  const payment = (searchParams.get("payment") ?? "PAID").trim().toUpperCase();
  const excludeArrived = searchParams.get("excludeArrived") === "true";

  const whereOrder: Record<string, unknown> = {};
  if (payment === "PAID") {
    whereOrder.payment_status = "PAID";
  } else if (payment === "UNPAID") {
    whereOrder.payment_status = "UNPAID";
  }
  if (status) {
    whereOrder.status = status;
  }

  const items = await prisma.adminOrderItem.findMany({
    where: {
      order: whereOrder,
      ...(excludeArrived ? { status: { not: "Бараа ирсэн" } } : {}),
    },
    include: {
      order: true,
    },
    orderBy: { id: "desc" },
  });

  const productIds = Array.from(
    new Set(items.map((it) => it.product_id).filter((id) => id != null))
  ) as number[];
  const products = await prisma.adminProduct.findMany({
    where: { id: { in: productIds } },
    include: { images: true },
  });
  const productMap = new Map(
    products.map((p) => [
      p.id,
      {
        description: p.description ?? "",
        image_url: p.images?.[0]?.image_url ?? null,
      },
    ])
  );

  const map = new Map<
    string,
    {
      product_id: number | null;
      product_name: string;
      product_description: string;
      image_url: string | null;
      total_qty: number;
      order_count: number;
      item_ids: number[];
      buyers: { order_id: number; name: string; phone: string; qty: number }[];
    }
  >();

  for (const it of items) {
    const key = it.product_id ? `p:${it.product_id}` : `n:${it.product_name}`;
    const productMeta = it.product_id ? productMap.get(it.product_id) : null;
    const existing = map.get(key) ?? {
      product_id: it.product_id ?? null,
      product_name: it.product_name,
      product_description: productMeta?.description ?? "",
      image_url: productMeta?.image_url ?? it.image_url ?? null,
      total_qty: 0,
      order_count: 0,
      item_ids: [],
      buyers: [],
    };

    existing.total_qty += it.quantity;
    existing.item_ids.push(it.id);
    existing.buyers.push({
      order_id: it.order_id,
      name: it.order?.name ?? "",
      phone: it.order?.phone1 ?? "",
      qty: it.quantity,
    });

    map.set(key, existing);
  }

  const result = Array.from(map.values()).map((g) => ({
    ...g,
    order_count: g.buyers.length,
  }));

  return NextResponse.json({ items: result });
}
