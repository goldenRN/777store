import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/qpay";

const isDeliveryInvoiceSender = (senderInvoiceNo?: string | null, orderId?: number) => {
  const raw = String(senderInvoiceNo || "").trim().toUpperCase();
  if (!raw) return false;
  if (orderId && (raw.startsWith(`DELIVERY-${orderId}-`) || raw.startsWith(`DELIVERY-ADMIN-${orderId}-`))) {
    return true;
  }
  return raw.startsWith("DELIVERY-") || raw.startsWith("DELIVERY_ADMIN-") || raw.startsWith("DELIVERY-ADMIN-");
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolved = await params;
  const orderId = Number(resolved.id);
  const body = await request.json().catch(() => ({}));

  const userId = String(body?.userId ?? "").trim();
  const deliveryName = String(body?.deliveryName ?? "").trim();
  const deliveryPhone = String(body?.deliveryPhone ?? "").trim();
  const deliveryAddress = String(body?.deliveryAddress ?? "").trim();
  const deliveryDistrictId = Number(body?.deliveryDistrictId ?? "");
  const deliveryKhorooId = Number(body?.deliveryKhorooId ?? "");

  if (!orderId || !userId) {
    return NextResponse.json({ message: "orderId, userId шаардлагатай" }, { status: 400 });
  }

  if (!deliveryName || !deliveryPhone || !deliveryAddress) {
    return NextResponse.json(
      { message: "Хүргэлтийн нэр, утас, нэмэлт хаяг шаардлагатай" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(deliveryDistrictId) || !Number.isFinite(deliveryKhorooId)) {
    return NextResponse.json({ message: "Дүүрэг, хороо сонгоно уу." }, { status: 400 });
  }

  const order = await prisma.adminOrder.findFirst({
    where: {
      id: orderId,
      user_id: userId,
      payment_status: "PAID",
      deleted_at: null,
    },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ message: "Захиалга олдсонгүй" }, { status: 404 });
  }

  const items = order.items || [];
  if (items.length === 0) {
    return NextResponse.json({ message: "Захиалгын бараа олдсонгүй" }, { status: 400 });
  }

  const statusNorm = String(order.status || "").toLowerCase();
  const isShippingOrDelivered =
    statusNorm.includes("хүргэлт") ||
    statusNorm.includes("хүргэгд") ||
    statusNorm.includes("shipping") ||
    statusNorm.includes("delivered");

  if (order.delivery_method === "delivery" && isShippingOrDelivered) {
    return NextResponse.json({ message: "Энэ захиалга аль хэдийн хүргэлтэнд бүртгэгдсэн байна." }, { status: 400 });
  }

  const productIds = Array.from(
    new Set(items.map((it) => it.product_id).filter((x): x is number => x != null))
  );
  const products = productIds.length
    ? await prisma.adminProduct.findMany({
        where: { id: { in: productIds } },
        include: { type: true },
      })
    : [];
  const isPreorderType = (type: { has_duration?: boolean | null; name?: string | null } | null | undefined) => {
    if (type?.has_duration === true) return true;
    const name = String(type?.name ?? "").toLowerCase();
    if (name.includes("захиал") || name.includes("урьдчил") || name.includes("preorder")) return true;
    if (name.includes("лайв") || name.includes("live")) return true;
    return false;
  };
  const preorderProductIds = new Set<number>(products.filter((p) => isPreorderType(p.type)).map((p) => p.id));

  // Require full arrival (only for preorder items) before allowing delivery request.
  const preorderItems = items.filter((it) => it.product_id == null || preorderProductIds.has(it.product_id));
  const allArrived =
    preorderItems.length > 0
      ? preorderItems.every((it) => String(it.status || "").toLowerCase().includes("бараа ирсэн"))
      : items.every((it) => String(it.status || "").toLowerCase().includes("бараа ирсэн"));

  if (!allArrived) {
    return NextResponse.json(
      { message: "Бараа бүрэн ирээгүй байна. Бараа ирсний дараа хүргэлт бүртгэнэ үү." },
      { status: 409 }
    );
  }

  const khoroo = await prisma.adminDeliveryKhoroo.findUnique({
    where: { id: deliveryKhorooId },
    include: { district: true },
  });
  if (!khoroo || khoroo.district_id !== deliveryDistrictId) {
    return NextResponse.json({ message: "Дүүрэг/хороо буруу байна." }, { status: 400 });
  }

  const deliveryFee = Math.max(0, Number(khoroo.fee || 0));

  const existingDeliveryInvoice =
    order.delivery_method === "delivery" &&
    isDeliveryInvoiceSender(order.qpay_sender_invoice_no, order.id) &&
    order.qpay_invoice_id &&
    order.qpay_qr_text &&
    order.qpay_qr_image &&
    order.payment_expires_at &&
    new Date(order.payment_expires_at) > new Date()
      ? {
          invoice_id: order.qpay_invoice_id,
          qr_text: order.qpay_qr_text,
          qr_image: order.qpay_qr_image,
          short_url: order.qpay_short_url,
          deeplinks: Array.isArray(order.qpay_deeplink) ? order.qpay_deeplink : [],
          expires_at: order.payment_expires_at.toISOString(),
        }
      : null;

  // Save delivery info on the order.
  await prisma.adminOrder.update({
    where: { id: order.id },
    data: {
      delivery_method: "delivery",
      delivery_name: deliveryName,
      delivery_phone: deliveryPhone,
      delivery_address: deliveryAddress,
      delivery_district_id: deliveryDistrictId,
      delivery_district_name: khoroo.district?.name ?? null,
      delivery_khoroo_id: deliveryKhorooId,
      delivery_khoroo_name: khoroo.name ?? null,
      delivery_zone: khoroo.zone ?? null,
      delivery_fee: deliveryFee,
    },
  });

  if (existingDeliveryInvoice) {
    return NextResponse.json({
      id: order.id,
      delivery_fee: deliveryFee,
      qpay: existingDeliveryInvoice,
    });
  }

  // If delivery fee is 0, no payment is required -> move to shipping right away.
  if (deliveryFee <= 0) {
    const statuses = await prisma.adminStatus.findMany({ orderBy: { id: "asc" } });
    const pendingName =
      statuses.find((s) => s.name.includes("Хүлээгд"))?.name ||
      statuses[0]?.name ||
      order.status;
    const shippingName = statuses.find((s) => s.name.includes("Хүргэлт"))?.name || pendingName;

    await prisma.adminOrder.update({
      where: { id: order.id },
      data: {
        status: shippingName,
        items: {
          updateMany: {
            where: { order_id: order.id },
            data: { status: shippingName },
          },
        },
      },
    });

    return NextResponse.json({ id: order.id, status: "NO_FEE", delivery_fee: 0 });
  }

  // QPay invoice create for delivery fee only.
  const invoiceCode = process.env.QPAY_INVOICE_CODE;
  const receiverCode = process.env.QPAY_RECEIVER_CODE || "83";
  const callbackBase =
    process.env.QPAY_CALLBACK_URL || `${process.env.NEXT_PUBLIC_API_URL || ""}/api/payments/qpay/webhook`;
  const callbackToken = process.env.QPAY_WEBHOOK_TOKEN;
  const senderBranchCode = process.env.QPAY_SENDER_BRANCH_CODE;
  const senderStaffCode = process.env.QPAY_SENDER_STAFF_CODE || "online";

  if (!invoiceCode) {
    return NextResponse.json({
      id: order.id,
      message: "QPAY_INVOICE_CODE тохируулга хийгдээгүй байна",
    });
  }

  const senderInvoiceNo = `DELIVERY-${order.id}-${Date.now()}`;
  const callbackUrl = `${callbackBase}?orderId=${order.id}${callbackToken ? `&token=${callbackToken}` : ""}`;

  const expireMinutesRaw = Number(process.env.QPAY_INVOICE_EXPIRE_MINUTES ?? 60);
  const expireMinutes = Number.isFinite(expireMinutesRaw) ? Math.max(1, expireMinutesRaw) : 60;
  const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);
  const disableExpiry = process.env.QPAY_DISABLE_EXPIRY_DATE === "true";

  const invoicePayload: Record<string, unknown> = {
    invoice_code: invoiceCode,
    sender_invoice_no: senderInvoiceNo,
    invoice_receiver_code: receiverCode,
    sender_branch_code: senderBranchCode,
    invoice_description: `Delivery fee for Order #${order.id} ${deliveryFee}₮`,
    enable_expiry: !disableExpiry,
    ...(disableExpiry ? {} : { expiry_date: expiresAt.toISOString() }),
    allow_partial: false,
    allow_exceed: false,
    amount: deliveryFee,
    callback_url: callbackUrl,
    sender_staff_code: senderStaffCode,
    invoice_receiver_data: {
      name: deliveryName,
      email: null,
      phone: deliveryPhone,
    },
  };

  try {
    const invoice = await createInvoice(invoicePayload);
    await prisma.adminOrder.update({
      where: { id: order.id },
      data: {
        qpay_invoice_id: invoice.invoice_id,
        qpay_sender_invoice_no: senderInvoiceNo,
        qpay_qr_text: invoice.qr_text ?? null,
        qpay_qr_image: invoice.qr_image ?? null,
        qpay_short_url: invoice.qPay_shortUrl ?? null,
        qpay_deeplink: invoice.qPay_deeplink ?? [],
        payment_expires_at: expiresAt,
      },
    });
    return NextResponse.json({
      id: order.id,
      delivery_fee: deliveryFee,
      qpay: {
        invoice_id: invoice.invoice_id,
        qr_text: invoice.qr_text,
        qr_image: invoice.qr_image,
        short_url: invoice.qPay_shortUrl,
        deeplinks: invoice.qPay_deeplink,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("QPay invoice error (delivery):", err);
    return NextResponse.json(
      { id: order.id, message: "Хүргэлтийн QPay нэхэмжлэл үүсгэхэд алдаа гарлаа" },
      { status: 500 }
    );
  }
}
