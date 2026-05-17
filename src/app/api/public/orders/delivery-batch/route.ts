import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/qpay";
import { logAdminAction } from "@/lib/audit";
import { buildDeliverySourceKey, upsertDeliveryOrderFromItems } from "@/lib/deliveryOrders";
import { RURAL_DELIVERY_FEE } from "@/lib/deliveryFees";
import {
  getDeliveryStatusNames,
  isArrivedDeliveryStatus,
  isShippingDeliveryStatus,
  recomputeOrderStatusesFromItems,
} from "@/lib/deliveryStatus";

const isReadyType = (type: { has_duration?: boolean | null; name?: string | null } | null | undefined) => {
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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const userId = String(body?.userId ?? "").trim();
  const orderItemIds: number[] = Array.isArray(body?.orderItemIds)
    ? Array.from(
        new Set<number>(
          body.orderItemIds
            .map((value: unknown) => Number(value))
            .filter((value: number) => Number.isFinite(value) && value > 0),
        ),
      )
    : [];
  const deliveryAreaType = String(body?.deliveryAreaType ?? "city").trim().toLowerCase() === "rural"
    ? "rural"
    : "city";
  const deliveryName = String(body?.deliveryName ?? "").trim();
  const deliveryPhone = String(body?.deliveryPhone ?? "").trim();
  const deliveryAddress = String(body?.deliveryAddress ?? "").trim();
  const deliveryDistrictId = Number(body?.deliveryDistrictId ?? "");
  const deliveryKhorooId = Number(body?.deliveryKhorooId ?? "");

  if (!userId || orderItemIds.length === 0) {
    return NextResponse.json(
      { message: "userId, orderItemIds шаардлагатай" },
      { status: 400 },
    );
  }
  if (!deliveryName || !deliveryPhone || !deliveryAddress) {
    return NextResponse.json(
      { message: "Хүргэлтийн нэр, утас, нэмэлт хаяг шаардлагатай" },
      { status: 400 },
    );
  }
  if (deliveryAreaType === "city" && (!Number.isFinite(deliveryDistrictId) || !Number.isFinite(deliveryKhorooId))) {
    return NextResponse.json({ message: "Дүүрэг, хороо сонгоно уу." }, { status: 400 });
  }

  const items = await prisma.adminOrderItem.findMany({
    where: {
      id: { in: orderItemIds },
      order: {
        user_id: userId,
        payment_status: "PAID",
        deleted_at: null,
      },
    },
    include: {
      order: true,
      product: { include: { type: true } },
      variant: true,
    },
  });

  if (items.length !== orderItemIds.length) {
    return NextResponse.json(
      { message: "Сонгосон бараанууд бүрэн олдсонгүй." },
      { status: 404 },
    );
  }

  const invalidItem = items.find((item) => {
    if (isShippingDeliveryStatus(item.status)) return true;
    const itemIsReady = isReadyType(item.product?.type);
    return !itemIsReady && !isArrivedDeliveryStatus(item.status);
  });
  if (invalidItem) {
    return NextResponse.json(
      { message: `${invalidItem.product_name} хүргэлтэнд оруулахад бэлэн биш байна.` },
      { status: 409 },
    );
  }

  const sortedItems = [...items].sort((a, b) => a.id - b.id);
  let deliveryFee = 0;
  let deliveryDistrictName: string | null = null;
  let deliveryKhorooName: string | null = null;
  let deliveryZone: string | null = null;
  if (deliveryAreaType === "rural") {
    deliveryFee = RURAL_DELIVERY_FEE;
    deliveryDistrictName = "Орон нутаг";
    deliveryZone = "RURAL";
  } else {
    const khoroo = await prisma.adminDeliveryKhoroo.findUnique({
      where: { id: deliveryKhorooId },
      include: { district: true },
    });
    if (!khoroo || khoroo.district_id !== deliveryDistrictId) {
      return NextResponse.json({ message: "Дүүрэг/хороо буруу байна." }, { status: 400 });
    }
    deliveryFee = Math.max(0, Number(khoroo.fee || 0));
    deliveryDistrictName = khoroo.district?.name ?? null;
    deliveryKhorooName = khoroo.name ?? null;
    deliveryZone = khoroo.zone ?? null;
  }
  const cargoFee = sortedItems.reduce((sum, item) => {
    const unitCargo = Math.max(
      0,
      Number(item.variant?.cargo_fee ?? item.product?.cargo_fee ?? 0),
    );
    return sum + unitCargo * Math.max(1, Number(item.quantity || 0));
  }, 0);
  const totalFee = deliveryFee + cargoFee;

  const sharedInvoiceId =
    sortedItems.every(
      (item) =>
        item.delivery_method === "delivery" &&
        item.qpay_invoice_id &&
        item.qpay_invoice_id === sortedItems[0].qpay_invoice_id &&
        item.payment_expires_at &&
        new Date(item.payment_expires_at) > new Date() &&
        !item.qpay_payment_id,
    )
      ? sortedItems[0].qpay_invoice_id
      : null;

  await prisma.$transaction(
    sortedItems.map((item, index) =>
      prisma.adminOrderItem.update({
        where: { id: item.id },
        data: {
          delivery_method: "delivery",
          delivery_name: deliveryName,
          delivery_phone: deliveryPhone,
          delivery_address: deliveryAddress,
          delivery_district_id: deliveryAreaType === "city" ? deliveryDistrictId : null,
          delivery_district_name: deliveryDistrictName,
          delivery_khoroo_id: deliveryAreaType === "city" ? deliveryKhorooId : null,
          delivery_khoroo_name: deliveryKhorooName,
          delivery_zone: deliveryZone,
          delivery_fee: index === 0 ? deliveryFee : 0,
        },
      }),
    ),
  );

  if (sharedInvoiceId) {
    const anchorItem = await prisma.adminOrderItem.findUnique({
      where: { id: sortedItems[0].id },
    });
    if (anchorItem?.qpay_qr_text && anchorItem.qpay_qr_image && anchorItem.payment_expires_at) {
      return NextResponse.json({
        orderItemId: anchorItem.id,
        orderItemIds: sortedItems.map((item) => item.id),
        productNames: sortedItems.map((item) => item.product_name),
        delivery_fee: deliveryFee,
        cargo_fee: cargoFee,
        total_fee: totalFee,
        qpay: {
          invoice_id: sharedInvoiceId,
          qr_text: anchorItem.qpay_qr_text,
          qr_image: anchorItem.qpay_qr_image,
          short_url: anchorItem.qpay_short_url,
          deeplinks: Array.isArray(anchorItem.qpay_deeplink)
            ? anchorItem.qpay_deeplink
            : [],
          expires_at: anchorItem.payment_expires_at.toISOString(),
        },
      });
    }
  }

  if (totalFee <= 0) {
    const names = await getDeliveryStatusNames(sortedItems[0].order.status || sortedItems[0].status);
    const paidAt = new Date();
    await prisma.$transaction(
      sortedItems.map((item) =>
        prisma.adminOrderItem.update({
          where: { id: item.id },
          data: {
            status: names.shipping,
            delivery_paid_at: paidAt,
          },
        }),
      ),
    );

    const refreshedItems = await prisma.adminOrderItem.findMany({
      where: { id: { in: sortedItems.map((item) => item.id) } },
      include: { order: true, product: true, variant: true },
    });
    await prisma.$transaction(async (tx) => {
      await upsertDeliveryOrderFromItems(tx, {
        sourceKey: buildDeliverySourceKey({
          itemIds: refreshedItems.map((item) => item.id),
        }),
        items: refreshedItems,
        status: names.shipping,
        paymentStatus: "PAID",
        paymentProvider: "NO_FEE",
        deliveryFee,
        cargoFee,
        totalFee,
        paidAt,
      });
    });

    await recomputeOrderStatusesFromItems(sortedItems.map((item) => item.order_id));

    for (const item of sortedItems) {
      await logAdminAction({
        request,
        action: "ORDER_ITEM_DELIVERY_REGISTERED",
        entityType: "AdminOrderItem",
        entityId: item.id,
        details: {
          order_id: item.order_id,
          item_id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          status: names.shipping,
          payment_method: "NO_FEE",
          delivery_fee: item.id === sortedItems[0].id ? deliveryFee : 0,
          cargo_fee: Math.max(
            0,
            Number(item.variant?.cargo_fee ?? item.product?.cargo_fee ?? 0),
          ) * Math.max(1, Number(item.quantity || 0)),
          total_fee: totalFee,
        },
      });
    }

    return NextResponse.json({
      orderItemId: sortedItems[0].id,
      orderItemIds: sortedItems.map((item) => item.id),
      status: "NO_FEE",
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
    return NextResponse.json(
      { message: "QPAY_INVOICE_CODE тохируулга хийгдээгүй байна" },
      { status: 500 },
    );
  }

  const orderIds = Array.from(new Set(sortedItems.map((item) => item.order_id))).sort((a, b) => a - b);
  const callbackUrl = `${callbackBase}?orderItemId=${sortedItems[0].id}${callbackToken ? `&token=${callbackToken}` : ""}`;
  const expireMinutesRaw = Number(process.env.QPAY_INVOICE_EXPIRE_MINUTES ?? 60);
  const expireMinutes = Number.isFinite(expireMinutesRaw) ? Math.max(1, expireMinutesRaw) : 60;
  const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);
  const disableExpiry = process.env.QPAY_DISABLE_EXPIRY_DATE === "true";

  const draftDeliveryOrder = await prisma.$transaction(async (tx) =>
    upsertDeliveryOrderFromItems(tx, {
      sourceKey: buildDeliverySourceKey({
        itemIds: sortedItems.map((item) => item.id),
      }),
      items: sortedItems,
      status: "Хүргэлтийн төлбөр хүлээгдэж буй",
      paymentStatus: "UNPAID",
      paymentProvider: "qpay",
      deliveryFee,
      cargoFee,
      totalFee,
      paidAt: null,
    }),
  );
  if (!draftDeliveryOrder) {
    return NextResponse.json({ message: "Хүргэлтийн ноорог үүсгэж чадсангүй." }, { status: 500 });
  }
  const senderInvoiceNo = `delivery-${draftDeliveryOrder?.id ?? sortedItems[0]?.id ?? 0}`;
  const senderSourceKey = buildDeliverySourceKey({
    senderInvoiceNo,
    itemIds: sortedItems.map((item) => item.id),
  });

  const invoicePayload: Record<string, unknown> = {
    invoice_code: invoiceCode,
    sender_invoice_no: senderInvoiceNo,
    invoice_receiver_code: receiverCode,
    sender_branch_code: senderBranchCode,
    invoice_description: `delivery #${draftDeliveryOrder?.id ?? sortedItems[0]?.id ?? 0} ${totalFee}₮`,
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
    await prisma.$transaction(async (tx) => {
      await Promise.all(
        sortedItems.map((item) =>
          tx.adminOrderItem.update({
            where: { id: item.id },
            data: {
              qpay_invoice_id: invoice.invoice_id,
              qpay_sender_invoice_no: senderInvoiceNo,
              qpay_qr_text: invoice.qr_text ?? null,
              qpay_qr_image: invoice.qr_image ?? null,
              qpay_short_url: invoice.qPay_shortUrl ?? null,
              qpay_deeplink: invoice.qPay_deeplink ?? [],
              payment_expires_at: expiresAt,
            },
          }),
        ),
      );

      await tx.adminDeliveryOrder.update({
        where: { id: draftDeliveryOrder.id },
        data: {
          source_key: senderSourceKey,
          qpay_sender_invoice_no: senderInvoiceNo,
          qpay_invoice_id: invoice.invoice_id,
          qpay_qr_text: invoice.qr_text ?? null,
          qpay_qr_image: invoice.qr_image ?? null,
          qpay_short_url: invoice.qPay_shortUrl ?? null,
          qpay_deeplink: invoice.qPay_deeplink ?? [],
          payment_expires_at: expiresAt,
        },
      });
    });

    await logAdminAction({
      request,
      action: "ORDER_ITEM_DELIVERY_REQUEST",
      entityType: "AdminOrder",
      entityId: orderIds.join(","),
      details: {
        order_ids: orderIds,
        item_ids: sortedItems.map((item) => item.id),
        user_id: userId,
        delivery_fee: deliveryFee,
        cargo_fee: cargoFee,
        total_fee: totalFee,
      },
    });

    return NextResponse.json({
      orderItemId: sortedItems[0].id,
      orderItemIds: sortedItems.map((item) => item.id),
      productNames: sortedItems.map((item) => item.product_name),
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
  } catch (error) {
    console.error("QPay invoice error (delivery batch):", error);
    const reason =
      error instanceof Error && error.message ? error.message : "Тодорхойгүй алдаа";
    return NextResponse.json(
      {
        message: `Нэгтгэсэн хүргэлтийн QPay нэхэмжлэл үүсгэхэд алдаа гарлаа. ${reason}`,
      },
      { status: 500 },
    );
  }
}
