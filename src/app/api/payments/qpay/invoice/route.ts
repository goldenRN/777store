import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInvoice } from "@/lib/qpay";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const invoiceId = searchParams.get("invoiceId");

  let id = invoiceId;
  if (!id && orderId) {
    const order = await prisma.adminOrder.findUnique({ where: { id: Number(orderId) } });
    if (!order?.qpay_invoice_id) {
      return NextResponse.json({ message: "invoice not found" }, { status: 404 });
    }
    id = order.qpay_invoice_id;
  }

  if (!id) {
    return NextResponse.json({ message: "orderId эсвэл invoiceId шаардлагатай" }, { status: 400 });
  }

  try {
    const invoice = await getInvoice(id);
    return NextResponse.json({ invoice });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "QPay invoice error" }, { status: 500 });
  }
}
