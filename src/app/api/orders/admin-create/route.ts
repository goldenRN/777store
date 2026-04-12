import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: NextRequest) {
  class BadRequestError extends Error {
    status = 400 as const;
  }

  try {
    const body = await request.json();
    const phone = String(body?.phone ?? "").trim();
    const nameInput = String(body?.name ?? "").trim();
    const emailInput = String(body?.email ?? "").trim();
    const paymentMethodId = body?.payment_method_id ? Number(body.payment_method_id) : null;
    const userIdInput = body?.user_id ? String(body.user_id) : null;
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!phone) {
      throw new BadRequestError("Утас шаардлагатай");
    }
    if (items.length === 0) {
      throw new BadRequestError("Бараа сонгох шаардлагатай");
    }

    const user = userIdInput
      ? await prisma.user.findUnique({ where: { id: userIdInput } })
      : await prisma.user.findFirst({ where: { phone } });
    const name = nameInput || user?.name || phone;
    const email = emailInput || user?.email || null;

    type CartLine = { productId: number; variantId: number | null; qty: number };
    const cartLines: CartLine[] = items.map((it: any) => {
      const productId =
        it?.product_id != null && String(it.product_id).trim() !== "" ? Number(it.product_id) : NaN;
      if (!Number.isFinite(productId)) throw new BadRequestError("product_id буруу байна");
      const variantId =
        it?.variant_id != null && String(it.variant_id).trim() !== "" ? Number(it.variant_id) : null;
      const qtyRaw = Number(it?.qty ?? 1);
      const qty = Number.isFinite(qtyRaw) ? Math.max(1, qtyRaw) : NaN;
      if (!Number.isFinite(qty)) throw new BadRequestError("Тоо ширхэг буруу байна");
      return { productId, variantId, qty };
    });

    const productIds = Array.from(new Set(cartLines.map((l) => l.productId)));
    const variantIds = Array.from(
      new Set(cartLines.map((l) => l.variantId).filter((v): v is number => typeof v === "number"))
    );

    // Group quantities by (product_id, variant_id) so we validate totals correctly.
    const grouped = new Map<string, { productId: number; variantId: number | null; qty: number }>();
    for (const line of cartLines) {
      const key = `${line.productId}|${line.variantId ?? "x"}`;
      const ex = grouped.get(key);
      if (ex) ex.qty += line.qty;
      else grouped.set(key, { productId: line.productId, variantId: line.variantId, qty: line.qty });
    }

    const firstStatus = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
    const defaultStatus = firstStatus?.name || "pending";

    const paymentMethod = paymentMethodId
      ? await prisma.adminPaymentMethod.findUnique({ where: { id: paymentMethodId } })
      : null;

    class ConflictError extends Error {
      status = 409 as const;
    }

    const normalizeType = (typeName?: string | null) => {
      const t = String(typeName || "").toLowerCase();
      if (t.includes("захиал") || t.includes("preorder") || t.includes("урьдчил")) return "preorder";
      if (t.includes("лайв") || t.includes("live")) return "preorder";
      if (t.includes("бэлэн") || t.includes("ready")) return "ready";
      return "";
    };

    const created = await prisma.$transaction(async (tx) => {
      // Serialize by involved product/variant ids to prevent concurrent oversell.
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
        include: {
          type: true,
          images: true,
          variants: { include: { images: true } },
        },
      });
      if (products.length !== productIds.length) throw new BadRequestError("Зарим бараа олдсонгүй");
      const productById = new Map(products.map((p) => [p.id, p]));
      const variantById = new Map<number, { productId: number; variant: any }>();
      for (const p of products) {
        for (const v of p.variants || []) {
          variantById.set(v.id, { productId: p.id, variant: v });
        }
      }

      const now = new Date();
      const reserveMinutesRaw = Number(process.env.QPAY_INVOICE_EXPIRE_MINUTES ?? 60);
      const reserveMinutes = Number.isFinite(reserveMinutesRaw) ? Math.max(1, reserveMinutesRaw) : 60;
      const reserveWindowStart = new Date(now.getTime() - reserveMinutes * 60 * 1000);

      const orderActiveOrPaid: Prisma.AdminOrderWhereInput = {
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
        if (r.variant_id == null) continue;
        variantReserved.set(r.variant_id, Number(r._sum?.quantity ?? 0));
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
        if (r.product_id == null) continue;
        productReserved.set(r.product_id, Number(r._sum?.quantity ?? 0));
      }

      for (const g of grouped.values()) {
        const p = productById.get(g.productId);
        if (!p) throw new BadRequestError("Зарим бараа олдсонгүй");

        const hasDuration = Number(p.duration_hours || 0) > 0;
        const durationHours = Number(p.duration_hours || 0);
        const endMs =
          p.created_at && hasDuration
            ? new Date(p.created_at).getTime() + durationHours * 60 * 60 * 1000
            : null;
        const expired = endMs ? endMs <= now.getTime() : false;
        const productClosed = p.order_accept_status === "CLOSED" || expired;
        if (productClosed) throw new ConflictError(`Захиалга хаагдсан байна: ${p.name}`);

        const variants = p.variants || [];
        if (variants.length > 0 && !g.variantId) {
          throw new BadRequestError(`Төрөлтэй бараанд төрөл заавал сонгоно уу: ${p.name}`);
        }

        if (g.variantId) {
          const vMeta = variantById.get(g.variantId);
          if (!vMeta || vMeta.productId !== p.id) {
            throw new BadRequestError(`Сонгосон төрөл энэ бараанд хамаарахгүй байна: ${p.name}`);
          }
          const v = vMeta.variant;
          const stock = v.stock != null ? Number(v.stock) : null;
          if (stock != null) {
            const reserved = variantReserved.get(g.variantId) ?? 0;
            const remaining = Math.max(0, stock - reserved);
            if (remaining <= 0 || remaining < g.qty) {
              throw new ConflictError(`Захиалга авах тоо дууссан байна: ${p.name}`);
            }
          }
        } else {
          const stock = p.stock != null ? Number(p.stock) : null;
          if (stock != null) {
            const reserved = productReserved.get(p.id) ?? 0;
            const remaining = Math.max(0, stock - reserved);
            if (remaining <= 0 || remaining < g.qty) {
              throw new ConflictError(`Захиалга авах тоо дууссан байна: ${p.name}`);
            }
          }
        }
      }

      const hasPreorder = products.some((p) => normalizeType(p.type?.name) === "preorder");
      const orderKind = hasPreorder ? "preorder" : "ready";

      const orderItems = cartLines.map((line) => {
        const product = productById.get(line.productId);
        if (!product) throw new BadRequestError("Зарим бараа олдсонгүй");
        const variant = line.variantId ? variantById.get(line.variantId)?.variant ?? null : null;
        const variantPrice = variant?.price != null ? Number(variant.price) : null;
        const unitPrice =
          variantPrice != null && variantPrice > 0
            ? variantPrice
            : product.discount_price != null && product.discount_price > 0
            ? Number(product.discount_price)
            : Number(product.price);
        const imageUrl = variant?.images?.[0]?.image_url ?? product.images?.[0]?.image_url ?? null;
        return {
          product_id: line.productId,
          variant_id: line.variantId,
          product_name: product.name,
          quantity: line.qty,
          price: Math.max(0, unitPrice),
          image_url: imageUrl,
          status: defaultStatus,
        };
      });

      const total = orderItems.reduce((sum, it) => sum + Math.max(1, it.quantity) * Math.max(0, it.price), 0);

      const created = await tx.adminOrder.create({
        data: {
          user_id: user?.id ?? null,
          name,
          email,
          phone1: phone,
          status: defaultStatus,
          payment_status: "PAID",
          payment_provider: "admin",
          payment_method_id: paymentMethod?.id ?? null,
          payment_method_name: paymentMethod?.name ?? null,
          order_kind: orderKind,
          total,
          items: { create: orderItems },
        },
      });

      // Increment ordered quantities immediately for admin-created PAID preorder orders.
      if (orderKind === "preorder") {
        const byProduct = new Map<number, number>();
        const byVariant = new Map<number, number>();
        for (const it of orderItems) {
          byProduct.set(it.product_id, (byProduct.get(it.product_id) ?? 0) + it.quantity);
          if (it.variant_id != null) byVariant.set(it.variant_id, (byVariant.get(it.variant_id) ?? 0) + it.quantity);
        }
        const productUpdates = Array.from(byProduct.entries()).map(([pid, qty]) =>
          tx.adminProduct.update({ where: { id: pid }, data: { ordered_qty: { increment: qty } } })
        );
        const variantUpdates = Array.from(byVariant.entries()).map(([vid, qty]) =>
          tx.adminProductVariant.update({ where: { id: vid }, data: { ordered_qty: { increment: qty } } })
        );
        await Promise.all([...productUpdates, ...variantUpdates]);
      }

      return created;
    });

    await logAdminAction({
      request,
      action: "create",
      entityType: "order_admin",
      entityId: String(created.id),
      details: { phone, total: created.total, payment_method: paymentMethod?.name ?? null },
    });

    return NextResponse.json({ id: created.id });
  } catch (err: any) {
    const message = String(err?.message || "Алдаа гарлаа");
    const status = err?.status && Number.isFinite(Number(err.status)) ? Number(err.status) : 500;
    return NextResponse.json({ message }, { status });
  }
}
