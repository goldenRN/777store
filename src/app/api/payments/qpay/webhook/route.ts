import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentGet } from "@/lib/qpay";
import crypto from "crypto";
import {
  markDeliveryInvoiceItemsPaid,
  markOrderInvoicePaid,
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
      await markOrderInvoicePaid({
        orderId: order.id,
        paymentId: payment.payment_id,
        request,
      });
    }
  } catch (err) {
    console.error("QPay webhook error:", err);
  }

  return new NextResponse("SUCCESS");
}
