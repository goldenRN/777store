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
  arrived_qty: true,
  arrival_status: true,
  cargo_fee: true,
  cargo_note: true,
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
      arrived_qty: true,
      cargo_fee: true,
      cargo_note: true,
      order_accept_status: true,
      images: {
        orderBy: { id: "asc" },
        take: 1,
        select: { image_url: true },
      },
    },
  },
});

type SummaryProduct = Prisma.AdminProductGetPayload<{ select: typeof productSelect }>;

type SummaryVariant = {
  variant_id: number;
  label: string;
  stock: number | null;
  ordered_qty: number;
  pending_qty: number;
  handed_qty: number;
  delivery_qty: number;
  arrived_qty: number | null;
  remaining_qty: number | null;
  cargo_fee: number | null;
  cargo_note: string | null;
  arrived: boolean;
  closed: boolean;
  buyers: SummaryBuyer[];
};

type SummaryBuyer = {
  order_id: number;
  name: string;
  phone: string;
  qty: number;
  unit_price: number;
  total_price: number;
  status: string | null;
  received: boolean;
};

type SummaryGroup = {
  product_id: number | null;
  product_name: string;
  product_description: string;
  image_url: string | null;
  product_stock: number | null;
  product_ordered_qty: number | null;
  handed_qty: number;
  delivery_qty: number;
  arrived_qty: number | null;
  arrival_status: string | null;
  cargo_fee: number | null;
  cargo_note: string | null;
  order_accept_status: string | null;
  total_qty: number;
  pending_qty: number;
  order_count: number;
  item_ids: number[];
  buyers: SummaryBuyer[];
  variants: SummaryVariant[];
  all_variants_arrived?: boolean;
  uniform_variant_cargo?: boolean;
};

function normalizeStatus(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isHandedStatus(value?: string | null) {
  const normalized = normalizeStatus(value);
  return normalized.includes("олгосон") || normalized.includes("pickup") || normalized.includes("picked");
}

function isDeliveryTakenStatus(value?: string | null) {
  const normalized = normalizeStatus(value);
  return (
    normalized.includes("хүргэгд") ||
    normalized.includes("delivered") ||
    normalized.includes("completed")
  );
}

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

function resolveVariantId(params: {
  productId: number;
  variantId?: number | null;
  imageUrl?: string | null;
  price?: number | null;
  variantImageIndex: Map<number, Map<string, number[]>>;
  variantPriceIndex: Map<number, Map<number, number[]>>;
}) {
  if (params.variantId) return Number(params.variantId);

  const normalizedImage = normalizeImage(params.imageUrl ?? null);
  if (normalizedImage) {
    const candidates = params.variantImageIndex.get(params.productId)?.get(normalizedImage) ?? [];
    if (candidates.length === 1) return candidates[0];
  }

  if (params.price != null) {
    const candidates = params.variantPriceIndex.get(params.productId)?.get(Number(params.price)) ?? [];
    if (candidates.length === 1) return candidates[0];
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let status = (searchParams.get("status") ?? "").trim();
  const itemStatus = (searchParams.get("itemStatus") ?? "").trim();
  const payment = (searchParams.get("payment") ?? "PAID").trim().toUpperCase();
  const excludeArrived = searchParams.get("excludeArrived") === "true";
  const openOnly = searchParams.get("openOnly") === "true";
  const closedOnly = searchParams.get("closedOnly") === "true";
  const arrivedOnly = itemStatus === "Бараа ирсэн" || status === "Бараа ирсэн";

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
  if (status && !itemStatus && !arrivedOnly) {
    whereOrder.status = status;
  }

  const items = await prisma.adminOrderItem.findMany({
    where: {
      order: whereOrder,
      ...(arrivedOnly
        ? {}
        : itemStatus
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
  if (arrivedOnly) {
    productWhereOr.push({ arrival_status: "Бараа ирсэн" });
    productWhereOr.push({ variants: { some: { arrived_qty: { not: null } } } });
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
        arrived_qty: product.arrived_qty ?? null,
        arrival_status: product.arrival_status ?? null,
        cargo_fee: product.cargo_fee ?? null,
        cargo_note: product.cargo_note ?? null,
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
  const handedByProduct = new Map<number, number>();
  const deliveryByProduct = new Map<number, number>();
  const totalOrderedByVariant = new Map<string, number>();
  const handedByVariant = new Map<string, number>();
  const deliveryByVariant = new Map<string, number>();
  const buyersByProduct = new Map<number, SummaryBuyer[]>();
  const buyersByVariant = new Map<string, SummaryBuyer[]>();
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

  if (productIds.length > 0) {
    const fulfilledItems = await prisma.adminOrderItem.findMany({
      where: {
        product_id: { in: productIds },
        order: {
          deleted_at: null,
          payment_status: "PAID",
        },
      },
      select: {
        order_id: true,
        product_id: true,
        variant_id: true,
        price: true,
        quantity: true,
        image_url: true,
        status: true,
        order: {
          select: {
            name: true,
            phone1: true,
          },
        },
      },
    });

    for (const item of fulfilledItems) {
      if (!item.product_id) continue;
      const qty = Math.max(0, Number(item.quantity || 0));
      if (qty <= 0) continue;
      const resolvedVariantId = resolveVariantId({
        productId: item.product_id,
        variantId: item.variant_id,
        imageUrl: item.image_url,
        price: item.price,
        variantImageIndex,
        variantPriceIndex,
      });
      const variantKey = resolvedVariantId ? `${item.product_id}|${resolvedVariantId}` : null;
      const buyer: SummaryBuyer = {
        order_id: item.order_id,
        name: item.order?.name ?? "",
        phone: item.order?.phone1 ?? "",
        qty: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        status: item.status ?? null,
        received: isHandedStatus(item.status) || isDeliveryTakenStatus(item.status),
      };

      if (variantKey) {
        totalOrderedByVariant.set(variantKey, (totalOrderedByVariant.get(variantKey) ?? 0) + qty);
      }

      if (isHandedStatus(item.status)) {
        handedByProduct.set(item.product_id, (handedByProduct.get(item.product_id) ?? 0) + qty);
        if (variantKey) handedByVariant.set(variantKey, (handedByVariant.get(variantKey) ?? 0) + qty);
      } else if (isDeliveryTakenStatus(item.status)) {
        deliveryByProduct.set(item.product_id, (deliveryByProduct.get(item.product_id) ?? 0) + qty);
        if (variantKey) deliveryByVariant.set(variantKey, (deliveryByVariant.get(variantKey) ?? 0) + qty);
      }

      const list = buyersByProduct.get(item.product_id) ?? [];
      list.push(buyer);
      buyersByProduct.set(item.product_id, list);

      if (variantKey) {
        const variantBuyers = buyersByVariant.get(variantKey) ?? [];
        variantBuyers.push(buyer);
        buyersByVariant.set(variantKey, variantBuyers);
      }
    }
  }

  const confirmedMap = new Map<string, number>();
  const inferredMap = new Map<string, number>();
  const grouped = new Map<string, SummaryGroup>();

  for (const item of items) {
    const key = item.product_id ? `p:${item.product_id}` : `n:${item.product_name}`;
    const nameKey = String(item.product_name || "").trim().toLowerCase();
    const fallbackProduct = !item.product_id && nameKey ? productByName.get(nameKey) : null;
    const resolvedProductId = item.product_id ?? fallbackProduct?.id ?? null;
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
      handed_qty: resolvedProductId ? handedByProduct.get(resolvedProductId) ?? 0 : 0,
      delivery_qty: resolvedProductId ? deliveryByProduct.get(resolvedProductId) ?? 0 : 0,
      arrived_qty: productMeta?.arrived_qty ?? null,
      arrival_status: productMeta?.arrival_status ?? null,
      cargo_fee: productMeta?.cargo_fee ?? null,
      cargo_note: productMeta?.cargo_note ?? null,
      order_accept_status: productMeta?.order_accept_status ?? null,
      total_qty: 0,
      pending_qty: 0,
      order_count: 0,
      item_ids: [],
      buyers: [],
      variants: [],
    };

    current.total_qty += item.quantity;
    current.pending_qty += item.quantity;
    current.item_ids.push(item.id);
    current.buyers.push({
      order_id: item.order_id,
      name: item.order?.name ?? "",
      phone: item.order?.phone1 ?? "",
      qty: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      status: item.status ?? null,
      received: isHandedStatus(item.status) || isDeliveryTakenStatus(item.status),
    });
    grouped.set(key, current);

    const productId = resolvedProductId;
    if (!productId) continue;

    const qty = item.quantity;
    const confirmedVariantId = resolveVariantId({
      productId,
      variantId: item.variant_id,
      imageUrl: item.image_url,
      price: item.price,
      variantImageIndex,
      variantPriceIndex,
    });
    if (confirmedVariantId) {
      const mapKey = `${productId}|${confirmedVariantId}`;
      confirmedMap.set(mapKey, (confirmedMap.get(mapKey) ?? 0) + qty);
      continue;
    }
  }

  if (openOnly || closedOnly || arrivedOnly) {
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
      handed_qty: handedByProduct.get(product.id) ?? 0,
      delivery_qty: deliveryByProduct.get(product.id) ?? 0,
      arrived_qty: productMeta?.arrived_qty ?? product.arrived_qty ?? null,
        arrival_status: productMeta?.arrival_status ?? product.arrival_status ?? null,
        cargo_fee: productMeta?.cargo_fee ?? product.cargo_fee ?? null,
        cargo_note: productMeta?.cargo_note ?? product.cargo_note ?? null,
        order_accept_status: productMeta?.order_accept_status ?? product.order_accept_status ?? null,
        total_qty: 0,
        pending_qty: 0,
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
        const variantKey = `${productId}|${variant.id}`;
        const confirmed = confirmedMap.get(variantKey) ?? 0;
        const inferred = inferredMap.get(variantKey) ?? 0;
        const pendingOrdered = confirmed + inferred;
        const totalOrdered = totalOrderedByVariant.get(variantKey) ?? 0;
        const ordered = Math.max(totalOrdered, pendingOrdered, Number(variant.ordered_qty ?? 0));
        const stock = variant.stock != null ? Number(variant.stock) : null;
        const remaining = stock != null ? Math.max(0, stock - ordered) : null;
        const variantClosed = variant.order_accept_status === "CLOSED";
        const arrivedQty = variant.arrived_qty != null ? Number(variant.arrived_qty) : null;
        return {
          variant_id: variant.id,
          label: getVariantLabel(variant),
          stock,
          ordered_qty: ordered,
          pending_qty: pendingOrdered,
          handed_qty: handedByVariant.get(variantKey) ?? 0,
          delivery_qty: deliveryByVariant.get(variantKey) ?? 0,
          arrived_qty: arrivedQty,
          remaining_qty: remaining,
          cargo_fee: variant.cargo_fee != null ? Number(variant.cargo_fee) : productMeta?.cargo_fee ?? null,
          cargo_note: variant.cargo_note ?? productMeta?.cargo_note ?? null,
          arrived: arrivedQty != null,
          closed: productClosed || variantClosed || (stock != null && remaining != null ? remaining <= 0 : false),
          buyers: buyersByVariant.get(variantKey) ?? [],
        };
      });

      const allVariantsArrived = computedAll.length > 0 ? computedAll.every((variant) => variant.arrived) : false;
      const uniformVariantCargo =
        allVariantsArrived && computedAll.length > 0
          ? computedAll.every(
              (variant) =>
                Number(variant.cargo_fee ?? 0) === Number(computedAll[0]?.cargo_fee ?? 0) &&
                String(variant.cargo_note ?? "") === String(computedAll[0]?.cargo_note ?? "")
            )
          : false;

      const visibleVariants = openOnly
        ? computedAll
        : closedOnly
          ? computedAll.filter((variant) => variant.closed && !variant.arrived)
          : arrivedOnly
            ? computedAll.filter((variant) => variant.arrived || variant.pending_qty > 0)
            : computedAll.filter((variant) => variant.pending_qty > 0);

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
        if (group.arrival_status === "Бараа ирсэн" || allVariantsArrived) return null;
      }

      if (arrivedOnly) {
        const productArrived = group.arrival_status === "Бараа ирсэн" || group.arrived_qty != null;
        const variantArrived = computedAll.some((variant) => variant.arrived);
        const orderArrived = group.total_qty > 0 || group.order_count > 0;
        if (!productArrived && !variantArrived && !orderArrived) return null;
      }

      const resolvedBuyers = productId ? buyersByProduct.get(productId) ?? group.buyers : group.buyers;

      return {
        ...group,
        total_qty: productMeta?.ordered_qty != null ? Number(productMeta.ordered_qty) : group.total_qty,
        handed_qty: handedByProduct.get(productId) ?? group.handed_qty ?? 0,
        delivery_qty: deliveryByProduct.get(productId) ?? group.delivery_qty ?? 0,
        cargo_fee:
          allVariantsArrived && uniformVariantCargo
            ? computedAll[0]?.cargo_fee ?? group.cargo_fee ?? null
            : group.cargo_fee ?? null,
        cargo_note:
          allVariantsArrived && uniformVariantCargo
            ? computedAll[0]?.cargo_note ?? group.cargo_note ?? null
            : group.cargo_note ?? null,
        arrival_status:
          group.arrival_status === "Бараа ирсэн" || (allVariantsArrived && uniformVariantCargo)
            ? "Бараа ирсэн"
            : group.arrival_status ?? null,
        buyers: resolvedBuyers,
        order_count: resolvedBuyers.length,
        variants: visibleVariants,
        all_variants_arrived: allVariantsArrived,
        uniform_variant_cargo: uniformVariantCargo,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ items: result });
}
