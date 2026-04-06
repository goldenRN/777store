import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const now = new Date();
  const products = await prisma.adminProduct.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      stock: true,
      ordered_qty: true,
      duration_hours: true,
      created_at: true,
      order_accept_status: true,
    },
  });

  const items = products.map((p) => {
    const hasDuration = Number(p.duration_hours || 0) > 0;
    const endMs =
      p.created_at && hasDuration
        ? p.created_at.getTime() + Number(p.duration_hours || 0) * 60 * 60 * 1000
        : null;
    const expired = endMs ? endMs <= now.getTime() : false;
    const remaining = Math.max(0, Number(p.stock || 0) - Number(p.ordered_qty || 0));
    const stockLimitEnabled = Number(p.stock || 0) > 0;
    const closedByStock = hasDuration ? stockLimitEnabled && remaining <= 0 : remaining <= 0;
    const closed = p.order_accept_status === "CLOSED" || expired || closedByStock;
    return { id: p.id, closed, remaining, expired };
  });

  return NextResponse.json({ items });
}
