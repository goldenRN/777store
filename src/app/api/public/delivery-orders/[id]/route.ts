import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalizeImage = (url?: string | null) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) return raw;
  return `/uploads/${raw}`;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolved = await params;
  const deliveryOrderId = Number(resolved.id);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!deliveryOrderId || !userId) {
    return NextResponse.json({ message: "deliveryOrderId, userId шаардлагатай" }, { status: 400 });
  }

  const order = await prisma.adminDeliveryOrder.findFirst({
    where: { id: deliveryOrderId, user_id: userId },
    include: { items: { orderBy: { id: "asc" } } },
  });

  if (!order) {
    return NextResponse.json({ message: "Хүргэлтийн захиалга олдсонгүй" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    sourceOrderId: order.source_order_id,
    status: order.status,
    payment_status: order.payment_status,
    name: order.name,
    phone: order.phone,
    address: order.address,
    district_id: order.district_id,
    district_name: order.district_name,
    khoroo_id: order.khoroo_id,
    khoroo_name: order.khoroo_name,
    zone: order.zone,
    delivery_fee: order.delivery_fee,
    cargo_fee: order.cargo_fee,
    total: order.total,
    qpay_invoice_id: order.qpay_invoice_id,
    qpay_payment_id: order.qpay_payment_id,
    qpay_short_url: order.qpay_short_url,
    qpay_qr_image: order.qpay_qr_image,
    qpay_qr_text: order.qpay_qr_text,
    qpay_deeplink: order.qpay_deeplink,
    createdAt: order.created_at,
    items: order.items.map((item) => ({
      id: item.id,
      orderId: item.order_id,
      orderItemId: item.order_item_id,
      productId: item.product_id,
      variantId: item.variant_id,
      productName: item.product_name,
      variantLabel: item.variant_label,
      qty: item.quantity,
      unitPrice: item.price,
      productImage: normalizeImage(item.image_url),
      cargoFee: item.cargo_fee,
      status: item.status,
      return_note: item.return_note,
    })),
  });
}
