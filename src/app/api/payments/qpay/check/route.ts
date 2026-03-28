import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentCheck } from "@/lib/qpay";

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

  // expiry check
  if (order.payment_expires_at && new Date(order.payment_expires_at) < new Date()) {
    return NextResponse.json({
      status: "EXPIRED",
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
    await prisma.adminOrder.update({
      where: { id: order.id },
      data: {
        payment_status: "PAID",
        qpay_payment_id: paidRow.payment_id ?? null,
        paid_at: new Date(),
        status: pendingName,
        items: {
          updateMany: {
            where: { order_id: order.id },
            data: { status: pendingName },
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
