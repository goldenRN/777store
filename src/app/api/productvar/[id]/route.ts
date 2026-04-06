import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const productId = Number(rawId);
  if (!productId) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const variants = await prisma.adminProductVariant.findMany({
    where: { product_id: productId },
    include: { images: true },
    orderBy: { id: "desc" },
  });

  return NextResponse.json(variants);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  await prisma.adminProductVariant.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const updated = await prisma.$transaction(async (tx) => {
    const exists = await tx.adminProductVariant.findUnique({ where: { id } });
    if (!exists) {
      return null;
    }
    const next = await tx.adminProductVariant.update({
      where: { id },
      data: {
        sku: body?.sku ?? null,
        attribute: body?.attribute ?? null,
        price: body?.price != null ? Math.round(Number(body.price)) : null,
        stock: body?.stock != null ? Math.round(Number(body.stock)) : null,
      },
    });

    if (Array.isArray(body?.images)) {
      await tx.adminProductImage.deleteMany({
        where: { product_variant_id: id },
      });

      if (body.images.length > 0) {
        await tx.adminProductImage.createMany({
          data: body.images.map((img: { image_url: string; public_id?: string | null }) => ({
            image_url: img.image_url,
            public_id: img.public_id ?? null,
            product_id: next.product_id,
            product_variant_id: id,
          })),
        });
      }
    }

    return next;
  });

  if (!updated) {
    return NextResponse.json({ message: "Variant олдсонгүй" }, { status: 404 });
  }
  return NextResponse.json({ data: updated });
}
