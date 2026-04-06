import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const product_id = Number(body?.product_id);
  if (!product_id) {
    return NextResponse.json({ message: "product_id шаардлагатай" }, { status: 400 });
  }

  const created = await prisma.adminProductVariant.create({
    data: {
      product_id,
      sku: body?.sku ?? null,
      attribute: body?.attribute ?? null,
      price: body?.price != null ? Math.round(Number(body.price)) : null,
      stock: body?.stock != null ? Math.round(Number(body.stock)) : null,
      images: body?.images?.length
        ? {
            create: body.images.map((img: { image_url: string; public_id?: string | null }) => ({
              image_url: img.image_url,
              public_id: img.public_id ?? null,
              product_id,
            })),
          }
        : undefined,
    },
  });

  // Auto-sum variant stock into product stock when base stock is 0
  const product = await prisma.adminProduct.findUnique({
    where: { id: product_id },
    select: { stock: true },
  });
  if (product && product.stock === 0) {
    const variants = await prisma.adminProductVariant.findMany({
      where: { product_id },
      select: { stock: true },
    });
    const totalStock = variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
    await prisma.adminProduct.update({
      where: { id: product_id },
      data: { stock: totalStock },
    });
  }

  return NextResponse.json({ data: created });
}
