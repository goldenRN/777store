import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const isArrivedStatus = (value?: string | null) => {
  const status = String(value || "").trim().toLowerCase();
  return status.includes("ирсэн") || status.includes("arrived");
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const resolved = await params;
  const id = Number(resolved.id);

  if (!userId || !id) {
    return NextResponse.json({ message: "userId болон id шаардлагатай" }, { status: 400 });
  }

  const order = await prisma.adminOrder.findFirst({
    where: { id, user_id: userId, payment_status: "PAID" },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const items = order.items;
  const productIds = Array.from(
    new Set(items.map((it) => it.product_id).filter((pid) => pid != null))
  ) as number[];
  const products = await prisma.adminProduct.findMany({
    where: { id: { in: productIds } },
    include: { variants: { include: { images: true } } },
  });
  const productCargoFeeById = new Map<number, number>(
    products.map((p) => [p.id, Number(p.cargo_fee ?? 0)])
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

  const getEffectiveItemStatus = (item: any) => {
    const explicitStatus = String(item.status ?? "").trim();
    const explicitStatusNorm = explicitStatus.toLowerCase();
    if (isArrivedStatus(explicitStatus)) return "Бараа ирсэн";
    if (
      explicitStatusNorm.includes("хүргэлт") ||
      explicitStatusNorm.includes("shipping") ||
      explicitStatusNorm.includes("олгосон") ||
      explicitStatusNorm.includes("handed") ||
      explicitStatusNorm.includes("буца") ||
      explicitStatusNorm.includes("return")
    ) {
      return explicitStatus;
    }

    const productId = item.product_id ?? null;
    if (productId) {
      const byId = variantByProduct.get(productId) ?? new Map();
      const confirmedId = (item as any)?.variant_id ? Number((item as any).variant_id) : null;
      if (confirmedId && byId.has(confirmedId) && byId.get(confirmedId)?.arrived_qty != null) {
        return "Бараа ирсэн";
      }
      const normImage = normalizeImage(item.image_url ?? null);
      if (normImage) {
        const candidates = variantImageIndex.get(productId)?.get(normImage) ?? [];
        if (candidates.length === 1 && byId.has(candidates[0]) && byId.get(candidates[0])?.arrived_qty != null) {
          return "Бараа ирсэн";
        }
      }
      if (item.price != null) {
        const candidates = variantPriceIndex.get(productId)?.get(Number(item.price)) ?? [];
        if (candidates.length === 1 && byId.has(candidates[0]) && byId.get(candidates[0])?.arrived_qty != null) {
          return "Бараа ирсэн";
        }
      }
    }

    const product = productId ? products.find((p) => p.id === productId) : null;
    if (isArrivedStatus(product?.arrival_status)) return "Бараа ирсэн";
    if (isArrivedStatus(order.status)) return "Бараа ирсэн";
    return explicitStatus;
  };

  return NextResponse.json({
    id: order.id,
    status: order.status,
    total: order.total,
    createdAt: order.created_at,
    order_kind: order.order_kind ?? null,
    delivery_method: order.delivery_method ?? null,
    delivery_name: order.delivery_name ?? null,
    delivery_phone: order.delivery_phone ?? null,
    delivery_address: order.delivery_address ?? null,
    delivery_district_id: order.delivery_district_id ?? null,
    delivery_district_name: order.delivery_district_name ?? null,
    delivery_khoroo_id: order.delivery_khoroo_id ?? null,
    delivery_khoroo_name: order.delivery_khoroo_name ?? null,
    delivery_zone: order.delivery_zone ?? null,
    delivery_fee: order.delivery_fee ?? 0,
    items: order.items.map((it) => ({
      id: it.id,
      qty: it.quantity,
      unitPrice: it.price,
      productName: it.product_name,
      productImage: it.image_url ?? null,
      variantLabel: (() => {
        const productId = it.product_id ?? null;
        if (!productId) return null;
        const byId = variantByProduct.get(productId) ?? new Map();
        const confirmedId = (it as any)?.variant_id ? Number((it as any).variant_id) : null;
        if (confirmedId && byId.has(confirmedId)) {
          return { label: getVariantLabel(byId.get(confirmedId)), inferredBy: null, confirmed: true };
        }
        const normImage = normalizeImage(it.image_url ?? null);
        if (normImage) {
          const candidates = variantImageIndex.get(productId)?.get(normImage) ?? [];
          if (candidates.length === 1 && byId.has(candidates[0])) {
            return { label: getVariantLabel(byId.get(candidates[0])), inferredBy: "image", confirmed: false };
          }
        }
        if (it.price != null) {
          const candidates = variantPriceIndex.get(productId)?.get(Number(it.price)) ?? [];
          if (candidates.length === 1 && byId.has(candidates[0])) {
            return { label: getVariantLabel(byId.get(candidates[0])), inferredBy: "price", confirmed: false };
          }
        }
        return null;
      })(),
      cargoFee: (() => {
        const productId = it.product_id ?? null;
        if (!productId) return 0;
        const byId = variantByProduct.get(productId) ?? new Map();
        const confirmedId = (it as any)?.variant_id ? Number((it as any).variant_id) : null;
        if (confirmedId && byId.has(confirmedId)) {
          return Number(byId.get(confirmedId)?.cargo_fee ?? productCargoFeeById.get(productId) ?? 0);
        }
        const normImage = normalizeImage(it.image_url ?? null);
        if (normImage) {
          const candidates = variantImageIndex.get(productId)?.get(normImage) ?? [];
          if (candidates.length === 1 && byId.has(candidates[0])) {
            return Number(byId.get(candidates[0])?.cargo_fee ?? productCargoFeeById.get(productId) ?? 0);
          }
        }
        if (it.price != null) {
          const candidates = variantPriceIndex.get(productId)?.get(Number(it.price)) ?? [];
          if (candidates.length === 1 && byId.has(candidates[0])) {
            return Number(byId.get(candidates[0])?.cargo_fee ?? productCargoFeeById.get(productId) ?? 0);
          }
        }
        return Number(productCargoFeeById.get(productId) ?? 0);
      })(),
      status: getEffectiveItemStatus(it) || null,
    })),
  });
}
