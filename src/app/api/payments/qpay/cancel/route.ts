import { NextRequest, NextResponse } from "next/server";
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
  await prisma.adminOrder.update({
    where: { id: order.id },
    data: { payment_status: "CANCELLED" },
  });

  return NextResponse.json({ status: "CANCELLED" });
}
