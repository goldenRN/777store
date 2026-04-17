import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const whereOrder: Record<string, unknown> = {};
  if (payment === "PAID") {
    whereOrder.payment_status = "PAID";
  } else if (payment === "UNPAID") {
    whereOrder.payment_status = "UNPAID";
  }
  // Exclude soft-deleted orders from all summaries.
  whereOrder.deleted_at = null;
  // If itemStatus is set, we are filtering by AdminOrderItem.status (arrival workflow),
  // so do not constrain by AdminOrder.status.
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
    include: {
      order: true,
    },
    orderBy: { id: "desc" },
  });

  const productIds = Array.from(
    new Set(items.map((it) => it.product_id).filter((id) => id != null))
  ) as number[];
  const nameCandidates = Array.from(
    new Set(
      items
        .filter((it) => !it.product_id && it.product_name)
        .map((it) => it.product_name.trim())
        .filter(Boolean)
    )
  );

  const productNameOr: { name: { equals: string; mode: "insensitive" } }[] = nameCandidates.map((n) => ({
    name: { equals: n, mode: "insensitive" },
  }));

  const products = await prisma.adminProduct.findMany({
    where: {
      OR: [
        ...(productIds.length > 0 ? [{ id: { in: productIds } }] : []),
        ...productNameOr,
      ],
    },
    include: { images: true, variants: { include: { images: true } } },
  });
  const productMap = new Map(
    products.map((p) => [
      p.id,
      {
        description: p.description ?? "",
        image_url: p.images?.[0]?.image_url ?? null,
        stock: p.stock ?? null,
        ordered_qty: p.ordered_qty ?? null,
        order_accept_status: p.order_accept_status ?? null,
        created_at: p.created_at ?? null,
        duration_hours: p.duration_hours ?? null,
        variants: p.variants ?? [],
      },
    ])
  );
  const productByName = new Map(
    products.map((p) => [String(p.name || "").trim().toLowerCase(), p])
  );

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

  const getVariantLabel = (variant: { sku: string | null; attribute: Record<string, unknown> | null; id: number }) => {
    const attr = (variant.attribute || {}) as Record<string, unknown>;
    const type = typeof attr.type === "string" ? attr.type : "";
    const color = typeof attr.color === "string" ? attr.color : "";
    const size = typeof attr.size === "string" ? attr.size : "";
    const merged = [type, color, size].filter(Boolean).join(" / ");
    return merged || variant.sku || `Төрөл-${variant.id}`;
  };

  const variantByProduct = new Map<number, Map<number, any>>();
  const variantImageIndex = new Map<number, Map<string, number[]>>();
  const variantPriceIndex = new Map<number, Map<number, number[]>>();
  for (const p of products) {
    const byId = new Map<number, any>();
    const byImage = new Map<string, number[]>();
    const byPrice = new Map<number, number[]>();
    for (const v of p.variants || []) {
      byId.set(v.id, v);
      if (v.price != null) {
        const price = Number(v.price);
        if (!byPrice.has(price)) byPrice.set(price, []);
        byPrice.get(price)!.push(v.id);
      }
      (v.images || []).forEach((img: any) => {
        const norm = normalizeImage(img.image_url);
        if (!norm) return;
        if (!byImage.has(norm)) byImage.set(norm, []);
        byImage.get(norm)!.push(v.id);
      });
    }
    variantByProduct.set(p.id, byId);
    variantImageIndex.set(p.id, byImage);
    variantPriceIndex.set(p.id, byPrice);
  }

  const confirmedMap = new Map<string, number>();
  const inferredMap = new Map<string, number>();

  const map = new Map<
    string,
    {
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
      variants: {
        variant_id: number;
        label: string;
        stock: number | null;
        ordered_qty: number;
        remaining_qty: number | null;
      }[];
    }
  >();

  for (const it of items) {
    const key = it.product_id ? `p:${it.product_id}` : `n:${it.product_name}`;
    const nameKey = String(it.product_name || "").trim().toLowerCase();
    const fallbackProduct = !it.product_id && nameKey ? productByName.get(nameKey) : null;
    const productMeta = it.product_id
      ? productMap.get(it.product_id)
      : fallbackProduct
      ? productMap.get(fallbackProduct.id)
      : null;
    const existing = map.get(key) ?? {
      product_id: it.product_id ?? null,
      product_name: it.product_name,
      product_description: productMeta?.description ?? "",
      image_url: productMeta?.image_url ?? it.image_url ?? null,
      product_stock: productMeta?.stock ?? null,
      product_ordered_qty: productMeta?.ordered_qty ?? null,
      order_accept_status: productMeta?.order_accept_status ?? null,
      total_qty: 0,
      order_count: 0,
      item_ids: [],
      buyers: [],
      variants: [],
    };

    existing.total_qty += it.quantity;
    existing.item_ids.push(it.id);
    existing.buyers.push({
      order_id: it.order_id,
      name: it.order?.name ?? "",
      phone: it.order?.phone1 ?? "",
      qty: it.quantity,
      unit_price: it.price,
      total_price: it.price * it.quantity,
    });

    map.set(key, existing);

    const calcProductId = it.product_id ?? fallbackProduct?.id ?? null;
    if (calcProductId) {
      const productId = calcProductId;
      const qty = it.quantity;
      const confirmedVariantId = (it as any)?.variant_id ? Number((it as any).variant_id) : null;
      if (confirmedVariantId) {
        const k = `${productId}|${confirmedVariantId}`;
        confirmedMap.set(k, (confirmedMap.get(k) ?? 0) + qty);
      } else {
        let inferredVariantId: number | null = null;
        const normImage = normalizeImage(it.image_url ?? null);
        if (normImage) {
          const candidates = variantImageIndex.get(productId)?.get(normImage) ?? [];
          if (candidates.length === 1) {
            inferredVariantId = candidates[0];
          }
        }
        if (!inferredVariantId && it.price != null) {
          const candidates = variantPriceIndex.get(productId)?.get(Number(it.price)) ?? [];
          if (candidates.length === 1) {
            inferredVariantId = candidates[0];
          }
        }
        if (inferredVariantId) {
          const k = `${productId}|${inferredVariantId}`;
          inferredMap.set(k, (inferredMap.get(k) ?? 0) + qty);
        }
      }
    }
  }

  const result = Array.from(map.values()).map((g) => {
    const productId = g.product_id ?? productByName.get(String(g.product_name || "").trim().toLowerCase())?.id ?? null;
    if (!productId) {
      return { ...g, order_count: g.buyers.length, variants: [] };
    }
    const productMeta = productMap.get(productId) ?? null;
    const hasDuration = Number(productMeta?.duration_hours || 0) > 0;
    const durationHours = Number(productMeta?.duration_hours || 0);
    const endMs =
      productMeta?.created_at && hasDuration
        ? new Date(productMeta.created_at).getTime() + durationHours * 60 * 60 * 1000
        : null;
    const expired = endMs ? endMs <= Date.now() : false;
    const productClosed = productMeta?.order_accept_status === "CLOSED" || expired;
    const variants = productMap.get(productId)?.variants ?? [];
    const computedAll = variants.map((v: any) => {
      const confirmed = confirmedMap.get(`${productId}|${v.id}`) ?? 0;
      const inferred = inferredMap.get(`${productId}|${v.id}`) ?? 0;
      const ordered = confirmed + inferred;
      const stock = v.stock != null ? Number(v.stock) : null;
      const remaining = stock != null ? Math.max(0, stock - ordered) : null;
      const variantStatusClosed = v.order_accept_status === "CLOSED";
      return {
        variant_id: v.id,
        label: getVariantLabel(v),
        stock,
        ordered_qty: ordered,
        remaining_qty: remaining,
        closed:
          productClosed ||
          variantStatusClosed ||
          (stock != null && remaining != null ? remaining <= 0 : false),
      };
    });

    const list = openOnly
      ? computedAll
      : closedOnly
      ? computedAll.filter((v) => v.closed)
      : computedAll.filter((v) => v.ordered_qty > 0);

    const variantStockSum = computedAll.reduce((sum, v) => sum + Math.max(0, Number(v.stock || 0)), 0);
    const productStockRaw = productMeta?.stock != null ? Number(productMeta.stock) : null;
    const effectiveStock =
      productStockRaw != null && productStockRaw > 0
        ? productStockRaw
        : variantStockSum > 0
        ? variantStockSum
        : null;
    const orderedForClose = Number(productMeta?.ordered_qty ?? g.total_qty ?? 0);
    const remainingForClose =
      effectiveStock != null && effectiveStock > 0 ? Math.max(0, effectiveStock - orderedForClose) : null;
    const allVariantsClosed = computedAll.length > 0 ? computedAll.every((v) => v.closed) : false;
    const closedByStock = remainingForClose != null ? remainingForClose <= 0 : false;
    const isClosedItem = productClosed || closedByStock || allVariantsClosed;

    // When `openOnly=true`, return only products that are still accepting orders.
    if (openOnly) {
      if (isClosedItem) return null;
      if (computedAll.length > 0 && !computedAll.some((v) => !v.closed)) return null;
    }

    // When `closedOnly=true`, return only products that are already closed.
    if (closedOnly) {
      // Include products that have at least one closed/finished variant as well.
      if (!isClosedItem && !computedAll.some((v) => v.closed)) return null;
    }

    return { ...g, order_count: g.buyers.length, variants: list };
  });

  return NextResponse.json({ items: result.filter(Boolean) });
}
