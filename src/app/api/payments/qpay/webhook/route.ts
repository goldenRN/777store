import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentGet } from "@/lib/qpay";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("qpay_payment_id") || searchParams.get("payment_id");
  const orderIdParam = searchParams.get("orderId");
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
    const order =
      orderIdParam
        ? await prisma.adminOrder.findUnique({ where: { id: Number(orderIdParam) } })
        : await prisma.adminOrder.findFirst({ where: { qpay_invoice_id: invoiceId } });

    if (order && payment.payment_status === "PAID") {
      const statuses = await prisma.adminStatus.findMany({ orderBy: { id: "asc" } });
      const pendingName =
        statuses.find((s) => s.name.includes("Хүлээгд"))?.name ||
        statuses[0]?.name ||
        order.status;
      const shippingName =
        statuses.find((s) => s.name.includes("Хүргэлт"))?.name || pendingName;
      const nextStatus =
        order.order_kind === "ready" && order.delivery_method === "delivery"
          ? shippingName
          : pendingName;
      if (order.payment_status !== "PAID" && order.order_kind === "preorder") {
        const items = await prisma.adminOrderItem.findMany({
          where: { order_id: order.id, product_id: { not: null } },
          select: { product_id: true, quantity: true },
        });
        if (items.length > 0) {
          await prisma.$transaction(
            items.map((it) =>
              prisma.adminProduct.update({
                where: { id: it.product_id as number },
                data: { ordered_qty: { increment: it.quantity } },
              })
            )
          );
        }
      }
      await prisma.adminOrder.update({
        where: { id: order.id },
        data: {
          payment_status: "PAID",
          qpay_payment_id: payment.payment_id,
          paid_at: new Date(),
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
