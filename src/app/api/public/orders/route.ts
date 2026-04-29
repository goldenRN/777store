import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/qpay";
import { getBulkUnitPrice } from "@/lib/bulkPricing";

const isArrivedStatus = (value?: string | null) => {
  const status = String(value || "").trim().toLowerCase();
  return status.includes("ирсэн") || status.includes("arrived");
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");

  if (!userId) {
    return NextResponse.json({ message: "userId шаардлагатай" }, { status: 400 });
  }

  const where: Record<string, unknown> = { user_id: userId, payment_status: "PAID" };
  if (status && status !== "ALL") {
    where.status = status;
  }

  const orders = await prisma.adminOrder.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      items: true,
    },
  });

  const allItems = orders.flatMap((o) => o.items);
  const productIds = Array.from(
    new Set(allItems.map((it) => it.product_id).filter((id) => id != null))
  ) as number[];

  const products = await prisma.adminProduct.findMany({
    where: { id: { in: productIds } },
    include: { variants: { include: { images: true } } },
  });
  const productMap = new Map(products.map((product) => [product.id, product]));
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

  const getEffectiveItemStatus = (orderStatus: string | null | undefined, item: any) => {
    const explicitStatus = String(item.status ?? "").trim();
    const explicitStatusNorm = explicitStatus.toLowerCase();
    if (isArrivedStatus(explicitStatus)) return "Бараа ирсэн";
    if (explicitStatusNorm.includes("хүргэлт") || explicitStatusNorm.includes("shipping")) return explicitStatus;
    if (
      explicitStatusNorm.includes("олгосон") ||
      explicitStatusNorm.includes("handed") ||
      explicitStatusNorm.includes("буца") ||
      explicitStatusNorm.includes("return")
    ) {
      return explicitStatus;
    }

    const productId = item.product_id ?? null;
    if (!productId) return explicitStatus;
    const byId = variantByProduct.get(productId) ?? new Map();
    const confirmedId = (item as any)?.variant_id ? Number((item as any).variant_id) : null;
    const directVariant = confirmedId && byId.has(confirmedId) ? byId.get(confirmedId) : null;
    if (directVariant?.arrived_qty != null) return "Бараа ирсэн";

    const normImage = normalizeImage(item.image_url ?? null);
    if (normImage) {
      const candidates = variantImageIndex.get(productId)?.get(normImage) ?? [];
      if (candidates.length === 1 && byId.has(candidates[0])) {
        const inferred = byId.get(candidates[0]);
        if (inferred?.arrived_qty != null) return "Бараа ирсэн";
      }
    }

    if (item.price != null) {
      const candidates = variantPriceIndex.get(productId)?.get(Number(item.price)) ?? [];
      if (candidates.length === 1 && byId.has(candidates[0])) {
        const inferred = byId.get(candidates[0]);
        if (inferred?.arrived_qty != null) return "Бараа ирсэн";
      }
    }

    const product = productMap.get(productId);
    if (isArrivedStatus(product?.arrival_status)) return "Бараа ирсэн";
    if (isArrivedStatus(orderStatus)) return "Бараа ирсэн";
    return explicitStatus;
  };

  const mapped = orders.map((o) => ({
    id: o.id,
    status: o.status,
    total: o.total,
    createdAt: o.created_at,
    delivery_method: o.delivery_method ?? null,
    delivery_name: o.delivery_name ?? null,
    delivery_phone: o.delivery_phone ?? null,
    delivery_address: o.delivery_address ?? null,
    delivery_district_id: o.delivery_district_id ?? null,
    delivery_fee: o.delivery_fee ?? 0,
    delivery_district_name: o.delivery_district_name ?? null,
    delivery_khoroo_id: o.delivery_khoroo_id ?? null,
    delivery_khoroo_name: o.delivery_khoroo_name ?? null,
    delivery_zone: o.delivery_zone ?? null,
    items: o.items.map((it) => ({
      id: it.id,
      qty: it.quantity,
      unitPrice: it.price,
      productId: it.product_id ?? null,
      productName: it.product_name,
      productImage: it.image_url ?? null,
      delivery_method: it.delivery_method ?? null,
      delivery_name: it.delivery_name ?? null,
      delivery_phone: it.delivery_phone ?? null,
      delivery_address: it.delivery_address ?? null,
      delivery_district_id: it.delivery_district_id ?? null,
      delivery_district_name: it.delivery_district_name ?? null,
      delivery_khoroo_id: it.delivery_khoroo_id ?? null,
      delivery_khoroo_name: it.delivery_khoroo_name ?? null,
      delivery_zone: it.delivery_zone ?? null,
      delivery_fee: it.delivery_fee ?? 0,
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
      return_note: it.return_note ?? null,
      status: getEffectiveItemStatus(o.status, it) || null,
    })),
  }));

  return NextResponse.json({ items: mapped });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = String(body?.userId ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const items = Array.isArray(body?.items) ? body.items : [];
  const orderKindInput = String(body?.orderKind ?? "").trim();
  const deliveryMethod = body?.deliveryMethod ? String(body.deliveryMethod) : null;
  const deliveryName = body?.deliveryName ? String(body.deliveryName) : null;
  const deliveryPhone = body?.deliveryPhone ? String(body.deliveryPhone) : null;
  const deliveryAddress = body?.deliveryAddress ? String(body.deliveryAddress) : null;
  const deliveryDistrictIdRaw = body?.deliveryDistrictId;
  const deliveryKhorooIdRaw = body?.deliveryKhorooId;
  const deliveryDistrictId =
    deliveryDistrictIdRaw != null && String(deliveryDistrictIdRaw).trim() !== ""
      ? Number(deliveryDistrictIdRaw)
      : null;
  const deliveryKhorooId =
    deliveryKhorooIdRaw != null && String(deliveryKhorooIdRaw).trim() !== ""
      ? Number(deliveryKhorooIdRaw)
      : null;

  if (!userId || !name || !phone) {
    return NextResponse.json({ message: "userId, нэр, утас шаардлагатай" }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ message: "Сагс хоосон байна" }, { status: 400 });
  }

  const now = new Date();
  const reserveMinutesRaw = Number(process.env.QPAY_INVOICE_EXPIRE_MINUTES ?? 60);
  const reserveMinutes = Number.isFinite(reserveMinutesRaw) ? Math.max(1, reserveMinutesRaw) : 60;
  const reserveWindowStart = new Date(now.getTime() - reserveMinutes * 60 * 1000);

  const normalizeType = (name?: string | null) => {
    const t = (name || "").toLowerCase();
    if (t.includes("захиал") || t.includes("preorder") || t.includes("урьдчил")) return "preorder";
    if (t.includes("лайв") || t.includes("live")) return "preorder";
    if (t.includes("бэлэн") || t.includes("ready")) return "ready";
    return "";
  };
  const hasPreorder = items.some((it: any) => normalizeType(it.type_name) === "preorder");
  const computedOrderKind = hasPreorder ? "preorder" : "ready";
  // We will re-check orderKind based on DB product types inside the transaction,
  // but keep this initial value as a fallback for early validation.
  const orderKind = orderKindInput || computedOrderKind;

  // Allow delivery if there is at least one READY item in the cart.
  // (We'll validate again inside transaction using DB product types.)
  const hasReadyInput = items.some((it: any) => normalizeType(it.type_name) !== "preorder");
  if (deliveryMethod === "delivery" && hasReadyInput) {
    if (!deliveryName || !deliveryPhone || !deliveryAddress) {
      return NextResponse.json(
        { message: "Хүргэлтийн нэр, утас, хаяг шаардлагатай" },
        { status: 400 }
      );
    }
    if (!deliveryDistrictId || !deliveryKhorooId) {
      return NextResponse.json({ message: "Дүүрэг, хороо сонгоно уу." }, { status: 400 });
    }
  } else if (deliveryMethod === "delivery" && !hasReadyInput) {
    return NextResponse.json(
      { message: "Зөвхөн бэлэн бараатай үед хүргэлт сонгож болно." },
      { status: 400 }
    );
  }

  const firstStatus = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
  const defaultStatus = firstStatus?.name || "pending";

  class CheckoutError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }

  // Validate and create in a transaction (locks prevent oversell on concurrent checkouts).
  const created = await (async () => {
    try {
      return await prisma.$transaction(async (tx) => {
        type CartLine = {
          productId: number;
          variantId: number | null;
          qty: number;
          clientName: string;
          clientImageUrl: string | null;
        };

        const cartLines: CartLine[] = items.map((it: any) => {
          const productIdRaw = it.product_id;
          const productId =
            productIdRaw != null && String(productIdRaw).trim() !== "" ? Number(productIdRaw) : NaN;
          if (!Number.isFinite(productId)) {
            throw new CheckoutError("Бараа олдсонгүй (product_id алга)", 400);
          }
          return {
            productId,
            variantId: it.variant_id != null && String(it.variant_id).trim() !== "" ? Number(it.variant_id) : null,
            qty: Math.max(1, Number(it.qty ?? 1)),
            clientName: String(it.name ?? "Бараа"),
            clientImageUrl: it.image_url ? String(it.image_url) : null,
          };
        });

        const productIds = Array.from(new Set(cartLines.map((l) => l.productId)));
        const variantIds = Array.from(
          new Set(cartLines.map((l) => l.variantId).filter((v): v is number => typeof v === "number"))
        );

        // Serialize by involved product/variant ids.
        const lockKeys = Array.from(
          new Set([
            ...productIds.map((id) => 1_000_000_000 + id),
            ...variantIds.map((id) => 2_000_000_000 + id),
          ])
        );
        for (const k of lockKeys) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${k});`;
        }

        const products = await tx.adminProduct.findMany({
          where: { id: { in: productIds } },
          include: { type: true, images: true, variants: { include: { images: true } } },
        });
        const productById = new Map(products.map((p) => [p.id, p]));
        const variantById = new Map<number, { productId: number; variant: any }>();
        for (const p of products) {
          for (const v of p.variants || []) {
            variantById.set(v.id, { productId: p.id, variant: v });
          }
        }

        const isPreorderProduct = (p: any) => {
          const type = p?.type ?? null;
          if (type?.has_duration === true) return true;
          const name = String(type?.name ?? "").toLowerCase();
          if (name.includes("захиал") || name.includes("урьдчил") || name.includes("preorder")) return true;
          if (name.includes("лайв") || name.includes("live")) return true;
          return false;
        };

        const kindByProductId = new Map<number, "ready" | "preorder">();
        for (const p of products) {
          kindByProductId.set(p.id, isPreorderProduct(p) ? "preorder" : "ready");
        }
        const hasPreorderDb = productIds.some((id) => kindByProductId.get(id) === "preorder");
        const hasReadyDb = productIds.some((id) => kindByProductId.get(id) === "ready");
        const computedOrderKindDb = hasPreorderDb ? "preorder" : "ready";
        const safeOrderKind = computedOrderKindDb;

        if (deliveryMethod === "delivery" && !hasReadyDb) {
          throw new CheckoutError("Зөвхөн бэлэн бараатай үед хүргэлт сонгож болно.", 400);
        }
        if (deliveryMethod === "delivery" && hasReadyDb) {
          if (!deliveryName || !deliveryPhone || !deliveryAddress) {
            throw new CheckoutError("Хүргэлтийн нэр, утас, хаяг шаардлагатай", 400);
          }
          if (!deliveryDistrictId || !deliveryKhorooId) {
            throw new CheckoutError("Дүүрэг, хороо сонгоно уу.", 400);
          }
        }

        const getVariantLabel = (variant: {
          sku: string | null;
          attribute: Record<string, unknown> | null;
          id: number;
        }) => {
          const attr = (variant.attribute || {}) as Record<string, unknown>;
          const type = typeof attr.type === "string" ? attr.type : "";
          const color = typeof attr.color === "string" ? attr.color : "";
          const size = typeof attr.size === "string" ? attr.size : "";
          const merged = [type, color, size].filter(Boolean).join(" / ");
          return merged || variant.sku || `Төрөл-${variant.id}`;
        };

        // Group quantities by (product_id, variant_id) so we validate totals correctly.
        const grouped = new Map<
          string,
          { productId: number; variantId: number | null; qty: number }
        >();
        for (const line of cartLines) {
          const key = `${line.productId}|${line.variantId ?? "x"}`;
          const existing = grouped.get(key);
          if (existing) existing.qty += line.qty;
          else grouped.set(key, { productId: line.productId, variantId: line.variantId, qty: line.qty });
        }

        const orderActiveOrPaid: Prisma.AdminOrderWhereInput = {
          deleted_at: null,
          OR: [
            { payment_status: "PAID" },
            {
              payment_status: "UNPAID",
              OR: [
                { payment_expires_at: { gt: now } },
                { payment_expires_at: null, created_at: { gt: reserveWindowStart } },
              ],
            },
          ],
          NOT: [{ status: "Цуцлагдсан" }],
        };

        const variantReservedRows =
          variantIds.length > 0
            ? await tx.adminOrderItem.groupBy({
                by: ["variant_id"],
                where: {
                  variant_id: { in: variantIds },
                  order: { is: orderActiveOrPaid },
                },
                _sum: { quantity: true },
              })
            : [];
        const variantReserved = new Map<number, number>();
        for (const r of variantReservedRows) {
          const vid = r.variant_id;
          if (vid == null) continue;
          variantReserved.set(vid, Number(r._sum?.quantity ?? 0));
        }

        const productReservedRows =
          productIds.length > 0
            ? await tx.adminOrderItem.groupBy({
                by: ["product_id"],
                where: {
                  product_id: { in: productIds },
                  variant_id: null,
                  order: { is: orderActiveOrPaid },
                },
                _sum: { quantity: true },
              })
            : [];
        const productReserved = new Map<number, number>();
        for (const r of productReservedRows) {
          const pid = r.product_id;
          if (pid == null) continue;
          productReserved.set(pid, Number(r._sum?.quantity ?? 0));
        }

        for (const g of grouped.values()) {
          const p = productById.get(g.productId);
          if (!p) throw new CheckoutError("Бараа олдсонгүй", 400);

          const hasDuration = Number(p.duration_hours || 0) > 0;
          const durationHours = Number(p.duration_hours || 0);
          const endMs =
            p.created_at && hasDuration
              ? new Date(p.created_at).getTime() + durationHours * 60 * 60 * 1000
              : null;
          const expired = endMs ? endMs <= now.getTime() : false;
          const productClosed = p.order_accept_status === "CLOSED" || expired;
          if (productClosed) throw new CheckoutError(`Захиалга хаагдсан байна: ${p.name}`, 409);

          const variants = p.variants || [];
          if (variants.length > 0 && !g.variantId) {
            throw new CheckoutError(`Төрөл сонгоно уу: ${p.name}`, 400);
          }

          if (g.variantId) {
            const vMeta = variantById.get(g.variantId);
            if (!vMeta || vMeta.productId !== p.id) {
              throw new CheckoutError(`Төрөл буруу байна: ${p.name}`, 400);
            }
            const v = vMeta.variant;
            if ((v as any).order_accept_status === "CLOSED") {
              throw new CheckoutError(
                `Захиалга хаагдсан байна: ${p.name} (${getVariantLabel(v)})`,
                409
              );
            }
            const stock = v.stock != null ? Number(v.stock) : null;
            if (stock != null) {
              const reserved = variantReserved.get(g.variantId) ?? 0;
              const remaining = Math.max(0, stock - reserved);
              if (remaining <= 0 || remaining < g.qty) {
                throw new CheckoutError(
                  `Захиалга авах тоо дууссан байна: ${p.name} (${getVariantLabel(v)})`,
                  409
                );
              }
            }
          } else {
            const stock = p.stock != null ? Number(p.stock) : null;
            if (stock != null) {
              const reserved = productReserved.get(p.id) ?? 0;
              const remaining = Math.max(0, stock - reserved);
              if (remaining <= 0 || remaining < g.qty) {
                throw new CheckoutError(`Захиалга авах тоо дууссан байна: ${p.name}`, 409);
              }
            }
          }
        }

        const createItems = cartLines.map((line) => {
          const p = productById.get(line.productId) ?? null;
          const v = line.variantId ? variantById.get(line.variantId)?.variant ?? null : null;
          const vPrice = v?.price != null ? Number(v.price) : null;
          const basePrice =
            p?.discount_price != null && Number(p.discount_price) > 0
              ? Number(p.discount_price)
              : p?.price != null
              ? Number(p.price)
              : 0;
          const bulkPrices = p ? (p as any).bulk_prices ?? null : null;
          const unitPrice =
            vPrice != null && vPrice > 0 ? vPrice : getBulkUnitPrice(basePrice, line.qty, bulkPrices);

          return {
            product_id: line.productId,
            variant_id: line.variantId,
            product_name: String(p?.name ?? line.clientName ?? "Бараа"),
            quantity: line.qty,
            price: Math.max(0, unitPrice),
            image_url: line.clientImageUrl,
            status: defaultStatus,
          };
        });

        const itemsTotal = createItems.reduce(
          (sum, it) => sum + Math.max(1, it.quantity) * Math.max(0, it.price),
          0
        );

        let delivery_fee = 0;
        let delivery_district_name: string | null = null;
        let delivery_khoroo_name: string | null = null;
        let delivery_zone: string | null = null;
        if (deliveryMethod === "delivery" && hasReadyDb) {
          const khoroo = await tx.adminDeliveryKhoroo.findUnique({
            where: { id: deliveryKhorooId as number },
            include: { district: true },
          });
          if (!khoroo || khoroo.district_id !== deliveryDistrictId) {
            throw new CheckoutError("Дүүрэг/хороо буруу байна.", 400);
          }
          delivery_fee = Math.max(0, Number(khoroo.fee || 0));
          delivery_district_name = khoroo.district?.name ?? null;
          delivery_khoroo_name = khoroo.name ?? null;
          delivery_zone = khoroo.zone ?? null;
        }

        const total = itemsTotal + delivery_fee;

        return tx.adminOrder.create({
          data: {
            user_id: userId,
            name,
            phone1: phone,
            status: defaultStatus,
            payment_status: "UNPAID",
            order_kind: safeOrderKind,
            delivery_method: hasReadyDb ? deliveryMethod : null,
            delivery_name: hasReadyDb && deliveryMethod === "delivery" ? deliveryName : null,
            delivery_phone: hasReadyDb && deliveryMethod === "delivery" ? deliveryPhone : null,
            delivery_address: hasReadyDb && deliveryMethod === "delivery" ? deliveryAddress : null,
            delivery_district_id: hasReadyDb && deliveryMethod === "delivery" ? deliveryDistrictId : null,
            delivery_district_name: hasReadyDb && deliveryMethod === "delivery" ? delivery_district_name : null,
            delivery_khoroo_id: hasReadyDb && deliveryMethod === "delivery" ? deliveryKhorooId : null,
            delivery_khoroo_name: hasReadyDb && deliveryMethod === "delivery" ? delivery_khoroo_name : null,
            delivery_zone: hasReadyDb && deliveryMethod === "delivery" ? delivery_zone : null,
            delivery_fee: hasReadyDb && deliveryMethod === "delivery" ? delivery_fee : 0,
            total,
            items: { create: createItems },
          },
          include: { items: true },
        });
      });
    } catch (err: any) {
      if (err instanceof CheckoutError) {
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      throw err;
    }
  })();

  if (created instanceof NextResponse) return created;

  // QPay invoice create
  const invoiceCode = process.env.QPAY_INVOICE_CODE;
  const receiverCode = process.env.QPAY_RECEIVER_CODE || "83";
  const callbackBase =
    process.env.QPAY_CALLBACK_URL || `${process.env.NEXT_PUBLIC_API_URL || ""}/api/payments/qpay/webhook`;
  const callbackToken = process.env.QPAY_WEBHOOK_TOKEN;
  const senderBranchCode = process.env.QPAY_SENDER_BRANCH_CODE;
  const senderStaffCode = process.env.QPAY_SENDER_STAFF_CODE || "online";
  const senderInvoiceNo = `order-${created.id}`;

  if (!invoiceCode) {
    return NextResponse.json({
      id: created.id,
      message: "QPAY_INVOICE_CODE тохируулга хийгдээгүй байна",
    });
  }

  const callbackUrl = `${callbackBase}?orderId=${created.id}${callbackToken ? `&token=${callbackToken}` : ""}`;
  const expireMinutesRaw = Number(process.env.QPAY_INVOICE_EXPIRE_MINUTES ?? 60);
  const expireMinutes = Number.isFinite(expireMinutesRaw) ? Math.max(1, expireMinutesRaw) : 60;
  const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);
  const expiryOffsetMinutesRaw = Number(process.env.QPAY_EXPIRY_OFFSET_MINUTES ?? 0);
  const expiryOffsetMinutes = Number.isFinite(expiryOffsetMinutesRaw) ? expiryOffsetMinutesRaw : 0;
  const expiresAtForPayload =
    expiryOffsetMinutes !== 0
      ? new Date(expiresAt.getTime() + expiryOffsetMinutes * 60 * 1000)
      : expiresAt;
  const expiryFormat = (process.env.QPAY_EXPIRY_FORMAT || "ISO").toUpperCase();
  const formatExpiry = (d: Date) => {
    if (expiryFormat === "LOCAL") {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    return d.toISOString();
  };

  const disableExpiry = process.env.QPAY_DISABLE_EXPIRY_DATE === "true";
  const invoicePayload: Record<string, unknown> = {
    invoice_code: invoiceCode,
    sender_invoice_no: senderInvoiceNo,
    invoice_receiver_code: receiverCode,
    sender_branch_code: senderBranchCode,
    invoice_description: `Төлбөр order #${created.id} ${created.total}₮`,
    enable_expiry: !disableExpiry,
    ...(disableExpiry ? {} : { expiry_date: formatExpiry(expiresAtForPayload) }),
    allow_partial: false,
    allow_exceed: false,
    amount: created.total,
    callback_url: callbackUrl,
    sender_staff_code: senderStaffCode,
    invoice_receiver_data: {
      name,
      email: null,
      phone,
    },
  };

  try {
    if (process.env.QPAY_DEBUG === "true") {
      const maskedPayload = {
        ...invoicePayload,
        invoice_receiver_data: {
          name,
          email: null,
          phone: phone ? `${phone.slice(0, 2)}****${phone.slice(-2)}` : null,
        },
      };
      console.log("QPay invoice payload:", maskedPayload);
      console.log("QPay expiry format:", expiryFormat, "expiresAt:", expiresAt.toISOString());
      console.log(
        "QPay expiry offset minutes:",
        expiryOffsetMinutes,
        "expiresAtForPayload:",
        expiresAtForPayload.toISOString()
      );
      console.log("QPay disable expiry:", disableExpiry);
    }
    const invoice = await createInvoice(invoicePayload);
    if (process.env.QPAY_DEBUG === "true") {
      console.log("QPay invoice response:", invoice);
    }
    await prisma.adminOrder.update({
      where: { id: created.id },
      data: {
        qpay_invoice_id: invoice.invoice_id,
        qpay_sender_invoice_no: senderInvoiceNo,
        qpay_qr_text: invoice.qr_text ?? null,
        qpay_qr_image: invoice.qr_image ?? null,
        qpay_short_url: invoice.qPay_shortUrl ?? null,
        qpay_deeplink: invoice.qPay_deeplink ?? [],
        payment_expires_at: expiresAt,
      },
    });

    return NextResponse.json({
      id: created.id,
      qpay: {
        invoice_id: invoice.invoice_id,
        qr_text: invoice.qr_text,
        qr_image: invoice.qr_image,
        short_url: invoice.qPay_shortUrl,
        deeplinks: invoice.qPay_deeplink,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("QPay invoice error:", err);
    return NextResponse.json({
      id: created.id,
      message: "QPay нэхэмжлэл үүсгэх үед алдаа гарлаа",
    });
  }
}
