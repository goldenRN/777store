import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActorFromRequest } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = getActorFromRequest(request);
  if (actor.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const variantIdRaw = body?.variant_id;
  const variantId = variantIdRaw ? Number(variantIdRaw) : null;

  const item = await prisma.adminOrderItem.findUnique({
    where: { id },
    include: { product: { include: { images: true } } },
  });

  if (!item) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  let variant: { product_id: number; price: number | null; images: { image_url: string }[] } | null = null;

  if (variantId) {
    variant = await prisma.adminProductVariant.findUnique({
      where: { id: variantId },
      include: { images: true },
    });
    if (!variant) {
      return NextResponse.json({ message: "Variant not found" }, { status: 404 });
    }
    if (item.product_id && variant.product_id !== item.product_id) {
      return NextResponse.json({ message: "Variant mismatch" }, { status: 400 });
    }
  }

  const imageUrl =
    variant?.images?.[0]?.image_url ??
    item.product?.images?.[0]?.image_url ??
    item.image_url ??
    null;

  const price = variant?.price != null ? Number(variant.price) : item.price;

  const updated = await prisma.adminOrderItem.update({
    where: { id },
    data: {
      variant_id: variantId,
      product_id: item.product_id || variant?.product_id || item.product_id,
      price,
      image_url: imageUrl,
    },
  });

  return NextResponse.json({ item: updated });
}
