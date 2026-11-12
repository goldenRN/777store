import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OrderWithItems = Prisma.AdminOrderGetPayload<{
  include: { items: true };
}>;

type OrderItemWithOrder = OrderWithItems["items"][number] & {
  order: OrderWithItems;
};

type ProductWithVariants = Prisma.AdminProductGetPayload<{
  include: {
    images: true;
    variants: { include: { images: true } };
  };
}>;

type VariantWithImages = ProductWithVariants["variants"][number];

type ItemAuditMeta = {
  status: string;
  actor_name: string | null;
  actor_phone: string | null;
  created_at: string | null;
};

const isArrivedStatus = (value?: string | null) => {
  const status = String(value || "").trim().toLowerCase();
  return status.includes("ирсэн") || status.includes("arrived");
};

const isFinalOrderFlowStatus = (value?: string | null) => {
  const status = String(value || "").trim().toLowerCase();
  return (
    status.includes("ирсэн") ||
    status.includes("arrived") ||
    status.includes("хүргэлт") ||
    status.includes("shipping") ||
    status.includes("хүргэгд") ||
    status.includes("delivered") ||
    status.includes("completed") ||
    status.includes("олгосон") ||
    status.includes("handed") ||
    status.includes("буца") ||
    status.includes("return")
  );
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = (searchParams.get("phone") ?? "").trim();
  const payment = (searchParams.get("payment") ?? "PAID").trim().toUpperCase();
  const roleHeader = String(request.headers.get("x-actor-role") ?? "");
  const roleNorm = roleHeader.toUpperCase().replace(/\s+/g, "_");
  const canViewVariants = roleNorm === "SUPER_ADMIN" || roleNorm === "ADMIN";

  if (!phone) {
    return NextResponse.json({ items: [] });
  }

  const whereOrder: Record<string, unknown> = {
    phone1: phone,
  };
  if (payment === "PAID") {
    whereOrder.payment_status = "PAID";
  } else if (payment === "UNPAID") {
    whereOrder.payment_status = "UNPAID";
  }
  whereOrder.deleted_at = null;

  const orders = await prisma.adminOrder.findMany({
    where: whereOrder,
    include: { items: true },
    orderBy: { id: "desc" },
  });

  const items: OrderItemWithOrder[] = orders.flatMap((order) =>
    order.items.map((item) => ({
      ...item,
      order,
    }))
  );

  const itemAuditMap = new Map<number, ItemAuditMeta>();
  if (items.length > 0) {
    const targetItemIds = new Set(items.map((item) => item.id));
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: {
        action: {
          in: ["ORDER_ITEMS_BULK_STATUS", "ORDER_ITEM_DELIVERY_REGISTERED"],
        },
      },
      orderBy: { created_at: "desc" },
      take: 1000,
    });

    for (const log of auditLogs) {
      const details = (log.details ?? {}) as Record<string, unknown>;
      if (log.action === "ORDER_ITEM_DELIVERY_REGISTERED") {
        const itemId = Number(details.item_id ?? log.entity_id ?? "");
        if (!Number.isFinite(itemId) || !targetItemIds.has(itemId) || itemAuditMap.has(itemId)) continue;
        itemAuditMap.set(itemId, {
          status: "Хүргэлтэнд бүртгэгдсэн",
          actor_name: log.actor_name ?? null,
          actor_phone: log.actor_phone ?? null,
          created_at: log.created_at?.toISOString?.() ?? null,
        });
        continue;
      }

      const status = String(details.status ?? "").trim();
      const itemIds = Array.isArray(details.itemIds)
        ? details.itemIds
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && targetItemIds.has(value))
        : [];
      for (const itemId of itemIds) {
        if (itemAuditMap.has(itemId)) continue;
        itemAuditMap.set(itemId, {
          status,
          actor_name: log.actor_name ?? null,
          actor_phone: log.actor_phone ?? null,
          created_at: log.created_at?.toISOString?.() ?? null,
        });
      }
    }
  }

  const productIds = Array.from(
    new Set(items.map((it) => it.product_id).filter((id) => id != null))
  ) as number[];
  const products = await prisma.adminProduct.findMany({
    where: { id: { in: productIds } },
    include: {
      images: true,
      variants: { include: { images: true } },
    },
  });
  const normalizeImage = (url?: string | null) => {
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
  };

  const getVariantLabel = (variant: { sku: string | null; attribute: Prisma.JsonValue | null; id: number }) => {
    const attr =
      variant.attribute && typeof variant.attribute === "object"
        ? (variant.attribute as Record<string, unknown>)
        : {};
    const type = typeof attr.type === "string" ? attr.type : "";
    const color = typeof attr.color === "string" ? attr.color : "";
    const size = typeof attr.size === "string" ? attr.size : "";
    const merged = [type, color, size].filter(Boolean).join(" / ");
    return merged || variant.sku || `Төрөл-${variant.id}`;
  };

  const productMap = new Map(
    products.map((p) => [
      p.id,
      {
        description: p.description ?? "",
        image_url: p.images?.[0]?.image_url ?? null,
        stock: p.stock ?? null,
        arrival_status: p.arrival_status ?? null,
        cargo_fee: p.cargo_fee ?? null,
        variants: p.variants ?? [],
      },
    ])
  );

  const variantByProduct = new Map<number, Map<number, VariantWithImages>>();
  const variantImageIndex = new Map<number, Map<string, number[]>>();
  const variantPriceIndex = new Map<number, Map<number, number[]>>();

  for (const p of products) {
    const byId = new Map<number, VariantWithImages>();
    const byImage = new Map<string, number[]>();
    const byPrice = new Map<number, number[]>();
    for (const v of p.variants || []) {
      byId.set(v.id, v);
      if (v.price != null) {
        const price = Number(v.price);
        if (!byPrice.has(price)) byPrice.set(price, []);
        byPrice.get(price)!.push(v.id);
      }
      for (const img of v.images || []) {
        const norm = normalizeImage(img.image_url);
        if (!norm) continue;
        if (!byImage.has(norm)) byImage.set(norm, []);
        byImage.get(norm)!.push(v.id);
      }
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
      total_qty: number;
      item_ids: number[];
      order_ids: number[];
      buyers: { order_id: number; name: string; phone: string; qty: number; order_status: string }[];
      variants_confirmed: {
        variant_id: number;
        label: string;
        stock: number | null;
        ordered_qty: number;
        remaining_qty: number | null;
      }[];
      variants_inferred: {
        variant_id: number;
        label: string;
        stock: number | null;
        inferred_qty: number;
        remaining_after_inferred: number | null;
        inferred_by: "image" | "price";
      }[];
    }
  >();

  for (const it of items) {
    const key = it.product_id ? `p:${it.product_id}` : `n:${it.product_name}`;
    const productMeta = it.product_id ? productMap.get(it.product_id) : null;
    const existing = map.get(key) ?? {
      product_id: it.product_id ?? null,
      product_name: it.product_name,
      product_description: productMeta?.description ?? "",
      image_url: productMeta?.image_url ?? it.image_url ?? null,
      total_qty: 0,
      item_ids: [],
      order_ids: [],
      buyers: [],
      variants_confirmed: [],
      variants_inferred: [],
    };

    existing.total_qty += it.quantity;
    if (!existing.item_ids.includes(it.id)) {
      existing.item_ids.push(it.id);
    }
    if (!existing.order_ids.includes(it.order_id)) {
      existing.order_ids.push(it.order_id);
    }
    existing.buyers.push({
      order_id: it.order_id,
      name: it.order?.name ?? "",
      phone: it.order?.phone1 ?? "",
      qty: it.quantity,
      order_status: it.order?.status ?? "",
    });

    map.set(key, existing);

    if (it.product_id) {
      const productId = it.product_id;
      const qty = it.quantity;
      const confirmedVariantId = it.variant_id ? Number(it.variant_id) : null;
      if (confirmedVariantId) {
        const k = `${productId}|${confirmedVariantId}`;
        confirmedMap.set(k, (confirmedMap.get(k) ?? 0) + qty);
      } else {
        let inferredVariantId: number | null = null;
        let inferredBy: "image" | "price" | null = null;
        const normImage = normalizeImage(it.image_url ?? null);
        if (normImage) {
          const candidates = variantImageIndex.get(productId)?.get(normImage) ?? [];
          if (candidates.length === 1) {
            inferredVariantId = candidates[0];
            inferredBy = "image";
          }
        }
        if (!inferredVariantId && it.price != null) {
          const candidates = variantPriceIndex.get(productId)?.get(Number(it.price)) ?? [];
          if (candidates.length === 1) {
            inferredVariantId = candidates[0];
            inferredBy = "price";
          }
        }
        if (inferredVariantId) {
          const k = `${productId}|${inferredVariantId}|${inferredBy}`;
          inferredMap.set(k, (inferredMap.get(k) ?? 0) + qty);
        }
      }
    }
  }

  const result = Array.from(map.values()).map((row) => {
    const productId = row.product_id;
    if (!productId) {
      return canViewVariants
        ? row
        : { ...row, variants_confirmed: [], variants_inferred: [] };
    }
    const variants = productMap.get(productId)?.variants ?? [];
    const byId = variantByProduct.get(productId) ?? new Map();

    const confirmedList = variants.map((v) => {
      const ordered = confirmedMap.get(`${productId}|${v.id}`) ?? 0;
      const stock = v.stock != null ? Number(v.stock) : null;
      const remaining = stock != null ? Math.max(0, stock - ordered) : null;
      return {
        variant_id: v.id,
        label: getVariantLabel(v),
        stock,
        ordered_qty: ordered,
        remaining_qty: remaining,
      };
    });

    const inferredList: {
      variant_id: number;
      label: string;
      stock: number | null;
      inferred_qty: number;
      remaining_after_inferred: number | null;
      inferred_by: "image" | "price";
    }[] = [];
    for (const [key, qty] of inferredMap.entries()) {
      const [pId, vId, method] = key.split("|");
      if (Number(pId) !== productId) continue;
      const v = byId.get(Number(vId));
      if (!v) continue;
      const stock = v.stock != null ? Number(v.stock) : null;
      const confirmedQty = confirmedMap.get(`${productId}|${v.id}`) ?? 0;
      const remainingAfter =
        stock != null ? Math.max(0, stock - confirmedQty - qty) : null;
      inferredList.push({
        variant_id: v.id,
        label: getVariantLabel(v),
        stock,
        inferred_qty: qty,
        remaining_after_inferred: remainingAfter,
        inferred_by: method === "image" ? "image" : "price",
      });
    }

    const payload = { ...row, variants_confirmed: confirmedList, variants_inferred: inferredList };
    return canViewVariants ? payload : { ...payload, variants_confirmed: [], variants_inferred: [] };
  });

  const rawItems = items.map((it) => {
    const productMeta = it.product_id ? productMap.get(it.product_id) : null;
    const productId = it.product_id ?? null;
    const byId = productId
      ? variantByProduct.get(productId) ?? new Map<number, VariantWithImages>()
      : new Map<number, VariantWithImages>();
    const confirmedVariantId = it.variant_id ? Number(it.variant_id) : null;

    let variantLabel: string | null = null;
    let variantConfirmed = false;
    let inferredBy: "image" | "price" | null = null;
    let matchedVariant: VariantWithImages | null = null;

    if (confirmedVariantId && byId.has(confirmedVariantId)) {
      matchedVariant = byId.get(confirmedVariantId) ?? null;
      if (matchedVariant) {
        variantLabel = getVariantLabel(matchedVariant);
      }
      variantConfirmed = true;
    } else if (productId) {
      const normImage = normalizeImage(it.image_url ?? null);
      if (normImage) {
        const candidates = variantImageIndex.get(productId)?.get(normImage) ?? [];
        if (candidates.length === 1 && byId.has(candidates[0])) {
          matchedVariant = byId.get(candidates[0]) ?? null;
          if (matchedVariant) {
            variantLabel = getVariantLabel(matchedVariant);
          }
          inferredBy = "image";
        }
      }
      if (!variantLabel && it.price != null) {
        const candidates = variantPriceIndex.get(productId)?.get(Number(it.price)) ?? [];
        if (candidates.length === 1 && byId.has(candidates[0])) {
          matchedVariant = byId.get(candidates[0]) ?? null;
          if (matchedVariant) {
            variantLabel = getVariantLabel(matchedVariant);
          }
          inferredBy = "price";
        }
      }
    }

    const explicitStatus = String(it.status ?? "").trim();
    let effectiveItemStatus = explicitStatus;
    if (!isFinalOrderFlowStatus(explicitStatus)) {
      if (matchedVariant?.arrived_qty != null) {
        effectiveItemStatus = "Бараа ирсэн";
      } else if (isArrivedStatus(productMeta?.arrival_status)) {
        effectiveItemStatus = "Бараа ирсэн";
      } else if (isArrivedStatus(it.order?.status ?? "")) {
        effectiveItemStatus = "Бараа ирсэн";
      }
    }

    const cargoFee = Number(matchedVariant?.cargo_fee ?? productMeta?.cargo_fee ?? 0);
    const auditMeta = itemAuditMap.get(it.id);

    return {
      item_id: it.id,
      order_id: it.order_id,
      product_id: it.product_id ?? null,
      product_name: it.product_name,
      product_description: productMeta?.description ?? "",
      // The variant image is the most precise match for fulfillment; fall back for legacy items.
      image_url: matchedVariant?.images?.[0]?.image_url ?? it.image_url ?? productMeta?.image_url ?? null,
      qty: it.quantity,
      unit_price: it.price,
      order_status: it.order?.status ?? "",
      item_status: effectiveItemStatus,
      buyer_name: it.order?.name ?? "",
      buyer_phone: it.order?.phone1 ?? "",
      created_at: it.order?.created_at ?? null,
      cargo_fee: cargoFee,
      delivery_method: it.delivery_method ?? null,
      delivery_paid: Boolean(it.qpay_payment_id || it.delivery_paid_at),
      last_action_status: auditMeta?.status ?? null,
      last_actor_name: auditMeta?.actor_name ?? null,
      last_actor_phone: auditMeta?.actor_phone ?? null,
      last_action_at: auditMeta?.created_at ?? null,
      variant_label: variantLabel,
      variant_confirmed: variantConfirmed,
      inferred_by: inferredBy,
    };
  });

  return NextResponse.json({ items: result, raw_items: rawItems, can_view_variants: canViewVariants });
}
