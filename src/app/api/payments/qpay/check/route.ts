import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentCheck } from "@/lib/qpay";
import { logAdminAction } from "@/lib/audit";

const normalizeStatus = (value?: string | null) =>
  String(value || "").trim().toLowerCase();

async function getShippingStatusName(fallbackStatus: string) {
  const statuses = await prisma.adminStatus.findMany({ orderBy: { id: "asc" } });
  const pendingName =
    statuses.find((s) => s.name.includes("Хүлээгд"))?.name ||
    statuses[0]?.name ||
    fallbackStatus;
  return (
    statuses.find((s) => s.name.includes("Хүргэлт"))?.name || pendingName
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = Number(searchParams.get("orderId"));
  const orderItemId = Number(searchParams.get("orderItemId"));
  const debug =
    searchParams.get("debug") === "1" || process.env.QPAY_DEBUG === "true";

  if (Number.isFinite(orderItemId) && orderItemId > 0) {
    const item = await prisma.adminOrderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });
    if (!item?.qpay_invoice_id) {
      return NextResponse.json({ message: "invoice not found" }, { status: 404 });
    }
    if (item.order?.deleted_at) {
      return NextResponse.json({ status: "DELETED" });
    }
    if (item.qpay_payment_id) {
      return NextResponse.json({ status: "PAID" });
    }
    if (item.payment_expires_at && new Date(item.payment_expires_at) < new Date()) {
      return NextResponse.json({
        status: "EXPIRED",
        ...(debug
          ? {
              now: new Date().toISOString(),
              payment_expires_at: item.payment_expires_at,
              qpay_invoice_id: item.qpay_invoice_id,
            }
          : {}),
      });
    }

    const res = await paymentCheck(item.qpay_invoice_id);
    const rows = Array.isArray(res?.rows) ? res.rows : [];
    const paidRow = rows.find((r: { payment_status?: string }) => r.payment_status === "PAID");
    if (paidRow) {
      const shippingName = await getShippingStatusName(item.order?.status || item.status);
      const wasUnpaid = !item.qpay_payment_id;
      await prisma.$transaction([
        prisma.adminOrder.update({
          where: { id: item.order_id },
          data: { status: shippingName },
        }),
        prisma.adminOrderItem.update({
          where: { id: item.id },
          data: {
            status: shippingName,
            qpay_payment_id:
              (paidRow as { payment_id?: string | null }).payment_id ?? null,
            delivery_paid_at: new Date(),
          },
        }),
      ]);
      if (wasUnpaid) {
        await logAdminAction({
          request,
          action: "ORDER_ITEM_DELIVERY_REGISTERED",
          entityType: "AdminOrderItem",
          entityId: item.id,
          details: {
            order_id: item.order_id,
            item_id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            status: shippingName,
            payment_method: "QPAY",
            delivery_fee: item.delivery_fee ?? 0,
          },
        });
      }
      return NextResponse.json({
        status: "PAID",
        ...(debug ? { raw: res } : {}),
      });
    }

    return NextResponse.json({
      status: "UNPAID",
      ...(debug ? { raw: res } : {}),
    });
  }

  if (!orderId) {
    return NextResponse.json({ message: "orderId required" }, { status: 400 });
  }

  const order = await prisma.adminOrder.findUnique({ where: { id: orderId } });
  if (!order?.qpay_invoice_id) {
    return NextResponse.json({ message: "invoice not found" }, { status: 404 });
  }
  if (order.deleted_at) {
    return NextResponse.json({ status: "DELETED" });
  }

  if (order.payment_expires_at && new Date(order.payment_expires_at) < new Date()) {
    if (order.payment_status !== "PAID") {
      await prisma.adminOrder.delete({ where: { id: order.id } });
    }
    return NextResponse.json({
      status: "EXPIRED",
      deleted: order.payment_status !== "PAID",
      ...(debug
        ? {
            now: new Date().toISOString(),
            payment_expires_at: order.payment_expires_at,
            qpay_invoice_id: order.qpay_invoice_id,
          }
        : {}),
    });
  }

  const res = await paymentCheck(order.qpay_invoice_id);
  const rows = Array.isArray(res?.rows) ? res.rows : [];
  const paidRow = rows.find((r: { payment_status?: string }) => r.payment_status === "PAID");
  if (paidRow) {
    const statuses = await prisma.adminStatus.findMany({ orderBy: { id: "asc" } });
    const pendingName =
      statuses.find((s) => s.name.includes("Хүлээгд"))?.name ||
      statuses[0]?.name ||
      order.status;
    const shippingName =
      statuses.find((s) => s.name.includes("Хүргэлт"))?.name || pendingName;
    const statusNorm = normalizeStatus(order.status);
    const isArrived =
      statusNorm.includes("бараа ирсэн") || statusNorm.includes("arrived");
    const shouldShip =
      order.delivery_method === "delivery" &&
      (order.order_kind === "ready" || isArrived);
    const nextStatus = shouldShip ? shippingName : pendingName;
    const shouldBackfillOrderedQty =
      order.payment_status !== "PAID" && String(order.order_kind || "") === "preorder";
    if (shouldBackfillOrderedQty) {
      const items = await prisma.adminOrderItem.findMany({
        where: { order_id: order.id, product_id: { not: null } },
        select: { product_id: true, variant_id: true, quantity: true },
      });
      if (items.length > 0) {
        const productIds = Array.from(
          new Set(items.map((it) => it.product_id).filter((x): x is number => x != null)),
        );
        const products = await prisma.adminProduct.findMany({
          where: { id: { in: productIds } },
          include: { type: true },
        });
        const isPreorderProduct = (p: { type?: { has_duration?: boolean | null; name?: string | null } | null }) => {
          const type = p?.type ?? null;
          if (type?.has_duration === true) return true;
          const name = String(type?.name ?? "").toLowerCase();
          if (name.includes("захиал") || name.includes("урьдчил") || name.includes("preorder")) return true;
          if (name.includes("лайв") || name.includes("live")) return true;
          return false;
        };
        const preorderProductIds = new Set<number>(
          products.filter((p) => isPreorderProduct(p)).map((p) => p.id),
        );
        const preorderItems = items.filter(
          (it) => it.product_id != null && preorderProductIds.has(it.product_id),
        );
        if (preorderItems.length > 0) {
          const productUpdates = preorderItems.map((it) =>
            prisma.adminProduct.update({
              where: { id: it.product_id as number },
              data: { ordered_qty: { increment: it.quantity } },
            }),
          );
          const variantUpdates = preorderItems
            .filter((it) => it.variant_id != null)
            .map((it) =>
              prisma.adminProductVariant.update({
                where: { id: it.variant_id as number },
                data: { ordered_qty: { increment: it.quantity } },
              }),
            );
          await prisma.$transaction([...productUpdates, ...variantUpdates]);
        }
      }
    }
    await prisma.adminOrder.update({
      where: { id: order.id },
      data: {
        ...(order.payment_status === "PAID"
          ? {}
          : {
              payment_status: "PAID",
              qpay_payment_id:
                (paidRow as { payment_id?: string | null }).payment_id ?? null,
              paid_at: new Date(),
            }),
        status: nextStatus,
        items: {
          updateMany: {
            where: { order_id: order.id },
            data: { status: nextStatus },
          },
        },
      },
    });
    return NextResponse.json({
      status: "PAID",
      ...(debug ? { raw: res } : {}),
    });
  }

  return NextResponse.json({
    status: "UNPAID",
    ...(debug ? { raw: res } : {}),
  });
}
