import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const orders = await prisma.adminOrder.findMany({
    where: { user_id: id },
    orderBy: { created_at: "desc" },
    include: { items: true },
  });

  const mappedOrders = orders.map((o) => ({
    id: o.id,
    status: o.status,
    total: o.total,
    created_at: o.created_at,
    items: o.items.map((it) => ({
      id: it.id,
      product_name: it.product_name,
      quantity: it.quantity,
      price: it.price,
      image_url: it.image_url ?? null,
      status: it.status ?? null,
    })),
  }));

  return NextResponse.json({ user, orders: mappedOrders });
}
