import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

function getTypeFlags(typeName?: string | null) {
  const t = String(typeName || "").toLowerCase();
  const isReady = t.includes("бэлэн") || t.includes("ready");
  const isPreorderLive =
    t.includes("захиал") || t.includes("preorder") || t.includes("урьдчил") || t.includes("лайв") || t.includes("live");
  return { isReady, isPreorderLive };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const brand = searchParams.get("brand");
  const brandOnly = searchParams.get("brandOnly") === "true";
  const discount = searchParams.get("discount") === "true";
  const random = searchParams.get("random") === "true";
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

  if (brand) {
    const id = Number(brand);
    if (!Number.isNaN(id)) {
      where.brand_id = id;
    }
  } else if (brandOnly) {
    where.brand_id = { not: null };
  }

  const include = {
    type: true,
    category: true,
    subcategory: true,
    brand: true,
    images: {
      where: { product_variant_id: null },
      orderBy: { id: "asc" as const },
    },
    variants: {
      include: {
        images: { orderBy: { id: "asc" as const } },
      },
    },
  };

  const selectForCount = {
    id: true,
    created_at: true,
    duration_hours: true,
    stock: true,
    ordered_qty: true,
    order_accept_status: true,
    type: { select: { name: true } },
    variants: { select: { stock: true } },
  };

  const pickRandomIds = async () => {
    // Oversample because we still filter out "closed" items after computing stock/expiry.
    const oversample = Math.min(Math.max(take * 8, take), 400);
    const clauses: Prisma.Sql[] = [Prisma.sql`p."order_accept_status" <> 'CLOSED'`];

    if (q) {
      const like = `%${q}%`;
      clauses.push(Prisma.sql`p."name" ILIKE ${like}`);
    }

    if (discount) {
      clauses.push(Prisma.sql`COALESCE(p."discount_price", 0) > 0`);
    }

    if (category) {
      const id = Number(category);
      if (!Number.isNaN(id)) {
        clauses.push(Prisma.sql`p."category_id" = ${id}`);
      }
    }

    if (subcategory) {
      const id = Number(subcategory);
      if (!Number.isNaN(id)) {
        clauses.push(Prisma.sql`p."subcategory_id" = ${id}`);
      }
    }

    if (brand) {
      const id = Number(brand);
      if (!Number.isNaN(id)) {
        clauses.push(Prisma.sql`p."brand_id" = ${id}`);
      }
    } else if (brandOnly) {
      clauses.push(Prisma.sql`p."brand_id" IS NOT NULL`);
    }

    if (type) {
      const normalized = type.trim().toLowerCase();
      const aliases = TYPE_ALIASES[normalized] ?? [normalized];
      const parts = aliases
        .filter((a) => a.trim().length > 0)
        .map((a) => Prisma.sql`LOWER(t.name) LIKE ${`%${a.toLowerCase()}%`}`);
      if (parts.length > 0) {
        clauses.push(
          Prisma.sql`EXISTS (
            SELECT 1 FROM "AdminType" t
            WHERE t.id = p."type_id"
              AND (${Prisma.join(parts, " OR ")})
          )`
        );
      }
    }

    const whereSql = clauses.length ? Prisma.join(clauses, " AND ") : Prisma.sql`TRUE`;
    const rows = await prisma.$queryRaw<{ id: number }[]>(
      Prisma.sql`
        SELECT p.id
        FROM "AdminProduct" p
        WHERE ${whereSql}
        ORDER BY RANDOM()
        LIMIT ${oversample}
      `
    );
    return rows.map((r) => r.id);
  };

  const randomIds = random ? await pickRandomIds() : [];

  const [items, countRows] = random
    ? await Promise.all([
        prisma.adminProduct.findMany({
          where: { ...where, id: { in: randomIds.length ? randomIds : [-1] } },
          include,
        }),
        prisma.adminProduct.findMany({
          where: { ...where, id: { in: randomIds.length ? randomIds : [-1] } },
          select: selectForCount,
        }),
      ])
    : await Promise.all([
        prisma.adminProduct.findMany({
          where,
          orderBy: { created_at: "desc" },
          take,
          skip,
          include,
        }),
        prisma.adminProduct.findMany({
          where,
          select: selectForCount,
        }),
      ]);

  const pendingStatus = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
  const productIdsAll = Array.from(new Set(countRows.map((p) => p.id)));
  const orderItems = productIdsAll.length
    ? await prisma.adminOrderItem.findMany({
        where: {
          product_id: { in: productIdsAll },
          order: {
            payment_status: "PAID",
            ...(pendingStatus?.name ? { status: pendingStatus.name } : {}),
          },
        },
        select: {
          product_id: true,
          quantity: true,
        },
      })
    : [];
  const orderedQtyMap = new Map<number, number>();
  for (const it of orderItems) {
    if (!it.product_id) continue;
    const qty = Number(it.quantity || 0);
    orderedQtyMap.set(it.product_id, (orderedQtyMap.get(it.product_id) ?? 0) + qty);
  }

  const mapped = items
    .map((p) => {
      const hasDuration = Number(p.duration_hours || 0) > 0;
      const durationHours = Number(p.duration_hours || 0);
      const { isReady } = getTypeFlags(p.type?.name ?? "");
      const variantStockSum = (p.variants || []).reduce((sum, v) => sum + (Number(v.stock || 0) || 0), 0);
      const effectiveStock = Number(p.stock || 0) > 0 ? Number(p.stock || 0) : variantStockSum;
      const orderedQty = orderedQtyMap.get(p.id) ?? Number(p.ordered_qty || 0);
      const endMs =
        p.created_at && hasDuration
          ? p.created_at.getTime() + durationHours * 60 * 60 * 1000
          : null;
      const expired = endMs ? endMs <= now.getTime() : false;
      const remaining = Math.max(0, effectiveStock - orderedQty);
      const stockLimitEnabled = effectiveStock > 0;
      // Ready бараа: stock=0 бол "дууссан" гэж үзнэ. Захиалга/лайв: stock тохируулаагүй (0) бол stock limit ажиллахгүй.
      const closedByStock = isReady ? remaining <= 0 : stockLimitEnabled && remaining <= 0;
      const closed = p.order_accept_status === "CLOSED" || expired || closedByStock;
      if (closed) return null;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        discount_price: p.discount_price,
        bulk_prices: (p as any).bulk_prices ?? null,
        stock: effectiveStock,
        ordered_qty: orderedQty,
        material: p.material,
        duration_hours: p.duration_hours,
        type_id: p.type_id,
        type_name: p.type?.name ?? "",
        type_has_duration: p.type?.has_duration ?? false,
    category_id: p.category_id,
    category_name: p.category?.category_name ?? "",
    subcategory_id: p.subcategory_id,
    subcategory_name: p.subcategory?.name ?? "",
        brand_id: p.brand_id,
        brand_name: p.brand?.name ?? "",
        image_url:
          p.images?.[0]?.image_url ??
          p.variants?.find((v) => v.images?.[0]?.image_url)?.images?.[0]?.image_url ??
          null,
        created_at: p.created_at,
      };
    })
    .filter(Boolean);

  // Preserve the random order (DB ORDER BY RANDOM()) when requested.
  const orderedMapped = (() => {
    if (!random || randomIds.length === 0) return mapped;
    const pos = new Map<number, number>();
    randomIds.forEach((id, i) => pos.set(id, i));
    return (mapped as any[])
      .sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0))
      .slice(0, take);
  })();

  const total = countRows.reduce((acc, p) => {
    const hasDuration = Number(p.duration_hours || 0) > 0;
    const durationHours = Number(p.duration_hours || 0);
    const { isReady } = getTypeFlags((p as any)?.type?.name ?? (p as any)?.type_name ?? "");
    const endMs =
      p.created_at && hasDuration
        ? p.created_at.getTime() + durationHours * 60 * 60 * 1000
        : null;
    const expired = endMs ? endMs <= now.getTime() : false;
    const variantStockSum = ((p as any)?.variants || []).reduce(
      (sum: number, v: any) => sum + (Number(v?.stock || 0) || 0),
      0
    );
    const effectiveStock = Number((p as any)?.stock || 0) > 0 ? Number((p as any)?.stock || 0) : variantStockSum;
    const orderedQty = orderedQtyMap.get(p.id) ?? Number((p as any)?.ordered_qty || 0);
    const remaining = Math.max(0, effectiveStock - orderedQty);
    const stockLimitEnabled = effectiveStock > 0;
    const closedByStock = isReady ? remaining <= 0 : stockLimitEnabled && remaining <= 0;
    const closed = p.order_accept_status === "CLOSED" || expired || closedByStock;
    return closed ? acc : acc + 1;
  }, 0);

  const totalEffective = random ? orderedMapped.length : total;

  return NextResponse.json({ items: orderedMapped, total: totalEffective, page, limit: take });
}
