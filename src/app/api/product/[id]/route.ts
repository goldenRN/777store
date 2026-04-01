import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

const tryDeleteFile = async (imageUrl: string | null) => {
  if (!imageUrl) return;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return;
  const clean = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  if (!clean.startsWith("/uploads/")) return;
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
  const duration_hours =
    body?.duration_hours != null ? Math.round(Number(body.duration_hours)) : null;
  const arrival_status = body?.arrival_status ? String(body.arrival_status) : null;
  const cargo_fee =
    body?.cargo_fee != null && body.cargo_fee !== ""
      ? Math.round(Number(body.cargo_fee))
      : null;
  const order_accept_status = body?.order_accept_status
    ? String(body.order_accept_status)
    : null;

  if (!name) {
    return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  }

  await prisma.adminProduct.update({
    where: { id },
    data: {
      name,
      description: description || null,
      video_url: video_url || null,
      price,
      discount_price: discount_price ?? null,
      stock,
      material: material || null,
      duration_hours: duration_hours ?? null,
      arrival_status: arrival_status || undefined,
      cargo_fee: cargo_fee ?? null,
      order_accept_status: order_accept_status || undefined,
      category_id: body?.category_id ? Number(body.category_id) : null,
      subcategory_id: body?.subcategory_id ? Number(body.subcategory_id) : null,
      brand_id: body?.brand_id ? Number(body.brand_id) : null,
      unit_id: body?.unit_id ? Number(body.unit_id) : null,
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

  await prisma.adminProduct.update({
    where: { id },
    data: {
      arrival_status: status || undefined,
      cargo_fee: cargo_fee ?? null,
      order_accept_status: order_accept_status || undefined,
    },
  });

  return NextResponse.json({ success: true });
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

  const images = await prisma.adminProductImage.findMany({
    where: { product_id: id, product_variant_id: null },
    select: { image_url: true },
  });

  await prisma.adminProductImage.deleteMany({
    where: { product_id: id, product_variant_id: null },
  });

  await prisma.adminProduct.delete({ where: { id } });

  await Promise.all(images.map((img) => tryDeleteFile(img.image_url ?? null)));
  return NextResponse.json({ success: true });
}
