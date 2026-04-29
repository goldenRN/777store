import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentGet } from "@/lib/qpay";
import crypto from "crypto";
import {
  getDeliveryStatusNames,
  markDeliveryInvoiceItemsPaid,
  normalizeDeliveryStatus,
} from "@/lib/deliveryStatus";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId =
    searchParams.get("qpay_payment_id") || searchParams.get("payment_id");
  const orderIdParam = searchParams.get("orderId");
  const orderItemIdParam = searchParams.get("orderItemId");
  const token = searchParams.get("token");
  const expectedToken = process.env.QPAY_WEBHOOK_TOKEN;
  const signatureSecret = process.env.QPAY_WEBHOOK_SIGNATURE_SECRET;
  const signature =
    request.headers.get("x-qpay-signature") ||
    request.headers.get("x-signature") ||
    searchParams.get("signature");

  if (expectedToken && token !== expectedToken) {
    return new NextResponse("SUCCESS");
  }

  if (signatureSecret) {
    if (!paymentId || !signature) {
      return new NextResponse("INVALID_SIGNATURE", { status: 401 });
    }
    const expectedHex = crypto
      .createHmac("sha256", signatureSecret)
      .update(paymentId)
      .digest("hex");
    const expectedBase64 = crypto
      .createHmac("sha256", signatureSecret)
      .update(paymentId)
      .digest("base64");
    const isValid = signature === expectedHex || signature === expectedBase64;
    if (!isValid) {
      return new NextResponse("INVALID_SIGNATURE", { status: 401 });
    }
  }

  if (!paymentId) {
    return new NextResponse("SUCCESS");
  }

  try {
    const payment = await paymentGet(paymentId);
    const invoiceId = payment.object_id;
    const orderItemId = Number(orderItemIdParam);

    if (Number.isFinite(orderItemId) && orderItemId > 0) {
      const item = await prisma.adminOrderItem.findUnique({
        where: { id: orderItemId },
        include: { order: true },
      });

      if (item?.order?.deleted_at) {
        return new NextResponse("SUCCESS");
      }

      const matchedItem =
        item && item.qpay_invoice_id === invoiceId
          ? item
          : await prisma.adminOrderItem.findFirst({
              where: { qpay_invoice_id: invoiceId },
              include: { order: true },
            });

      if (matchedItem && payment.payment_status === "PAID") {
        await markDeliveryInvoiceItemsPaid({
          invoiceId,
          paymentId: payment.payment_id,
          request,
        });
      }

      return new NextResponse("SUCCESS");
    }

    const order = orderIdParam
      ? await prisma.adminOrder.findUnique({ where: { id: Number(orderIdParam) } })
      : await prisma.adminOrder.findFirst({ where: { qpay_invoice_id: invoiceId } });

    if (order?.deleted_at) {
      return new NextResponse("SUCCESS");
    }

    if (order && payment.payment_status === "PAID") {
      const statuses = await prisma.adminStatus.findMany({ orderBy: { id: "asc" } });
      const pendingName =
        statuses.find((s) => s.name.includes("Хүлээгд"))?.name ||
        statuses[0]?.name ||
        order.status;
      const shippingName =
        statuses.find((s) => s.name.includes("Хүргэлт"))?.name || pendingName;
      const statusNames = await getDeliveryStatusNames(order.status);
      const statusNorm = normalizeDeliveryStatus(order.status);
      const isArrived =
        statusNorm.includes("бараа ирсэн") || statusNorm.includes("arrived");
      const shouldShip =
        order.delivery_method === "delivery" &&
        (order.order_kind === "ready" || isArrived);
      const nextStatus = shouldShip ? statusNames.shipping : statusNames.pending;
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
                qpay_payment_id: payment.payment_id,
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
    }
  } catch (err) {
    console.error("QPay webhook error:", err);
  }

  return new NextResponse("SUCCESS");
}
