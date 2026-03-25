import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");

  if (!userId) {
    return NextResponse.json({ message: "userId шаардлагатай" }, { status: 400 });
  }

  const where: Record<string, unknown> = { user_id: userId };
  if (status && status !== "ALL") {
    where.status = status.toLowerCase();
  }

  const orders = await prisma.adminOrder.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      items: true,
    },
  });

  const mapped = orders.map((o) => ({
    id: o.id,
    status: o.status,
    total: o.total,
    createdAt: o.created_at,
    items: o.items.map((it) => ({
      id: it.id,
      qty: it.quantity,
      unitPrice: it.price,
      productName: it.product_name,
      productImage: it.image_url ?? null,
    })),
  }));

  return NextResponse.json({ items: mapped });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = String(body?.userId ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!userId || !name || !phone) {
    return NextResponse.json({ message: "userId, нэр, утас шаардлагатай" }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ message: "Сагс хоосон байна" }, { status: 400 });
  }

  const total = items.reduce((sum: number, it: any) => {
    const qty = Math.max(1, Number(it.qty ?? 1));
    const price = Math.max(0, Number(it.price ?? 0));
    return sum + qty * price;
  }, 0);

  const created = await prisma.adminOrder.create({
    data: {
      user_id: userId,
      name,
      phone1: phone,
      status: "pending",
      total,
      items: {
        create: items.map((it: any) => ({
          product_name: String(it.name ?? "Бараа"),
          quantity: Math.max(1, Number(it.qty ?? 1)),
          price: Math.max(0, Number(it.price ?? 0)),
          image_url: it.image_url ? String(it.image_url) : null,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ id: created.id });
}
