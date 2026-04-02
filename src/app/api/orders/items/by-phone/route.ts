import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = (searchParams.get("phone") ?? "").trim();
  const payment = (searchParams.get("payment") ?? "PAID").trim().toUpperCase();

  if (!phone) {
    return NextResponse.json({ items: [] });
  }

  const whereOrder: Record<string, unknown> = { phone1: phone };
  if (payment === "PAID") {
    whereOrder.payment_status = "PAID";
  } else if (payment === "UNPAID") {
    whereOrder.payment_status = "UNPAID";
  }

  const items = await prisma.adminOrderItem.findMany({
    where: { order: whereOrder },
    include: { order: true },
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
      order_ids: number[];
      buyers: { order_id: number; name: string; phone: string; qty: number; order_status: string }[];
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
      order_ids: [],
      buyers: [],
    };

    existing.total_qty += it.quantity;
    if (!existing.order_ids.includes(it.order_id)) {
      existing.order_ids.push(it.order_id);
    }
    existing.buyers.push({
      order_id: it.order_id,
      name: it.order?.name ?? "",
      phone: it.order?.phone1 ?? "",
      qty: it.quantity,
      order_status: it.order?.status ?? "",
    });

    map.set(key, existing);
  }

  return NextResponse.json({ items: Array.from(map.values()) });
}
