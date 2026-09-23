import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalizeImage = (url?: string | null) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) return raw;
  return `/uploads/${raw}`;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");

  if (!userId) {
    return NextResponse.json({ message: "userId шаардлагатай" }, { status: 400 });
  }

  const where: Record<string, unknown> = { user_id: userId };
  if (status && status !== "ALL") where.status = status;

  const orders = await prisma.adminDeliveryOrder.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      order: {
        select: {
          deleted_at: true,
          deleted_reason: true,
        },
      },
      items: {
        orderBy: { id: "asc" },
      },
    },
  });

  return NextResponse.json({
    items: orders.map((order) => ({
      id: order.id,
      sourceOrderId: order.source_order_id,
      status: order.order?.deleted_at ? "Захиалга устгагдсан" : order.status,
      sourceOrderDeleted: Boolean(order.order?.deleted_at),
      sourceOrderDeletedAt: order.order?.deleted_at?.toISOString() ?? null,
      sourceOrderDeletedReason: order.order?.deleted_reason ?? null,
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
        status: order.order?.deleted_at ? "Захиалга устгагдсан" : item.status,
        return_note: item.return_note,
      })),
    })),
  });
}
