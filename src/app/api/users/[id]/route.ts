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
      address: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const orders = await prisma.adminOrder.findMany({
    where: { user_id: id, payment_status: "PAID" },
    orderBy: { created_at: "desc" },
    include: { items: true },
  });

  const lastDelivery = await prisma.adminOrder.findFirst({
    where: {
      user_id: id,
      payment_status: "PAID",
      delivery_method: "delivery",
      delivery_district_id: { not: null },
      delivery_khoroo_id: { not: null },
      delivery_address: { not: null },
    },
    orderBy: { created_at: "desc" },
    select: {
      delivery_method: true,
      delivery_name: true,
      delivery_phone: true,
      delivery_address: true,
      delivery_district_id: true,
      delivery_district_name: true,
      delivery_khoroo_id: true,
      delivery_khoroo_name: true,
      delivery_zone: true,
      delivery_fee: true,
      created_at: true,
    },
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

  return NextResponse.json({ user, orders: mappedOrders, lastDelivery });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const email = typeof body?.email === "string" ? body.email.trim() : undefined;
  const address =
    typeof body?.address === "string" ? body.address.trim() : undefined;
  const avatarUrl =
    typeof body?.avatarUrl === "string" ? body.avatarUrl.trim() : undefined;

  const data: Record<string, string> = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (address !== undefined) data.address = address;
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user: updated });
}
