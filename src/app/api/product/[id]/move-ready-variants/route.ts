import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const sourceProductId = Number(rawId);
  if (!sourceProductId) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const selectedVariantIds = Array.isArray(body?.selected_variant_ids)
    ? body.selected_variant_ids.map((value: unknown) => Number(value)).filter((value: number) => Number.isFinite(value) && value > 0)
    : [];

  if (selectedVariantIds.length === 0) {
    return NextResponse.json({ message: "Сонгосон төрөл байхгүй байна." }, { status: 400 });
  }

  const sourceProduct = await prisma.adminProduct.findUnique({
    where: { id: sourceProductId },
    include: {
      type: true,
      images: {
        where: { product_variant_id: null },
        orderBy: { id: "asc" },
      },
      variants: {
        where: { id: { in: selectedVariantIds } },
        include: {
          images: {
            orderBy: { id: "asc" },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!sourceProduct) {
    return NextResponse.json({ message: "Бараа олдсонгүй." }, { status: 404 });
  }

  if (sourceProduct.variants.length === 0) {
    return NextResponse.json({ message: "Сонгосон төрөл олдсонгүй." }, { status: 404 });
  }

  const readyType = await prisma.adminType.findFirst({
    where: {
      OR: [
        { name: { contains: "бэлэн", mode: "insensitive" } },
        { name: { contains: "ready", mode: "insensitive" } },
      ],
    },
    orderBy: { id: "asc" },
  });

  if (!readyType) {
    return NextResponse.json({ message: "Бэлэн барааны төрөл системд олдсонгүй." }, { status: 400 });
  }

  const snapshot = body?.product_snapshot ?? {};
  const bulkPrices = Array.isArray(snapshot?.bulk_prices) && snapshot.bulk_prices.length > 0
    ? (snapshot.bulk_prices as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  const fallbackImages = sourceProduct.images.map((image) => ({
    image_url: image.image_url,
    public_id: image.public_id,
  }));

  const incomingImages = Array.isArray(snapshot?.images) ? snapshot.images : [];
  const productImages = incomingImages.length > 0 ? incomingImages : fallbackImages;

  const created = await prisma.$transaction(async (tx) => {
    const totalSelectedStock = sourceProduct.variants.reduce(
      (sum, variant) => sum + Math.max(0, Number(variant.stock || 0)),
      0
    );

    const readyProduct = await tx.adminProduct.create({
      data: {
        name: String(snapshot?.name ?? sourceProduct.name),
        description: String(snapshot?.description ?? sourceProduct.description ?? "").trim() || null,
        video_url: String(snapshot?.video_url ?? sourceProduct.video_url ?? "").trim() || null,
        price: Math.max(0, Math.round(Number(snapshot?.price ?? sourceProduct.price ?? 0))),
        discount_price:
          snapshot?.discount_price != null && snapshot?.discount_price !== ""
            ? Math.max(0, Math.round(Number(snapshot.discount_price)))
            : sourceProduct.discount_price,
        bulk_prices: bulkPrices,
        stock: totalSelectedStock,
        material: String(snapshot?.material ?? sourceProduct.material ?? "").trim() || null,
        duration_hours: null,
        arrival_status: "Бараа ирсэн",
        cargo_fee: sourceProduct.cargo_fee,
        cargo_note: sourceProduct.cargo_note,
        ordered_qty: 0,
        is_hidden: false,
        order_accept_status: "OPEN",
        category_id: snapshot?.category_id != null ? Number(snapshot.category_id) : sourceProduct.category_id,
        subcategory_id: snapshot?.subcategory_id != null ? Number(snapshot.subcategory_id) : sourceProduct.subcategory_id,
        brand_id: snapshot?.brand_id != null ? Number(snapshot.brand_id) : sourceProduct.brand_id,
        unit_id: snapshot?.unit_id != null ? Number(snapshot.unit_id) : sourceProduct.unit_id,
        status_id: sourceProduct.status_id,
        type_id: readyType.id,
      },
    });

    if (productImages.length > 0) {
      await tx.adminProductImage.createMany({
        data: productImages.map((image: { image_url: string; public_id?: string | null }) => ({
          product_id: readyProduct.id,
          image_url: image.image_url,
          public_id: image.public_id ?? null,
        })),
      });
    }

    for (const variant of sourceProduct.variants) {
      const createdVariant = await tx.adminProductVariant.create({
        data: {
          product_id: readyProduct.id,
          sku: variant.sku,
          attribute: variant.attribute ?? Prisma.JsonNull,
          price: variant.price ?? sourceProduct.price,
          stock: Math.max(0, Number(variant.stock || 0)),
          arrived_qty: variant.arrived_qty ?? Math.max(0, Number(variant.stock || 0)),
          ordered_qty: 0,
          order_accept_status: "OPEN",
          cargo_fee: variant.cargo_fee ?? sourceProduct.cargo_fee,
          cargo_note: variant.cargo_note ?? sourceProduct.cargo_note,
        },
      });

      if (variant.images.length > 0) {
        await tx.adminProductImage.createMany({
          data: variant.images.map((image) => ({
            product_id: readyProduct.id,
            product_variant_id: createdVariant.id,
            image_url: image.image_url,
            public_id: image.public_id ?? null,
          })),
        });
      }
    }

    await tx.adminProductVariant.updateMany({
      where: { id: { in: selectedVariantIds }, product_id: sourceProductId },
      data: {
        stock: 0,
        arrived_qty: 0,
        order_accept_status: "CLOSED",
      },
    });

    const remainingVariants = await tx.adminProductVariant.findMany({
      where: { product_id: sourceProductId },
      select: { stock: true, order_accept_status: true },
    });

    const remainingOpenVariants = remainingVariants.filter((variant) => variant.order_accept_status !== "CLOSED");
    const remainingStock = remainingVariants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock || 0)), 0);

    await tx.adminProduct.update({
      where: { id: sourceProductId },
      data: {
        stock: remainingStock,
        order_accept_status: remainingOpenVariants.length > 0 ? "OPEN" : "CLOSED",
      },
    });

    return readyProduct;
  });

  await logAdminAction({
    request,
    action: "PRODUCT_VARIANTS_MOVE_TO_READY",
    entityType: "AdminProduct",
    entityId: created.id,
    details: {
      source_product_id: sourceProductId,
      source_product_name: sourceProduct.name,
      created_ready_product_id: created.id,
      selected_variant_ids: selectedVariantIds,
      selected_variant_count: selectedVariantIds.length,
    },
  });

  return NextResponse.json({
    success: true,
    ready_product_id: created.id,
    moved_variant_count: selectedVariantIds.length,
  });
}
