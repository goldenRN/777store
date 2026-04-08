import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const product_id = Number(body?.product_id);
  if (!product_id) {
    return NextResponse.json({ message: "product_id шаардлагатай" }, { status: 400 });
  }

  const baseProduct = await prisma.adminProduct.findUnique({
    where: { id: product_id },
    select: { price: true, discount_price: true },
  });
  if (!baseProduct) {
    return NextResponse.json({ message: "Бараа олдсонгүй" }, { status: 404 });
  }

  const baseUnitPrice =
    baseProduct.discount_price != null && baseProduct.discount_price > 0
      ? baseProduct.discount_price
      : baseProduct.price;
  const rawPrice = body?.price;
  const parsedPrice = rawPrice === "" || rawPrice == null ? null : Math.round(Number(rawPrice));
  const nextPrice = parsedPrice != null && Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : baseUnitPrice;

  const created = await prisma.adminProductVariant.create({
    data: {
      product_id,
      sku: body?.sku ?? null,
      attribute: body?.attribute ?? null,
      // If variant price is missing/0, fall back to the product's base unit price.
      price: nextPrice,
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
  const productStock = await prisma.adminProduct.findUnique({
    where: { id: product_id },
    select: { stock: true },
  });
  if (productStock && productStock.stock === 0) {
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
