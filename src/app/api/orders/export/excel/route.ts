import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const escapeCsv = (value: string | number | null | undefined) => {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") ?? "order").trim().toLowerCase();
  const statusParam = (searchParams.get("status") ?? "").trim();
  const payment = (searchParams.get("payment") ?? "").trim().toUpperCase();
  const excludeArrived = searchParams.get("excludeArrived") === "true";

  if (mode === "product") {
    let status = statusParam;
    if (status && status.toLowerCase() === "pending") {
      const first = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
      if (first?.name) status = first.name;
    }

    const whereOrder: Record<string, unknown> = {};
    if (payment === "PAID") {
      whereOrder.payment_status = "PAID";
    } else if (payment === "UNPAID") {
      whereOrder.payment_status = "UNPAID";
    }
    whereOrder.deleted_at = null;
    if (status) {
      whereOrder.status = status;
    }

    const items = await prisma.adminOrderItem.findMany({
      where: {
        order: whereOrder,
        ...(excludeArrived ? { status: { not: "Бараа ирсэн" } } : {}),
      },
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
          stock: p.stock ?? null,
          ordered_qty: p.ordered_qty ?? null,
        },
      ])
    );

    const map = new Map<
      string,
      {
        product_id: number | null;
        product_name: string;
        product_description: string;
        product_stock: number | null;
        product_ordered_qty: number | null;
        total_qty: number;
      }
    >();

    for (const it of items) {
      const key = it.product_id ? `p:${it.product_id}` : `n:${it.product_name}`;
      const productMeta = it.product_id ? productMap.get(it.product_id) : null;
      const existing = map.get(key) ?? {
        product_id: it.product_id ?? null,
        product_name: it.product_name,
        product_description: productMeta?.description ?? "",
        product_stock: productMeta?.stock ?? null,
        product_ordered_qty: productMeta?.ordered_qty ?? null,
        total_qty: 0,
      };
      existing.total_qty += it.quantity;
      map.set(key, existing);
    }

    const statusLabel = (() => {
      if (!statusParam) return "Бүгд";
      const key = statusParam.toLowerCase();
      if (key === "pending") return "Хүлээгдэж буй";
      if (key === "confirmed") return "Баталгаажсан";
      if (key === "shipping" || key === "shipped") return "Хүргэлтэнд";
      if (key === "delivered" || key === "completed") return "Хүргэгдсэн";
      if (key === "cancelled" || key === "canceled") return "Цуцлагдсан";
      return statusParam;
    })();

    const header = [
      "Барааны нэр",
      "Тайлбар",
      "Захиалсан",
      "Захиалга авах тоо",
      "Үлдэгдэл",
      "Төлөв",
    ];

    const rows = Array.from(map.values()).map((p) => {
      const remaining =
        p.product_stock != null && p.product_ordered_qty != null
          ? Math.max(0, p.product_stock - p.product_ordered_qty)
          : "";
      return [
        escapeCsv(p.product_name),
        escapeCsv(p.product_description || "-"),
        escapeCsv(p.total_qty),
        escapeCsv(p.product_stock ?? "-"),
        escapeCsv(remaining === "" ? "-" : remaining),
        escapeCsv(statusLabel),
      ].join(",");
    });

    const csv = "\uFEFF" + [header.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=orders-products.csv",
      },
    });
  }

  const orders = await prisma.adminOrder.findMany({
    where: { deleted_at: null },
    include: { items: true },
    orderBy: { created_at: "desc" },
  });

  const header = [
    "ID",
    "Name",
    "Phone",
    "Status",
    "Total",
    "Created At",
    "Items",
  ];

  const rows = orders.map((order) => {
    const items = order.items
      .map((i) => `${i.product_name} x${i.quantity}`)
      .join(" | ");
    return [
      escapeCsv(order.id),
      escapeCsv(order.name),
      escapeCsv(order.phone1),
      escapeCsv(order.status),
      escapeCsv(order.total),
      escapeCsv(order.created_at.toISOString()),
      escapeCsv(items),
    ].join(",");
  });

  const csv = "\uFEFF" + [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=orders.csv",
    },
  });
}
