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

  const pendingStatus = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
  const orderItems = await prisma.adminOrderItem.findMany({
    where: {
      product_id: productId,
      order: {
        payment_status: "PAID",
        ...(pendingStatus?.name ? { status: pendingStatus.name } : {}),
      },
    },
    select: {
      quantity: true,
      variant_id: true,
      image_url: true,
      price: true,
    },
  });

  const normalizeImage = (url?: string | null) => {
    const raw = String(url || "").trim();
    if (!raw) return "";
    let cleaned = raw.split("#")[0].split("?")[0];
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
      try {
        const parsed = new URL(cleaned);
        if (parsed.pathname && parsed.pathname.includes("/uploads/")) {
          return parsed.pathname;
        }
        return cleaned;
      } catch {
        return cleaned;
      }
    }
    if (cleaned.startsWith("uploads/")) return `/${cleaned}`;
    if (cleaned.startsWith("/uploads/")) return cleaned;
    if (cleaned.startsWith("/")) return cleaned;
    return `/uploads/${cleaned}`;
  };

  const variantImageIndex = new Map<string, number[]>();
  const variantPriceIndex = new Map<number, number[]>();
  variants.forEach((v) => {
    v.images?.forEach((img) => {
      const norm = normalizeImage(img.image_url ?? null);
      if (!norm) return;
      const list = variantImageIndex.get(norm) ?? [];
      list.push(v.id);
      variantImageIndex.set(norm, list);
    });
    if (v.price != null) {
      const price = Number(v.price);
      const list = variantPriceIndex.get(price) ?? [];
      list.push(v.id);
      variantPriceIndex.set(price, list);
    }
  });

  const confirmedMap = new Map<number, number>();
  const inferredMap = new Map<number, number>();
  for (const it of orderItems) {
    const qty = Number(it.quantity || 0);
    const confirmedVariantId = it.variant_id ? Number(it.variant_id) : null;
    if (confirmedVariantId) {
      confirmedMap.set(confirmedVariantId, (confirmedMap.get(confirmedVariantId) ?? 0) + qty);
      continue;
    }
    let inferredVariantId: number | null = null;
    const normImage = normalizeImage(it.image_url ?? null);
    if (normImage) {
      const candidates = variantImageIndex.get(normImage) ?? [];
      if (candidates.length === 1) {
        inferredVariantId = candidates[0];
      }
    }
    if (!inferredVariantId && it.price != null) {
      const candidates = variantPriceIndex.get(Number(it.price)) ?? [];
      if (candidates.length === 1) {
        inferredVariantId = candidates[0];
      }
    }
    if (inferredVariantId) {
      inferredMap.set(inferredVariantId, (inferredMap.get(inferredVariantId) ?? 0) + qty);
    }
  }

  const withOrdered = variants.map((v) => ({
    ...v,
    ordered_qty: (confirmedMap.get(v.id) ?? 0) + (inferredMap.get(v.id) ?? 0),
  }));

  return NextResponse.json(withOrdered);
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
  const nextOrderAcceptStatusRaw =
    Object.prototype.hasOwnProperty.call(body ?? {}, "order_accept_status") ? body?.order_accept_status : undefined;
  const nextOrderAcceptStatus =
    nextOrderAcceptStatusRaw == null || nextOrderAcceptStatusRaw === ""
      ? null
      : String(nextOrderAcceptStatusRaw).toUpperCase();
  if (nextOrderAcceptStatus && !["OPEN", "CLOSED"].includes(nextOrderAcceptStatus)) {
    return NextResponse.json({ message: "Invalid order_accept_status" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const exists = await tx.adminProductVariant.findUnique({ where: { id } });
    if (!exists) {
      return null;
    }
    const baseProduct = await tx.adminProduct.findUnique({
      where: { id: exists.product_id },
      select: { price: true, discount_price: true },
    });
    const baseUnitPrice =
      baseProduct && baseProduct.discount_price != null && baseProduct.discount_price > 0
        ? baseProduct.discount_price
        : baseProduct?.price;
    const shouldUpdatePrice = Object.prototype.hasOwnProperty.call(body ?? {}, "price");
    const rawPrice = shouldUpdatePrice ? body?.price : undefined;
    const parsedPrice = rawPrice === "" || rawPrice == null ? null : Math.round(Number(rawPrice));
    const nextPrice = shouldUpdatePrice
      ? parsedPrice != null && Number.isFinite(parsedPrice) && parsedPrice > 0
        ? parsedPrice
        : baseUnitPrice ?? null
      : exists.price ?? null;

    const nextSku = Object.prototype.hasOwnProperty.call(body ?? {}, "sku") ? (body?.sku ?? null) : exists.sku ?? null;
    const nextAttribute = Object.prototype.hasOwnProperty.call(body ?? {}, "attribute")
      ? (body?.attribute ?? null)
      : exists.attribute ?? null;
    const nextStock = Object.prototype.hasOwnProperty.call(body ?? {}, "stock")
      ? body?.stock != null
        ? Math.round(Number(body.stock))
        : null
      : exists.stock ?? null;
    const nextOrderAcceptStatusFinal =
      nextOrderAcceptStatusRaw !== undefined ? nextOrderAcceptStatus : (exists as any).order_accept_status ?? null;

    const next = await tx.adminProductVariant.update({
      where: { id },
      data: {
        sku: nextSku,
        attribute: nextAttribute,
        // If variant price is missing/0, fall back to the product's base unit price.
        price: nextPrice,
        stock: nextStock,
        ...(nextOrderAcceptStatusRaw !== undefined ? { order_accept_status: nextOrderAcceptStatusFinal } : {}),
      },
    });

    if (Object.prototype.hasOwnProperty.call(body ?? {}, "images") && Array.isArray(body?.images)) {
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

    const productStock = await tx.adminProduct.findUnique({
      where: { id: next.product_id },
      select: { stock: true },
    });
    if (productStock && productStock.stock === 0) {
      const variants = await tx.adminProductVariant.findMany({
        where: { product_id: next.product_id },
        select: { stock: true },
      });
      const totalStock = variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
      await tx.adminProduct.update({
        where: { id: next.product_id },
        data: { stock: totalStock },
      });
    }

    return next;
  });

  if (!updated) {
    return NextResponse.json({ message: "Variant олдсонгүй" }, { status: 404 });
  }
  return NextResponse.json({ data: updated });
}
