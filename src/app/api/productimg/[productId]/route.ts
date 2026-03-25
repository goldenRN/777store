import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const resolved = await params;
  const productId = Number(resolved.productId);
  if (!productId) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const images = await prisma.adminProductImage.findMany({
    where: { product_id: productId, product_variant_id: null },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(images);
}
