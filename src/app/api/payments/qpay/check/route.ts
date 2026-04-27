import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentCheck } from "@/lib/qpay";

const isDeliveryInvoiceSender = (senderInvoiceNo?: string | null) => {
  const raw = String(senderInvoiceNo || "").trim().toUpperCase();
  return raw.startsWith("DELIVERY-") || raw.startsWith("DELIVERY_ADMIN-") || raw.startsWith("DELIVERY-ADMIN-");
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = Number(searchParams.get("orderId"));
  const debug = searchParams.get("debug") === "1" || process.env.QPAY_DEBUG === "true";
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

  // expiry check
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
  const paidRow = rows.find((r: any) => r.payment_status === "PAID");
  if (paidRow) {
    const statuses = await prisma.adminStatus.findMany({ orderBy: { id: "asc" } });
    const pendingName =
      statuses.find((s) => s.name.includes("Хүлээгд"))?.name ||
      statuses[0]?.name ||
      order.status;
    const shippingName =
      statuses.find((s) => s.name.includes("Хүргэлт"))?.name || pendingName;
    const statusNorm = String(order.status || "").toLowerCase();
    const isArrived =
      statusNorm.includes("бараа ирсэн") || statusNorm.includes("arrived");
    const isDeliveryInvoice = isDeliveryInvoiceSender(order.qpay_sender_invoice_no);
    const shouldShip =
      isDeliveryInvoice ||
      (order.delivery_method === "delivery" &&
        (order.order_kind === "ready" || isArrived));
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
          new Set(items.map((it) => it.product_id).filter((x): x is number => x != null))
        );
        const products = await prisma.adminProduct.findMany({
          where: { id: { in: productIds } },
          include: { type: true },
        });
        const isPreorderProduct = (p: any) => {
          const type = p?.type ?? null;
          if (type?.has_duration === true) return true;
          const name = String(type?.name ?? "").toLowerCase();
          if (name.includes("захиал") || name.includes("урьдчил") || name.includes("preorder")) return true;
          if (name.includes("лайв") || name.includes("live")) return true;
          return false;
        };
        const preorderProductIds = new Set<number>(
          products.filter((p) => isPreorderProduct(p)).map((p) => p.id)
        );
        const preorderItems = items.filter((it) => it.product_id != null && preorderProductIds.has(it.product_id));
        if (preorderItems.length > 0) {
          const productUpdates = preorderItems.map((it) =>
            prisma.adminProduct.update({
              where: { id: it.product_id as number },
              data: { ordered_qty: { increment: it.quantity } },
            })
          );
          const variantUpdates = preorderItems
            .filter((it) => it.variant_id != null)
            .map((it) =>
              prisma.adminProductVariant.update({
                where: { id: it.variant_id as number },
                data: { ordered_qty: { increment: it.quantity } },
              })
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
              qpay_payment_id: paidRow.payment_id ?? null,
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
