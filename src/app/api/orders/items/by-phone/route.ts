import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = (searchParams.get("phone") ?? "").trim();
  const payment = (searchParams.get("payment") ?? "PAID").trim().toUpperCase();

  if (!phone) {
    return NextResponse.json({ items: [] });
  }

  const whereOrder: Record<string, unknown> = { phone1: phone };
  if (payment === "PAID") {
    whereOrder.payment_status = "PAID";
  } else if (payment === "UNPAID") {
    whereOrder.payment_status = "UNPAID";
  }

  const items = await prisma.adminOrderItem.findMany({
    where: { order: whereOrder },
    include: { order: true },
    orderBy: { id: "desc" },
  });

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

  const productMap = new Map(
    products.map((p) => [
      p.id,
      {
        description: p.description ?? "",
        image_url: p.images?.[0]?.image_url ?? null,
        stock: p.stock ?? null,
        variants: p.variants ?? [],
      },
    ])
  );

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
      total_qty: number;
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
      order_ids: [],
      buyers: [],
      variants_confirmed: [],
      variants_inferred: [],
    };

    existing.total_qty += it.quantity;
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
      const confirmedVariantId = (it as any)?.variant_id ? Number((it as any).variant_id) : null;
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
    if (!productId) return row;
    const variants = productMap.get(productId)?.variants ?? [];
    const byId = variantByProduct.get(productId) ?? new Map();

    const confirmedList = variants.map((v: any) => {
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

    return { ...row, variants_confirmed: confirmedList, variants_inferred: inferredList };
  });

  return NextResponse.json({ items: result });
}
