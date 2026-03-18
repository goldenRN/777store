import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const productId = Number(params.id);
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
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  await prisma.adminProductVariant.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
