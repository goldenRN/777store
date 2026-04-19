import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const preorderTypeWhere: Prisma.AdminTypeWhereInput = {
  OR: [
    { has_duration: true },
    { name: { contains: "захиал", mode: "insensitive" } },
    { name: { contains: "урьдчил", mode: "insensitive" } },
    { name: { contains: "preorder", mode: "insensitive" } },
    { name: { contains: "live", mode: "insensitive" } },
    { name: { contains: "лайв", mode: "insensitive" } },
  ],
};

const itemSelect = Prisma.validator<Prisma.AdminOrderItemSelect>()({
  id: true,
  order_id: true,
  product_id: true,
  variant_id: true,
  product_name: true,
  quantity: true,
  price: true,
  image_url: true,
  status: true,
  order: {
    select: {
      name: true,
      phone1: true,
    },
  },
});

const productSelect = Prisma.validator<Prisma.AdminProductSelect>()({
  id: true,
  name: true,
  description: true,
  stock: true,
  ordered_qty: true,
  order_accept_status: true,
  created_at: true,
  duration_hours: true,
  images: {
    where: { product_variant_id: null },
    orderBy: { id: "asc" },
    take: 1,
    select: { image_url: true },
  },
  variants: {
    select: {
      id: true,
      sku: true,
      attribute: true,
      price: true,
      stock: true,
      ordered_qty: true,
      order_accept_status: true,
      images: {
        orderBy: { id: "asc" },
        take: 1,
        select: { image_url: true },
      },
    },
  },
});

type SummaryItem = Prisma.AdminOrderItemGetPayload<{ select: typeof itemSelect }>;
type SummaryProduct = Prisma.AdminProductGetPayload<{ select: typeof productSelect }>;

type SummaryVariant = {
  variant_id: number;
  label: string;
  stock: number | null;
  ordered_qty: number;
  remaining_qty: number | null;
  closed: boolean;
};

type SummaryGroup = {
  product_id: number | null;
  product_name: string;
  product_description: string;
  image_url: string | null;
  product_stock: number | null;
  product_ordered_qty: number | null;
  order_accept_status: string | null;
  total_qty: number;
  order_count: number;
  item_ids: number[];
  buyers: { order_id: number; name: string; phone: string; qty: number; unit_price: number; total_price: number }[];
  variants: SummaryVariant[];
};

function normalizeImage(url?: string | null) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const cleaned = raw.split("#")[0].split("?")[0];
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
}

function getVariantLabel(variant: { sku: string | null; attribute: Prisma.JsonValue | null; id: number }) {
  const attr =
    variant.attribute && typeof variant.attribute === "object" && !Array.isArray(variant.attribute)
      ? (variant.attribute as Record<string, unknown>)
      : {};
  const type = typeof attr.type === "string" ? attr.type : "";
  const color = typeof attr.color === "string" ? attr.color : "";
  const size = typeof attr.size === "string" ? attr.size : "";
  const merged = [type, color, size].filter(Boolean).join(" / ");
  return merged || variant.sku || `Төрөл-${variant.id}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let status = (searchParams.get("status") ?? "").trim();
  const itemStatus = (searchParams.get("itemStatus") ?? "").trim();
  const payment = (searchParams.get("payment") ?? "PAID").trim().toUpperCase();
  const excludeArrived = searchParams.get("excludeArrived") === "true";
  const openOnly = searchParams.get("openOnly") === "true";
  const closedOnly = searchParams.get("closedOnly") === "true";

  if (status) {
    const key = status.toLowerCase();
    if (key === "pending") {
      const first = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
      if (first?.name) status = first.name;
    } else if (key === "confirmed") {
      status = "Бараа ирсэн";
    } else if (key === "shipping" || key === "shipped") {
      status = "Хүргэлтэнд бүртгэгдсэн";
    } else if (key === "delivered" || key === "completed") {
      status = "Хүргэгдсэн";
    } else if (key === "cancelled" || key === "canceled") {
      status = "Цуцлагдсан";
    }
  }

  const whereOrder: Prisma.AdminOrderWhereInput = {
    deleted_at: null,
  };
  if (payment === "PAID") {
    whereOrder.payment_status = "PAID";
  } else if (payment === "UNPAID") {
    whereOrder.payment_status = "UNPAID";
  }
  if (status && !itemStatus) {
    whereOrder.status = status;
  }

  const items = await prisma.adminOrderItem.findMany({
    where: {
      order: whereOrder,
      ...(itemStatus
        ? { status: itemStatus }
        : excludeArrived
          ? { status: { not: "Бараа ирсэн" } }
          : {}),
    },
    select: itemSelect,
    orderBy: { id: "desc" },
  });

  const productIds = Array.from(
    new Set(items.map((item) => item.product_id).filter((id): id is number => id != null))
  );
  const nameCandidates = Array.from(
    new Set(
      items
        .filter((item) => !item.product_id && item.product_name)
        .map((item) => item.product_name.trim())
        .filter(Boolean)
    )
  );

  const productWhereOr: Prisma.AdminProductWhereInput[] = [];
  if (productIds.length > 0) {
    productWhereOr.push({ id: { in: productIds } });
  }
  productWhereOr.push(
    ...nameCandidates.map((name) => ({
      name: { equals: name, mode: "insensitive" as const },
    }))
  );
  if (openOnly) {
    productWhereOr.push({
      order_accept_status: { not: "CLOSED" },
      type: preorderTypeWhere,
    });
  }
  if (closedOnly) {
    productWhereOr.push({ order_accept_status: "CLOSED" });
    productWhereOr.push({ variants: { some: { order_accept_status: "CLOSED" } } });
  }

  const products =
    productWhereOr.length === 0
      ? ([] as SummaryProduct[])
      : await prisma.adminProduct.findMany({
          where: { OR: productWhereOr },
          select: productSelect,
          orderBy: { id: "asc" },
        });

  const productMetaMap = new Map(
    products.map((product) => [
      product.id,
      {
        description: product.description ?? "",
        image_url: product.images[0]?.image_url ?? null,
        stock: product.stock ?? null,
        ordered_qty: product.ordered_qty ?? null,
        order_accept_status: product.order_accept_status ?? null,
        created_at: product.created_at ?? null,
        duration_hours: product.duration_hours ?? null,
        variants: product.variants ?? [],
      },
    ])
  );

  const productByName = new Map(
    products.map((product) => [String(product.name || "").trim().toLowerCase(), product])
  );

  const variantImageIndex = new Map<number, Map<string, number[]>>();
  const variantPriceIndex = new Map<number, Map<number, number[]>>();
  for (const product of products) {
    const byImage = new Map<string, number[]>();
    const byPrice = new Map<number, number[]>();
    for (const variant of product.variants || []) {
      if (variant.price != null) {
        const price = Number(variant.price);
        if (!byPrice.has(price)) byPrice.set(price, []);
        byPrice.get(price)!.push(variant.id);
      }
      for (const image of variant.images || []) {
        const normalized = normalizeImage(image.image_url);
        if (!normalized) continue;
        if (!byImage.has(normalized)) byImage.set(normalized, []);
        byImage.get(normalized)!.push(variant.id);
      }
    }
    variantImageIndex.set(product.id, byImage);
    variantPriceIndex.set(product.id, byPrice);
  }

  const confirmedMap = new Map<string, number>();
  const inferredMap = new Map<string, number>();
  const grouped = new Map<string, SummaryGroup>();

  for (const item of items) {
    const key = item.product_id ? `p:${item.product_id}` : `n:${item.product_name}`;
    const nameKey = String(item.product_name || "").trim().toLowerCase();
    const fallbackProduct = !item.product_id && nameKey ? productByName.get(nameKey) : null;
    const productMeta = item.product_id
      ? productMetaMap.get(item.product_id)
      : fallbackProduct
        ? productMetaMap.get(fallbackProduct.id)
        : null;

    const current = grouped.get(key) ?? {
      product_id: item.product_id ?? null,
      product_name: item.product_name,
      product_description: productMeta?.description ?? "",
      image_url: productMeta?.image_url ?? item.image_url ?? null,
      product_stock: productMeta?.stock ?? null,
      product_ordered_qty: productMeta?.ordered_qty ?? null,
      order_accept_status: productMeta?.order_accept_status ?? null,
      total_qty: 0,
      order_count: 0,
      item_ids: [],
      buyers: [],
      variants: [],
    };

    current.total_qty += item.quantity;
    current.item_ids.push(item.id);
    current.buyers.push({
      order_id: item.order_id,
      name: item.order?.name ?? "",
      phone: item.order?.phone1 ?? "",
      qty: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    });
    grouped.set(key, current);

    const productId = item.product_id ?? fallbackProduct?.id ?? null;
    if (!productId) continue;

    const qty = item.quantity;
    const confirmedVariantId = item.variant_id ? Number(item.variant_id) : null;
    if (confirmedVariantId) {
      const mapKey = `${productId}|${confirmedVariantId}`;
      confirmedMap.set(mapKey, (confirmedMap.get(mapKey) ?? 0) + qty);
      continue;
    }

    let inferredVariantId: number | null = null;
    const normalizedImage = normalizeImage(item.image_url ?? null);
    if (normalizedImage) {
      const candidates = variantImageIndex.get(productId)?.get(normalizedImage) ?? [];
      if (candidates.length === 1) {
        inferredVariantId = candidates[0];
      }
    }
    if (!inferredVariantId && item.price != null) {
      const candidates = variantPriceIndex.get(productId)?.get(Number(item.price)) ?? [];
      if (candidates.length === 1) {
        inferredVariantId = candidates[0];
      }
    }
    if (inferredVariantId) {
      const mapKey = `${productId}|${inferredVariantId}`;
      inferredMap.set(mapKey, (inferredMap.get(mapKey) ?? 0) + qty);
    }
  }

  if (openOnly || closedOnly) {
    for (const product of products) {
      const key = `p:${product.id}`;
      if (grouped.has(key)) continue;
      const productMeta = productMetaMap.get(product.id) ?? null;
      grouped.set(key, {
        product_id: product.id,
        product_name: product.name,
        product_description: productMeta?.description ?? product.description ?? "",
        image_url: productMeta?.image_url ?? product.images[0]?.image_url ?? null,
        product_stock: productMeta?.stock ?? product.stock ?? null,
        product_ordered_qty: productMeta?.ordered_qty ?? product.ordered_qty ?? 0,
        order_accept_status: productMeta?.order_accept_status ?? product.order_accept_status ?? null,
        total_qty: 0,
        order_count: 0,
        item_ids: [],
        buyers: [],
        variants: [],
      });
    }
  }

  const result = Array.from(grouped.values())
    .map((group) => {
      const productId =
        group.product_id ?? productByName.get(String(group.product_name || "").trim().toLowerCase())?.id ?? null;
      if (!productId) {
        return { ...group, order_count: group.buyers.length, variants: [] as SummaryVariant[] };
      }

      const productMeta = productMetaMap.get(productId) ?? null;
      const hasDuration = Number(productMeta?.duration_hours || 0) > 0;
      const durationHours = Number(productMeta?.duration_hours || 0);
      const endMs =
        productMeta?.created_at && hasDuration
          ? new Date(productMeta.created_at).getTime() + durationHours * 60 * 60 * 1000
          : null;
      const expired = endMs ? endMs <= Date.now() : false;
      const productClosed = productMeta?.order_accept_status === "CLOSED" || expired;
      const variants = productMeta?.variants ?? [];

      const computedAll: SummaryVariant[] = variants.map((variant) => {
        const confirmed = confirmedMap.get(`${productId}|${variant.id}`) ?? 0;
        const inferred = inferredMap.get(`${productId}|${variant.id}`) ?? 0;
        const ordered = confirmed + inferred;
        const stock = variant.stock != null ? Number(variant.stock) : null;
        const remaining = stock != null ? Math.max(0, stock - ordered) : null;
        const variantClosed = variant.order_accept_status === "CLOSED";
        return {
          variant_id: variant.id,
          label: getVariantLabel(variant),
          stock,
          ordered_qty: ordered,
          remaining_qty: remaining,
          closed: productClosed || variantClosed || (stock != null && remaining != null ? remaining <= 0 : false),
        };
      });

      const visibleVariants = openOnly
        ? computedAll
        : closedOnly
          ? computedAll.filter((variant) => variant.closed)
          : computedAll.filter((variant) => variant.ordered_qty > 0);

      const variantStockSum = computedAll.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock || 0)), 0);
      const productStockRaw = productMeta?.stock != null ? Number(productMeta.stock) : null;
      const effectiveStock =
        productStockRaw != null && productStockRaw > 0
          ? productStockRaw
          : variantStockSum > 0
            ? variantStockSum
            : null;
      const orderedForClose = Number(productMeta?.ordered_qty ?? group.total_qty ?? 0);
      const remainingForClose =
        effectiveStock != null && effectiveStock > 0 ? Math.max(0, effectiveStock - orderedForClose) : null;
      const allVariantsClosed = computedAll.length > 0 ? computedAll.every((variant) => variant.closed) : false;
      const closedByStock = remainingForClose != null ? remainingForClose <= 0 : false;
      const closedItem = productClosed || closedByStock || allVariantsClosed;

      if (openOnly) {
        if (closedItem) return null;
        if (computedAll.length > 0 && !computedAll.some((variant) => !variant.closed)) return null;
      }

      if (closedOnly) {
        if (!closedItem && !computedAll.some((variant) => variant.closed)) return null;
      }

      return {
        ...group,
        order_count: group.buyers.length,
        variants: visibleVariants,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ items: result });
}
