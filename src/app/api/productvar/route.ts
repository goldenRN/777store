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
    select: { price: true, discount_price: true, order_accept_status: true },
  });
  if (!baseProduct) {
    return NextResponse.json({ message: "Бараа олдсонгүй" }, { status: 404 });
  }

  const rawPrice = body?.price;
  const parsedPrice = rawPrice === "" || rawPrice == null ? null : Math.round(Number(rawPrice));
  if (parsedPrice == null || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return NextResponse.json({ message: "Үнийн дүн оруулна уу" }, { status: 400 });
  }

  const created = await prisma.adminProductVariant.create({
    data: {
      product_id,
      sku: body?.sku ?? null,
      attribute: body?.attribute ?? null,
      price: parsedPrice,
      stock: body?.stock != null ? Math.round(Number(body.stock)) : null,
      order_accept_status: baseProduct.order_accept_status === "CLOSED" ? "CLOSED" : "OPEN",
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
