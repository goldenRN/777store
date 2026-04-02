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
  const updated = await prisma.adminProductVariant.update({
    where: { id },
    data: {
      sku: body?.sku ?? null,
      attribute: body?.attribute ?? null,
      price: body?.price != null ? Math.round(Number(body.price)) : null,
      stock: body?.stock != null ? Math.round(Number(body.stock)) : null,
    },
  });

  return NextResponse.json({ data: updated });
}
