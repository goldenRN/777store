import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { paymentCheck } from "@/lib/qpay";
import {
  markDeliveryInvoiceItemsPaid,
  markOrderInvoicePaid,
} from "@/lib/deliveryStatus";

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
      await markDeliveryInvoiceItemsPaid({
        invoiceId: item.qpay_invoice_id,
        paymentId: (paidRow as { payment_id?: string | null }).payment_id ?? null,
        request,
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
      if (order.qpay_sender_invoice_no) {
        await prisma.adminOrderItem.updateMany({
          where: {
            qpay_sender_invoice_no: order.qpay_sender_invoice_no,
            order_id: { not: order.id },
          },
          data: {
            delivery_method: null,
            delivery_name: null,
            delivery_phone: null,
            delivery_address: null,
            delivery_district_id: null,
            delivery_district_name: null,
            delivery_khoroo_id: null,
            delivery_khoroo_name: null,
            delivery_zone: null,
            delivery_fee: 0,
            qpay_invoice_id: null,
            qpay_payment_id: null,
            qpay_sender_invoice_no: null,
            qpay_qr_text: null,
            qpay_qr_image: null,
            qpay_short_url: null,
            qpay_deeplink: Prisma.JsonNull,
            payment_expires_at: null,
            delivery_paid_at: null,
          },
        });
      }
      await prisma.adminOrder.update({
        where: { id: order.id },
        data: {
          status: "Цуцлагдсан",
          deleted_at: new Date(),
          deleted_reason: "QPay төлбөрийн хугацаа дууссан",
        },
      });
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
    await markOrderInvoicePaid({
      orderId: order.id,
      paymentId: (paidRow as { payment_id?: string | null }).payment_id ?? null,
      request,
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
