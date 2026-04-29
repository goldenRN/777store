import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDeliveryGroups } from "@/lib/adminDeliveryGroups";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const order = await prisma.adminOrder.findFirst({
    where: { id, payment_status: "PAID" },
    include: {
      items: {
        include: {
          product: { select: { images: { select: { image_url: true }, take: 1 } } },
          variant: {
            select: {
              id: true,
              sku: true,
              attribute: true,
              images: { select: { image_url: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const items = order.items.map((it) => ({
    ...it,
    image_url:
      it.image_url ||
      it.variant?.images?.[0]?.image_url ||
      it.product?.images?.[0]?.image_url ||
      null,
  }));

  const deliveryGroups = buildDeliveryGroups(items);

  return NextResponse.json({ order, items, delivery_groups: deliveryGroups });
}
