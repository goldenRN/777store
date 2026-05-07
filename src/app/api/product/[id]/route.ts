import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { unlink } from "fs/promises";
import path from "path";
import { normalizeBulkTiers } from "@/lib/bulkPricing";

const isReadyTypeLike = (type: { name?: string | null; has_duration?: boolean | null } | null | undefined) => {
  if (!type) return false;
  if (type.has_duration === true) return false;
  const name = String(type.name ?? "").toLowerCase();
  if (name.includes("бэлэн") || name.includes("ready")) return true;
  if (name.includes("захиал") || name.includes("урьдчил") || name.includes("preorder")) return false;
  if (name.includes("лайв") || name.includes("live")) return false;
  return type.has_duration === false;
};

const tryDeleteFileIfUnused = async (imageUrl: string | null) => {
  if (!imageUrl) return;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return;
  const clean = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  if (!clean.startsWith("/uploads/")) return;
  const remaining = await prisma.adminProductImage.count({
    where: { image_url: imageUrl },
  });
  if (remaining > 0) return;
  const filePath = path.join(process.cwd(), "public", clean);
  try {
    await unlink(filePath);
  } catch {
    // ignore missing file
  }
};

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
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const video_url = String(body?.video_url ?? "").trim();
  const price = Math.round(Number(body?.price ?? 0));
  const discount_price =
    body?.discount_price != null ? Math.round(Number(body.discount_price)) : null;
  const stock = Math.round(Number(body?.stock ?? 0));
  const material = String(body?.material ?? "").trim();
  const bulk_prices = Object.prototype.hasOwnProperty.call(body ?? {}, "bulk_prices")
    ? body?.bulk_prices == null
      ? Prisma.JsonNull
      : (() => {
          const tiers = normalizeBulkTiers(body.bulk_prices);
          return tiers.length > 0 ? tiers : Prisma.JsonNull;
        })()
    : undefined;
  const duration_hours =
    body?.duration_hours != null ? Math.round(Number(body.duration_hours)) : null;
  const arrival_status = body?.arrival_status ? String(body.arrival_status) : null;
  const cargo_fee =
    body?.cargo_fee != null && body.cargo_fee !== ""
      ? Math.round(Number(body.cargo_fee))
      : null;
  const cargo_note = body?.cargo_note != null ? String(body.cargo_note).trim() : null;
  const explicitOrderAcceptStatus = Object.prototype.hasOwnProperty.call(body ?? {}, "order_accept_status");
  const order_accept_status = body?.order_accept_status
    ? String(body.order_accept_status).toUpperCase()
    : null;

  if (!name) {
    return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  }

  const before = await prisma.adminProduct.findUnique({
    where: { id },
    select: {
      name: true,
      price: true,
      discount_price: true,
      stock: true,
      type: {
        select: {
          name: true,
          has_duration: true,
        },
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    const nextTypeId = body?.type_id ? Number(body.type_id) : null;
    const nextType = nextTypeId
      ? await tx.adminType.findUnique({
          where: { id: nextTypeId },
          select: { name: true, has_duration: true },
        })
      : null;

    const movedToReady = !isReadyTypeLike(before?.type) && isReadyTypeLike(nextType);
    const nextOrderAcceptStatus = explicitOrderAcceptStatus
      ? order_accept_status || undefined
      : movedToReady
        ? "OPEN"
        : undefined;

    await tx.adminProduct.update({
      where: { id },
      data: {
        name,
        description: description || null,
        video_url: video_url || null,
        price,
        discount_price: discount_price ?? null,
        ...(bulk_prices !== undefined ? { bulk_prices } : {}),
        stock,
        material: material || null,
        duration_hours: duration_hours ?? null,
        arrival_status: arrival_status || undefined,
        cargo_fee: cargo_fee ?? null,
        cargo_note: cargo_note || null,
        order_accept_status: nextOrderAcceptStatus,
        category_id: body?.category_id ? Number(body.category_id) : null,
        subcategory_id: body?.subcategory_id ? Number(body.subcategory_id) : null,
        brand_id: body?.brand_id ? Number(body.brand_id) : null,
        unit_id: body?.unit_id ? Number(body.unit_id) : null,
        type_id: nextTypeId,
      },
    });

    if ((nextOrderAcceptStatus ?? order_accept_status) === "CLOSED") {
      await tx.adminProductVariant.updateMany({
        where: { product_id: id },
        data: { order_accept_status: "CLOSED" },
      });
    }

    if (movedToReady && !explicitOrderAcceptStatus) {
      await tx.adminProductVariant.updateMany({
        where: { product_id: id },
        data: { order_accept_status: "OPEN" },
      });
    }
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

  await logAdminAction({
    request,
    action: "PRODUCT_UPDATE",
    entityType: "AdminProduct",
    entityId: id,
    details: {
      before,
      after: {
        name,
        price,
        discount_price,
        stock,
      },
    },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const status = body?.arrival_status ? String(body.arrival_status) : null;
  const cargo_fee =
    body?.cargo_fee != null && body.cargo_fee !== ""
      ? Math.round(Number(body.cargo_fee))
      : null;
  const cargo_note = body?.cargo_note != null ? String(body.cargo_note).trim() : null;
  const order_accept_status = body?.order_accept_status
    ? String(body.order_accept_status)
    : null;

  const allowed = ["Хүлээгдэж буй", "Бараа ирсэн"];
  if (status && !allowed.includes(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }
  if (order_accept_status && !["OPEN", "CLOSED"].includes(order_accept_status)) {
    return NextResponse.json({ message: "Invalid order_accept_status" }, { status: 400 });
  }

  const before = await prisma.adminProduct.findUnique({
    where: { id },
    select: { arrival_status: true, cargo_fee: true, cargo_note: true, order_accept_status: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.adminProduct.update({
      where: { id },
      data: {
        arrival_status: status || undefined,
        cargo_fee: cargo_fee ?? null,
        cargo_note: cargo_note || null,
        order_accept_status: order_accept_status || undefined,
      },
    });

    // If the main product is closed for orders, all variants must be closed as well.
    if (order_accept_status === "CLOSED") {
      await tx.adminProductVariant.updateMany({
        where: { product_id: id },
        data: { order_accept_status: "CLOSED" },
      });
    }
  });

  await logAdminAction({
    request,
    action: "PRODUCT_STATUS_UPDATE",
    entityType: "AdminProduct",
    entityId: id,
    details: {
      before,
      after: {
        arrival_status: status || null,
        cargo_fee,
        cargo_note,
        order_accept_status: order_accept_status || null,
      },
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const images = await prisma.adminProductImage.findMany({
    where: { product_id: id, product_variant_id: null },
    select: { image_url: true },
  });

  await prisma.adminProductImage.deleteMany({
    where: { product_id: id, product_variant_id: null },
  });

  const before = await prisma.adminProduct.findUnique({
    where: { id },
    select: { name: true, price: true },
  });

  await prisma.adminProduct.delete({ where: { id } });

  await Promise.all(images.map((img) => tryDeleteFileIfUnused(img.image_url ?? null)));

  await logAdminAction({
    request,
    action: "PRODUCT_DELETE",
    entityType: "AdminProduct",
    entityId: id,
    details: { before },
  });
  return NextResponse.json({ success: true });
}
