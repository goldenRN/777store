import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/qpay";
import { logAdminAction } from "@/lib/audit";

const normRole = (v?: string | null) =>
  String(v || "").toUpperCase().replace(/\s+/g, "_");
const requireAdmin = (request: NextRequest) => {
  const role = normRole(request.headers.get("x-actor-role"));
  return role === "SUPER_ADMIN" || role === "ADMIN";
};

const normalizeStatus = (value?: string | null) =>
  String(value || "").trim().toLowerCase();

const isDeliveryInvoiceSender = (
  senderInvoiceNo?: string | null,
  orderId?: number,
  orderItemId?: number,
  productId?: number | null,
) => {
  const raw = String(senderInvoiceNo || "").trim().toUpperCase();
  if (!raw) return false;
  if (orderId && orderItemId && productId) {
    const escapedOrderId = String(orderId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedProductId = String(productId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedOrderItemId = String(orderItemId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const itemAwarePattern = new RegExp(
      `^DELIVERY(?:-ADMIN)?-ITEM-${escapedOrderId}-${escapedProductId}-${escapedOrderItemId}-`,
    );
    if (itemAwarePattern.test(raw)) return true;
  }
  return false;
};

const isShippingOrDelivered = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return (
    normalized.includes("хүргэлт") ||
    normalized.includes("хүргэгд") ||
    normalized.includes("shipping") ||
    normalized.includes("delivered")
  );
};

const isArrivedStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return normalized.includes("ирсэн") || normalized.includes("arrived");
};

const isReadyType = (
  type:
    | { has_duration?: boolean | null; name?: string | null }
    | null
    | undefined,
) => {
  if (!type) return true;
  if (type.has_duration === true) return false;
  const name = String(type.name ?? "").toLowerCase();
  return !(
    name.includes("захиал") ||
    name.includes("урьдчил") ||
    name.includes("preorder") ||
    name.includes("лайв") ||
    name.includes("live")
  );
};

async function getShippingStatusName(fallbackStatus: string) {
  const statuses = await prisma.adminStatus.findMany({ orderBy: { id: "asc" } });
  const pendingName =
    statuses.find((s) => s.name.includes("Хүлээгд"))?.name ||
    statuses[0]?.name ||
    fallbackStatus;
  return (
    statuses.find((s) => s.name.includes("Хүргэлт"))?.name || pendingName
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolved = await params;
  const orderId = Number(resolved.id);
  const body = await request.json().catch(() => ({}));

  if (!orderId) {
    return NextResponse.json({ message: "Invalid order id" }, { status: 400 });
  }
  if (!requireAdmin(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const orderItemId = Number(body?.orderItemId ?? "");
  const deliveryName = String(body?.deliveryName ?? "").trim();
  const deliveryPhone = String(body?.deliveryPhone ?? "").trim();
  const deliveryAddress = String(body?.deliveryAddress ?? "").trim();
  const deliveryDistrictId = Number(body?.deliveryDistrictId ?? "");
  const deliveryKhorooId = Number(body?.deliveryKhorooId ?? "");
  const paymentMethod = String(body?.paymentMethod ?? "QPAY")
    .trim()
    .toUpperCase();

  if (!Number.isFinite(orderItemId)) {
    return NextResponse.json({ message: "orderItemId шаардлагатай" }, { status: 400 });
  }
  if (!deliveryName || !deliveryPhone || !deliveryAddress) {
    return NextResponse.json(
      { message: "Хүргэлтийн нэр, утас, нэмэлт хаяг шаардлагатай" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(deliveryDistrictId) || !Number.isFinite(deliveryKhorooId)) {
    return NextResponse.json({ message: "Дүүрэг, хороо сонгоно уу." }, { status: 400 });
  }
  if (paymentMethod !== "QPAY" && paymentMethod !== "BANK") {
    return NextResponse.json({ message: "paymentMethod буруу байна" }, { status: 400 });
  }

  const order = await prisma.adminOrder.findFirst({
    where: {
      id: orderId,
      payment_status: "PAID",
      deleted_at: null,
    },
    include: {
      items: {
        include: {
          product: { include: { type: true } },
          variant: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ message: "Захиалга олдсонгүй" }, { status: 404 });
  }

  const targetItem = order.items.find((item) => item.id === orderItemId);
  if (!targetItem) {
    return NextResponse.json({ message: "Хүргэлт хүссэн бараа олдсонгүй" }, { status: 404 });
  }

  if (
    targetItem.delivery_method === "delivery" &&
    isShippingOrDelivered(targetItem.status)
  ) {
    return NextResponse.json(
      { message: "Энэ бараа аль хэдийн хүргэлтэнд бүртгэгдсэн байна." },
      { status: 400 },
    );
  }

  const itemIsReady = isReadyType(targetItem.product?.type);
  if (!itemIsReady && !isArrivedStatus(targetItem.status)) {
    return NextResponse.json(
      { message: "Одоогоор хүргэлт хүсэх боломжгүй (Бараа ирсэн үед хүргэлтэнд шилжинэ)." },
      { status: 409 },
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
  const cargoFee = Math.max(
    0,
    Number(targetItem.variant?.cargo_fee ?? targetItem.product?.cargo_fee ?? 0),
  );
  const totalFee = deliveryFee + cargoFee;
  const existingDeliveryInvoice =
    targetItem.delivery_method === "delivery" &&
    isDeliveryInvoiceSender(
      targetItem.qpay_sender_invoice_no,
      order.id,
      targetItem.id,
      targetItem.product_id,
    ) &&
    targetItem.qpay_invoice_id &&
    targetItem.qpay_qr_text &&
    targetItem.qpay_qr_image &&
    targetItem.payment_expires_at &&
    new Date(targetItem.payment_expires_at) > new Date()
      ? {
          invoice_id: targetItem.qpay_invoice_id,
          qr_text: targetItem.qpay_qr_text,
          qr_image: targetItem.qpay_qr_image,
          short_url: targetItem.qpay_short_url,
          deeplinks: Array.isArray(targetItem.qpay_deeplink)
            ? targetItem.qpay_deeplink
            : [],
          expires_at: targetItem.payment_expires_at.toISOString(),
        }
      : null;

  await prisma.adminOrderItem.update({
    where: { id: targetItem.id },
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

  await logAdminAction({
    request,
    action: "ORDER_ITEM_DELIVERY_REQUEST",
    entityType: "AdminOrderItem",
    entityId: targetItem.id,
    details: {
      order_id: order.id,
      product_id: targetItem.product_id,
      variant_id: targetItem.variant_id,
      payment_method: paymentMethod,
      delivery_fee: deliveryFee,
      cargo_fee: cargoFee,
      total_fee: totalFee,
      district_id: deliveryDistrictId,
      khoroo_id: deliveryKhorooId,
    },
  });

  if (existingDeliveryInvoice) {
    return NextResponse.json({
      id: order.id,
      orderItemId: targetItem.id,
      productId: targetItem.product_id,
      productName: targetItem.product_name,
      delivery_fee: deliveryFee,
      cargo_fee: cargoFee,
      total_fee: totalFee,
      qpay: existingDeliveryInvoice,
    });
  }

  const shippingName = await getShippingStatusName(order.status);
  if (paymentMethod === "BANK" || totalFee <= 0) {
    await prisma.$transaction([
      prisma.adminOrder.update({
        where: { id: order.id },
        data: { status: shippingName },
      }),
      prisma.adminOrderItem.update({
        where: { id: targetItem.id },
        data: {
          status: shippingName,
          delivery_paid_at: new Date(),
        },
      }),
    ]);

    await logAdminAction({
      request,
      action: "ORDER_ITEM_DELIVERY_REGISTERED",
      entityType: "AdminOrderItem",
      entityId: targetItem.id,
      details: {
        order_id: order.id,
        item_id: targetItem.id,
        product_id: targetItem.product_id,
        product_name: targetItem.product_name,
        status: shippingName,
        payment_method: paymentMethod,
        delivery_fee: deliveryFee,
        cargo_fee: cargoFee,
        total_fee: totalFee,
      },
    });

    return NextResponse.json({
      id: order.id,
      orderItemId: targetItem.id,
      productId: targetItem.product_id,
      productName: targetItem.product_name,
      status: "MOVED",
      delivery_fee: deliveryFee,
      cargo_fee: cargoFee,
      total_fee: totalFee,
    });
  }

  const invoiceCode = process.env.QPAY_INVOICE_CODE;
  const receiverCode = process.env.QPAY_RECEIVER_CODE || "83";
  const callbackBase =
    process.env.QPAY_CALLBACK_URL ||
    `${process.env.NEXT_PUBLIC_API_URL || ""}/api/payments/qpay/webhook`;
  const callbackToken = process.env.QPAY_WEBHOOK_TOKEN;
  const senderBranchCode = process.env.QPAY_SENDER_BRANCH_CODE;
  const senderStaffCode = process.env.QPAY_SENDER_STAFF_CODE || "online";

  if (!invoiceCode) {
    return NextResponse.json({
      id: order.id,
      orderItemId: targetItem.id,
      message: "QPAY_INVOICE_CODE тохируулга хийгдээгүй байна",
    });
  }

  const senderInvoiceNo =
    `DELIVERY-ADMIN-ITEM-${order.id}-${targetItem.product_id ?? 0}-${targetItem.id}-${Date.now()}`;
  const callbackUrl = `${callbackBase}?orderId=${order.id}&orderItemId=${targetItem.id}${callbackToken ? `&token=${callbackToken}` : ""}`;

  const expireMinutesRaw = Number(process.env.QPAY_INVOICE_EXPIRE_MINUTES ?? 60);
  const expireMinutes = Number.isFinite(expireMinutesRaw)
    ? Math.max(1, expireMinutesRaw)
    : 60;
  const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);
  const disableExpiry = process.env.QPAY_DISABLE_EXPIRY_DATE === "true";

  const invoicePayload: Record<string, unknown> = {
    invoice_code: invoiceCode,
    sender_invoice_no: senderInvoiceNo,
    invoice_receiver_code: receiverCode,
    sender_branch_code: senderBranchCode,
    invoice_description: `Delivery + cargo for Order #${order.id} / ${targetItem.product_name} / Item #${targetItem.id} ${totalFee}₮`,
    enable_expiry: !disableExpiry,
    ...(disableExpiry ? {} : { expiry_date: expiresAt.toISOString() }),
    allow_partial: false,
    allow_exceed: false,
    amount: totalFee,
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
    await prisma.adminOrderItem.update({
      where: { id: targetItem.id },
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
      orderItemId: targetItem.id,
      productId: targetItem.product_id,
      productName: targetItem.product_name,
      delivery_fee: deliveryFee,
      cargo_fee: cargoFee,
      total_fee: totalFee,
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
    console.error("QPay invoice error (delivery-admin-item):", err);
    return NextResponse.json(
      {
        id: order.id,
        orderItemId: targetItem.id,
        productId: targetItem.product_id,
        productName: targetItem.product_name,
        delivery_fee: deliveryFee,
        cargo_fee: cargoFee,
        total_fee: totalFee,
        message: "Хүргэлтийн QPay нэхэмжлэл үүсгэхэд алдаа гарлаа",
      },
      { status: 500 },
    );
  }
}
