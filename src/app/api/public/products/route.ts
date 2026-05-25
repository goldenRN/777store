import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 12;

const TYPE_ALIASES: Record<string, string[]> = {
  ready: ["ready", "бэлэн"],
  preorder: ["preorder", "захиал", "урьдчил"],
  live: ["live", "лайв"],
};

const listSelect = Prisma.validator<Prisma.AdminProductSelect>()({
  id: true,
  name: true,
  description: true,
  price: true,
  discount_price: true,
  bulk_prices: true,
  stock: true,
  ordered_qty: true,
  material: true,
  duration_hours: true,
  type_id: true,
  category_id: true,
  subcategory_id: true,
  brand_id: true,
  is_hidden: true,
  order_accept_status: true,
  created_at: true,
  type: {
    select: {
      name: true,
      has_duration: true,
    },
  },
  category: {
    select: {
      category_name: true,
    },
  },
  subcategory: {
    select: {
      name: true,
    },
  },
  brand: {
    select: {
      name: true,
    },
  },
  images: {
    where: { product_variant_id: null },
    orderBy: { id: "asc" },
    take: 1,
    select: { image_url: true },
  },
  variants: {
    select: {
      stock: true,
      ordered_qty: true,
      images: {
        orderBy: { id: "asc" },
        take: 1,
        select: { image_url: true },
      },
    },
  },
});

const countSelect = Prisma.validator<Prisma.AdminProductSelect>()({
  id: true,
  created_at: true,
  duration_hours: true,
  stock: true,
  ordered_qty: true,
  order_accept_status: true,
  type: {
    select: {
      name: true,
      has_duration: true,
    },
  },
  is_hidden: true,
  variants: {
    select: {
      stock: true,
      ordered_qty: true,
    },
  },
});

type ListedProduct = Prisma.AdminProductGetPayload<{ select: typeof listSelect }>;
type CountedProduct = Prisma.AdminProductGetPayload<{ select: typeof countSelect }>;

function shouldHideClosedProduct(
  product: {
    type: { name: string; has_duration: boolean } | null;
  },
  closed: boolean
) {
  if (!closed) return false;
  const { isReady } = getTypeFlags(product.type?.name ?? "");
  return isReady;
}

function shouldExcludeProductByAvailability(
  product: {
    is_hidden?: boolean | null;
    type: { name: string; has_duration: boolean } | null;
  },
  closed: boolean,
  availability: string,
) {
  if (product.is_hidden) return true;
  if (shouldHideClosedProduct(product, closed)) return true;
  if (availability === "open" && closed) return true;
  return false;
}

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

function normalizeTypeKey(type?: string | null) {
  const normalized = String(type || "").trim().toLowerCase();
  if (!normalized) return "";
  if (TYPE_ALIASES.ready.some((alias) => normalized.includes(alias))) return "ready";
  if (TYPE_ALIASES.preorder.some((alias) => normalized.includes(alias))) return "preorder";
  if (TYPE_ALIASES.live.some((alias) => normalized.includes(alias))) return "live";
  return normalized;
}

function getTypeFlags(typeName?: string | null) {
  const t = String(typeName || "").toLowerCase();
  const isReady = t.includes("бэлэн") || t.includes("ready");
  const isPreorderLive =
    t.includes("захиал") || t.includes("preorder") || t.includes("урьдчил") || t.includes("лайв") || t.includes("live");
  return { isReady, isPreorderLive };
}

function getFallbackVariantImage(variants: { images: { image_url: string }[] }[]) {
  return variants.find((variant) => variant.images[0]?.image_url)?.images[0]?.image_url ?? null;
}

function getEffectiveStock(product: {
  stock: number;
  variants: { stock: number | null }[];
}) {
  const variantStockSum = product.variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock || 0)), 0);
  return product.stock > 0 ? product.stock : variantStockSum;
}

function getEffectiveOrderedQty(product: {
  ordered_qty: number;
  variants: { ordered_qty?: number | null }[];
}) {
  if (Number(product.ordered_qty || 0) > 0) return Number(product.ordered_qty || 0);
  return product.variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.ordered_qty || 0)), 0);
}

function isClosedProduct(
  product: {
    created_at: Date;
    duration_hours: number | null;
    stock: number;
    ordered_qty: number;
    order_accept_status: string | null;
    type: { name: string; has_duration: boolean } | null;
    variants: { stock: number | null; ordered_qty?: number | null }[];
  },
  now: Date
) {
  const hasDuration = Number(product.duration_hours || 0) > 0;
  const durationHours = Number(product.duration_hours || 0);
  const { isReady } = getTypeFlags(product.type?.name ?? "");
  const endMs = hasDuration ? product.created_at.getTime() + durationHours * 60 * 60 * 1000 : null;
  const expired = endMs ? endMs <= now.getTime() : false;
  const effectiveStock = getEffectiveStock(product);
  const orderedQty = getEffectiveOrderedQty(product);
  const remaining = Math.max(0, effectiveStock - orderedQty);
  const stockLimitEnabled = effectiveStock > 0;
  const closedByStock = isReady ? remaining <= 0 : stockLimitEnabled && remaining <= 0;
  const closedByManual = !isReady && product.order_accept_status === "CLOSED";
  return {
    closed: closedByManual || expired || closedByStock,
    effectiveStock,
    orderedQty,
  };
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
  const availability = String(searchParams.get("availability") ?? "all").trim().toLowerCase();
  const limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const page = Number(searchParams.get("page") ?? 1);
  const take = Number.isNaN(limit) ? DEFAULT_LIMIT : Math.min(limit, 100);
  const skip = Math.max(page - 1, 0) * take;
  const normalizedType = normalizeTypeKey(type);
  const paginateOpenBeforeClosed = !random && (normalizedType === "preorder" || normalizedType === "live");

  const now = new Date();
  const where: Prisma.AdminProductWhereInput = {};

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

  const pickRandomIds = async () => {
    // Oversample because we still filter out "closed" items after computing stock/expiry.
    const oversample = Math.min(Math.max(take * 8, take), 400);
    const clauses: Prisma.Sql[] = [];

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
        .filter((alias) => alias.trim().length > 0)
        .map((alias) => Prisma.sql`LOWER(t.name) LIKE ${`%${alias.toLowerCase()}%`}`);
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
    return rows.map((row) => row.id);
  };

  const randomIds = random ? await pickRandomIds() : [];
  const randomWhere = { ...where, id: { in: randomIds.length ? randomIds : [-1] } };

  const [items, countRows] = random
    ? await Promise.all([
        prisma.adminProduct.findMany({
          where: randomWhere,
          select: listSelect,
        }),
        prisma.adminProduct.findMany({
          where: randomWhere,
          select: countSelect,
        }),
      ])
    : await Promise.all([
        prisma.adminProduct.findMany({
          where,
          orderBy: { created_at: "desc" },
          select: listSelect,
        }),
        prisma.adminProduct.findMany({
          where,
          select: countSelect,
        }),
      ]);

  const mapped = items
    .map((product) => {
      const { closed, effectiveStock, orderedQty } = isClosedProduct(product, now);
      if (shouldExcludeProductByAvailability(product, closed, availability)) return null;
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        discount_price: product.discount_price,
        bulk_prices: product.bulk_prices ?? null,
        stock: effectiveStock,
        ordered_qty: orderedQty,
        material: product.material,
        duration_hours: product.duration_hours,
        type_id: product.type_id,
        type_name: product.type?.name ?? "",
        type_has_duration: product.type?.has_duration ?? false,
        category_id: product.category_id,
        category_name: product.category?.category_name ?? "",
        subcategory_id: product.subcategory_id,
        subcategory_name: product.subcategory?.name ?? "",
        brand_id: product.brand_id,
        brand_name: product.brand?.name ?? "",
        image_url: product.images[0]?.image_url ?? getFallbackVariantImage(product.variants) ?? null,
        created_at: product.created_at,
        order_accept_status: product.order_accept_status,
        is_closed: closed,
      };
    })
    .filter(Boolean);

  const orderedMapped = (() => {
    const base = [...(mapped as NonNullable<(typeof mapped)[number]>[])];
    base.sort((a, b) => {
      const aClosed = a.is_closed ? 1 : 0;
      const bClosed = b.is_closed ? 1 : 0;
      if (aClosed !== bClosed) return aClosed - bClosed;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    if (!random || randomIds.length === 0) return base;
    const positionById = new Map<number, number>();
    randomIds.forEach((id, index) => positionById.set(id, index));
    return base
      .sort((a, b) => (positionById.get(a.id) ?? 0) - (positionById.get(b.id) ?? 0))
      .slice(0, take);
  })();

  const total = countRows.reduce((acc, product) => {
    const { closed } = isClosedProduct(product, now);
    return shouldExcludeProductByAvailability(product, closed, availability) ? acc : acc + 1;
  }, 0);

  const pagedItems = random
    ? orderedMapped
    : paginateOpenBeforeClosed
      ? orderedMapped.slice(skip, skip + take)
      : orderedMapped.slice(skip, skip + take);

  return NextResponse.json({
    items: pagedItems,
    total: random ? orderedMapped.length : total,
    page,
    limit: take,
  });
}
