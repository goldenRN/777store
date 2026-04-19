import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeBulkTiers } from "@/lib/bulkPricing";

export async function GET() {
  const list = await prisma.adminProduct.findMany({
    orderBy: { id: "desc" },
    include: {
      category: true,
      subcategory: true,
      brand: true,
      unit: true,
      type: true,
    },
  });

  const mapped = list.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    video_url: p.video_url ?? null,
    price: p.price,
    discount_price: p.discount_price,
    bulk_prices: p.bulk_prices ?? null,
    stock: p.stock,
    material: p.material,
    duration_hours: p.duration_hours,
    arrival_status: p.arrival_status,
    cargo_fee: p.cargo_fee,
    ordered_qty: p.ordered_qty,
    order_accept_status: p.order_accept_status,
    category_id: p.category_id,
    subcategory_id: p.subcategory_id,
    brand_id: p.brand_id,
    unit_id: p.unit_id,
    type_id: p.type_id,
    category_name: p.category?.category_name ?? "",
    subcategory_name: p.subcategory?.name ?? "",
    brand_name: p.brand?.name ?? "",
    unit_name: p.unit?.name ?? "",
    type_name: p.type?.name ?? "",
    type_has_duration: p.type?.has_duration ?? false,
    created_at: p.created_at,
  }));

  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
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
  const bulk_prices =
    body?.bulk_prices == null
      ? Prisma.JsonNull
      : (() => {
          const tiers = normalizeBulkTiers(body.bulk_prices);
          return tiers.length > 0 ? tiers : Prisma.JsonNull;
        })();

  if (!name) {
    return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  }

  const created = await prisma.adminProduct.create({
    data: {
      name,
      description: description || null,
      video_url: video_url || null,
      price,
      discount_price: discount_price ?? null,
      bulk_prices,
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
      images: body?.images?.length
        ? {
            create: body.images.map((img: { image_url: string; public_id?: string | null }) => ({
              image_url: img.image_url,
              public_id: img.public_id ?? null,
            })),
          }
        : undefined,
    },
  });

  return NextResponse.json({ id: created.id });
}
