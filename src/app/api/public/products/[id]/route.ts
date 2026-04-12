import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const product = await prisma.adminProduct.findUnique({
    where: { id },
    include: {
      type: true,
      category: true,
      images: {
        where: { product_variant_id: null },
        orderBy: { id: "asc" },
      },
      variants: {
        include: {
          images: { orderBy: { id: "asc" } },
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    discount_price: product.discount_price,
    stock: product.stock,
    material: product.material,
    duration_hours: product.duration_hours,
    type_id: product.type_id,
    type_name: product.type?.name ?? "",
    type_has_duration: product.type?.has_duration ?? false,
    category_id: product.category_id,
    category_name: product.category?.category_name ?? "",
    image_url:
      product.images?.[0]?.image_url ??
      product.variants?.find((v) => v.images?.[0]?.image_url)?.images?.[0]?.image_url ??
      null,
    base_images: product.images?.map((img) => img.image_url) ?? [],
    images: [
      ...(product.images?.map((img) => img.image_url) ?? []),
      ...(product.variants?.flatMap((v) => v.images?.map((img) => img.image_url) ?? []) ?? []),
    ],
    created_at: product.created_at,
  });
}
