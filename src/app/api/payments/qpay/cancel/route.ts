import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cancelInvoice } from "@/lib/qpay";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const orderId = Number(body?.orderId);
  if (!orderId) {
    return NextResponse.json({ message: "orderId required" }, { status: 400 });
  }

  const order = await prisma.adminOrder.findUnique({ where: { id: orderId } });
  if (!order?.qpay_invoice_id) {
    return NextResponse.json({ message: "invoice not found" }, { status: 404 });
  }

  // already paid
  if (order.payment_status === "PAID") {
    return NextResponse.json({ status: "PAID" });
  }

  await cancelInvoice(order.qpay_invoice_id);
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
    data: { payment_status: "CANCELLED" },
  });

  return NextResponse.json({ status: "CANCELLED" });
}
