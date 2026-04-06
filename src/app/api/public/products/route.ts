import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 12;

const TYPE_ALIASES: Record<string, string[]> = {
  ready: ["ready", "бэлэн"],
  preorder: ["preorder", "захиал", "урьдчил"],
  live: ["live", "лайв"],
};

function buildTypeWhere(type: string) {
  const normalized = type.trim().toLowerCase();
  if (!normalized) return undefined;

  const aliases = TYPE_ALIASES[normalized] ?? [normalized];
  return {
    OR: aliases.map((alias) => ({
      type: { name: { contains: alias, mode: "insensitive" as const } },
    })),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const discount = searchParams.get("discount") === "true";
  const limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const page = Number(searchParams.get("page") ?? 1);
  const take = Number.isNaN(limit) ? DEFAULT_LIMIT : Math.min(limit, 100);
  const skip = Math.max(page - 1, 0) * take;

  const now = new Date();
  const where: Record<string, unknown> = {
    order_accept_status: { not: "CLOSED" },
  };

  if (type) {
    const typeWhere = buildTypeWhere(type);
    if (typeWhere) {
      Object.assign(where, typeWhere);
    }
  }

  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }

  if (discount) {
    where.discount_price = { gt: 0 };
  }

  if (category) {
    const id = Number(category);
    if (!Number.isNaN(id)) {
      where.category_id = id;
    }
  }

  if (subcategory) {
    const id = Number(subcategory);
    if (!Number.isNaN(id)) {
      where.subcategory_id = id;
    }
  }

  const [items, countRows] = await Promise.all([
    prisma.adminProduct.findMany({
      where,
      orderBy: { created_at: "desc" },
      take,
      skip,
      include: {
        type: true,
        category: true,
        subcategory: true,
        images: {
          where: { product_variant_id: null },
          orderBy: { id: "asc" },
        },
      },
    }),
    prisma.adminProduct.findMany({
      where,
      select: {
        id: true,
        created_at: true,
        duration_hours: true,
        stock: true,
        ordered_qty: true,
        order_accept_status: true,
      },
    }),
  ]);

  const mapped = items
    .map((p) => {
      const hasDuration = Number(p.duration_hours || 0) > 0;
      const durationHours = Number(p.duration_hours || 0);
      const endMs =
        p.created_at && hasDuration
          ? p.created_at.getTime() + durationHours * 60 * 60 * 1000
          : null;
      const expired = endMs ? endMs <= now.getTime() : false;
      const remaining = Math.max(0, Number(p.stock || 0) - Number(p.ordered_qty || 0));
      const stockLimitEnabled = Number(p.stock || 0) > 0;
      const closedByStock = hasDuration ? stockLimitEnabled && remaining <= 0 : remaining <= 0;
      const closed = p.order_accept_status === "CLOSED" || expired || closedByStock;
      if (closed) return null;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        discount_price: p.discount_price,
        stock: p.stock,
        ordered_qty: p.ordered_qty,
        material: p.material,
        duration_hours: p.duration_hours,
        type_id: p.type_id,
        type_name: p.type?.name ?? "",
        type_has_duration: p.type?.has_duration ?? false,
    category_id: p.category_id,
    category_name: p.category?.category_name ?? "",
    subcategory_id: p.subcategory_id,
    subcategory_name: p.subcategory?.name ?? "",
        image_url: p.images?.[0]?.image_url ?? null,
        created_at: p.created_at,
      };
    })
    .filter(Boolean);

  const total = countRows.reduce((acc, p) => {
    const hasDuration = Number(p.duration_hours || 0) > 0;
    const durationHours = Number(p.duration_hours || 0);
    const endMs =
      p.created_at && hasDuration
        ? p.created_at.getTime() + durationHours * 60 * 60 * 1000
        : null;
    const expired = endMs ? endMs <= now.getTime() : false;
    const remaining = Math.max(0, Number(p.stock || 0) - Number(p.ordered_qty || 0));
    const stockLimitEnabled = Number(p.stock || 0) > 0;
    const closedByStock = hasDuration ? stockLimitEnabled && remaining <= 0 : remaining <= 0;
    const closed = p.order_accept_status === "CLOSED" || expired || closedByStock;
    return closed ? acc : acc + 1;
  }, 0);

  return NextResponse.json({ items: mapped, total, page, limit: take });
}
