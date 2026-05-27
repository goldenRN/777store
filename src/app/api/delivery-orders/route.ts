import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const formatDeliveryAddress = (
  districtName?: string | null,
  khorooName?: string | null,
  address?: string | null,
) =>
  [districtName, khorooName, address]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" / ") || null;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
  const limit = Math.max(Number(searchParams.get("limit") ?? 20), 1);
  const q = String(searchParams.get("q") ?? "").trim();
  let status = String(searchParams.get("status") ?? "Хүргэлтэнд бүртгэгдсэн").trim();

  if (status) {
    const key = status.toLowerCase();
    if (key === "shipping" || key === "shipped") {
      status = "Хүргэлтэнд бүртгэгдсэн";
    } else if (key === "delivered" || key === "completed") {
      status = "Хүргэгдсэн";
    } else if (key === "cancelled" || key === "canceled" || key === "returned") {
      status = "Буцаагдсан";
    }
  }

  const andClauses: Prisma.AdminDeliveryOrderWhereInput[] = [
    {
      OR: [
        { source_order_id: null },
        { order: { is: { deleted_at: null } } },
      ],
    },
  ];

  if (q) {
    const maybeId = Number(q);
    andClauses.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { address: { contains: q, mode: "insensitive" } },
        { district_name: { contains: q, mode: "insensitive" } },
        { khoroo_name: { contains: q, mode: "insensitive" } },
        ...(Number.isFinite(maybeId) ? [{ id: maybeId }, { source_order_id: maybeId }] : []),
        {
          items: {
            some: {
              OR: [
                ...(Number.isFinite(maybeId) ? [{ order_id: maybeId }] : []),
                { product_name: { contains: q, mode: "insensitive" } },
                { variant_label: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  const where: Prisma.AdminDeliveryOrderWhereInput = {
    AND: andClauses,
    ...(status && status !== "ALL" ? { status } : {}),
  };

  const total = await prisma.adminDeliveryOrder.count({ where });
  const pages = Math.max(Math.ceil(total / limit), 1);

  const rows = await prisma.adminDeliveryOrder.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantity: true,
        },
      },
    },
  });

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: null,
      phone1: row.phone,
      phone2: null,
      status: row.status,
      created_at: row.created_at,
      total: row.total,
      is_delivery_order: true,
      source_order_id: row.source_order_id,
      delivery_address: formatDeliveryAddress(row.district_name, row.khoroo_name, row.address),
      delivery_fee: row.delivery_fee,
      cargo_fee: row.cargo_fee,
      item_count: row.items.length,
      quantity_total: row.items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 0)), 0),
      payment_status: row.payment_status,
      payment_provider: row.payment_provider,
      payment_method_name:
        row.payment_provider?.toLowerCase() === "qpay" ? "QPay" : row.payment_provider,
      qpay_qr_image: row.qpay_qr_image,
      qpay_qr_text: row.qpay_qr_text,
      qpay_short_url: row.qpay_short_url,
      payment_expires_at: row.payment_expires_at,
      delivery_district_name: row.district_name,
      delivery_khoroo_name: row.khoroo_name,
      delivery_groups: [],
    })),
    meta: { page, limit, total, pages },
  });
}
