import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const resolved = await params;
  const id = Number(resolved.id);

  if (!userId || !id) {
    return NextResponse.json({ message: "userId болон id шаардлагатай" }, { status: 400 });
  }

  const order = await prisma.adminOrder.findFirst({
    where: { id, user_id: userId },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    total: order.total,
    createdAt: order.created_at,
    items: order.items.map((it) => ({
      id: it.id,
      qty: it.quantity,
      unitPrice: it.price,
      productName: it.product_name,
      productImage: it.image_url ?? null,
      status: it.status ?? null,
    })),
  });
}
