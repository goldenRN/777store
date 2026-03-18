import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const price = Math.round(Number(body?.price ?? 0));
  const discount_price =
    body?.discount_price != null ? Math.round(Number(body.discount_price)) : null;
  const stock = Math.round(Number(body?.stock ?? 0));
  const material = String(body?.material ?? "").trim();

  if (!name) {
    return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  }

  await prisma.adminProduct.update({
    where: { id },
    data: {
      name,
      description: description || null,
      price,
      discount_price: discount_price ?? null,
      stock,
      material: material || null,
      category_id: body?.category_id ? Number(body.category_id) : null,
      subcategory_id: body?.subcategory_id ? Number(body.subcategory_id) : null,
      brand_id: body?.brand_id ? Number(body.brand_id) : null,
      unit_id: body?.unit_id ? Number(body.unit_id) : null,
      status_id: body?.status_id ? Number(body.status_id) : null,
      type_id: body?.type_id ? Number(body.type_id) : null,
    },
  });

  // replace product images (not variant images)
  if (Array.isArray(body?.images)) {
    await prisma.adminProductImage.deleteMany({
      where: { product_id: id, product_variant_id: null },
    });

    if (body.images.length > 0) {
      await prisma.adminProductImage.createMany({
        data: body.images.map((img: { image_url: string; public_id?: string | null }) => ({
          product_id: id,
          image_url: img.image_url,
          public_id: img.public_id ?? null,
        })),
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  await prisma.adminProduct.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
