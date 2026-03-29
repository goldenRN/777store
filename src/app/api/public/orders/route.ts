import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/lib/qpay";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");

  if (!userId) {
    return NextResponse.json({ message: "userId шаардлагатай" }, { status: 400 });
  }

  const where: Record<string, unknown> = { user_id: userId, payment_status: "PAID" };
  if (status && status !== "ALL") {
    where.status = status;
  }

  const orders = await prisma.adminOrder.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      items: true,
    },
  });

  const mapped = orders.map((o) => ({
    id: o.id,
    status: o.status,
    total: o.total,
    createdAt: o.created_at,
    items: o.items.map((it) => ({
      id: it.id,
      qty: it.quantity,
      unitPrice: it.price,
      productName: it.product_name,
      productImage: it.image_url ?? null,
      status: it.status ?? null,
    })),
  }));

  return NextResponse.json({ items: mapped });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = String(body?.userId ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const items = Array.isArray(body?.items) ? body.items : [];
  const orderKindInput = String(body?.orderKind ?? "").trim();
  const deliveryMethod = body?.deliveryMethod ? String(body.deliveryMethod) : null;
  const deliveryName = body?.deliveryName ? String(body.deliveryName) : null;
  const deliveryPhone = body?.deliveryPhone ? String(body.deliveryPhone) : null;
  const deliveryAddress = body?.deliveryAddress ? String(body.deliveryAddress) : null;

  if (!userId || !name || !phone) {
    return NextResponse.json({ message: "userId, нэр, утас шаардлагатай" }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ message: "Сагс хоосон байна" }, { status: 400 });
  }

  const total = items.reduce((sum: number, it: any) => {
    const qty = Math.max(1, Number(it.qty ?? 1));
    const price = Math.max(0, Number(it.price ?? 0));
    return sum + qty * price;
  }, 0);

  const normalizeType = (name?: string | null) => {
    const t = (name || "").toLowerCase();
    if (t.includes("захиал") || t.includes("preorder") || t.includes("урьдчил")) return "preorder";
    if (t.includes("лайв") || t.includes("live")) return "preorder";
    if (t.includes("бэлэн") || t.includes("ready")) return "ready";
    return "";
  };
  const hasPreorder = items.some((it: any) => normalizeType(it.type_name) === "preorder");
  const computedOrderKind = hasPreorder ? "preorder" : "ready";
  const orderKind = orderKindInput || computedOrderKind;

  if (orderKind === "ready" && deliveryMethod === "delivery") {
    if (!deliveryName || !deliveryPhone || !deliveryAddress) {
      return NextResponse.json(
        { message: "Хүргэлтийн нэр, утас, хаяг шаардлагатай" },
        { status: 400 }
      );
    }
  }

  const firstStatus = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
  const defaultStatus = firstStatus?.name || "pending";

  const created = await prisma.adminOrder.create({
    data: {
      user_id: userId,
      name,
      phone1: phone,
      status: defaultStatus,
      payment_status: "UNPAID",
      order_kind: orderKind,
      delivery_method: deliveryMethod,
      delivery_name: deliveryName,
      delivery_phone: deliveryPhone,
      delivery_address: deliveryAddress,
      total,
      items: {
        create: items.map((it: any) => ({
          product_id: it.product_id ? Number(it.product_id) : null,
          product_name: String(it.name ?? "Бараа"),
          quantity: Math.max(1, Number(it.qty ?? 1)),
          price: Math.max(0, Number(it.price ?? 0)),
          image_url: it.image_url ? String(it.image_url) : null,
          status: defaultStatus,
        })),
      },
    },
    include: { items: true },
  });

  // QPay invoice create
  const invoiceCode = process.env.QPAY_INVOICE_CODE;
  const receiverCode = process.env.QPAY_RECEIVER_CODE || "83";
  const callbackBase =
    process.env.QPAY_CALLBACK_URL || `${process.env.NEXT_PUBLIC_API_URL || ""}/api/payments/qpay/webhook`;
  const callbackToken = process.env.QPAY_WEBHOOK_TOKEN;
  const senderBranchCode = process.env.QPAY_SENDER_BRANCH_CODE;
  const senderStaffCode = process.env.QPAY_SENDER_STAFF_CODE || "online";
  const senderInvoiceNo = String(created.id);

  if (!invoiceCode) {
    return NextResponse.json({
      id: created.id,
      message: "QPAY_INVOICE_CODE тохируулга хийгдээгүй байна",
    });
  }

  const callbackUrl = `${callbackBase}?orderId=${created.id}${callbackToken ? `&token=${callbackToken}` : ""}`;
  const expireMinutesRaw = Number(process.env.QPAY_INVOICE_EXPIRE_MINUTES ?? 60);
  const expireMinutes = Number.isFinite(expireMinutesRaw) ? Math.max(1, expireMinutesRaw) : 60;
  const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);
  const expiryOffsetMinutesRaw = Number(process.env.QPAY_EXPIRY_OFFSET_MINUTES ?? 0);
  const expiryOffsetMinutes = Number.isFinite(expiryOffsetMinutesRaw) ? expiryOffsetMinutesRaw : 0;
  const expiresAtForPayload =
    expiryOffsetMinutes !== 0
      ? new Date(expiresAt.getTime() + expiryOffsetMinutes * 60 * 1000)
      : expiresAt;
  const expiryFormat = (process.env.QPAY_EXPIRY_FORMAT || "ISO").toUpperCase();
  const formatExpiry = (d: Date) => {
    if (expiryFormat === "LOCAL") {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    return d.toISOString();
  };

  const disableExpiry = process.env.QPAY_DISABLE_EXPIRY_DATE === "true";
  const invoicePayload: Record<string, unknown> = {
    invoice_code: invoiceCode,
    sender_invoice_no: senderInvoiceNo,
    invoice_receiver_code: receiverCode,
    sender_branch_code: senderBranchCode,
    invoice_description: `Order #${created.id} ${total}₮`,
    enable_expiry: !disableExpiry,
    ...(disableExpiry ? {} : { expiry_date: formatExpiry(expiresAtForPayload) }),
    allow_partial: false,
    allow_exceed: false,
    amount: total,
    callback_url: callbackUrl,
    sender_staff_code: senderStaffCode,
    invoice_receiver_data: {
      name,
      email: null,
      phone,
    },
  };

  try {
    if (process.env.QPAY_DEBUG === "true") {
      const maskedPayload = {
        ...invoicePayload,
        invoice_receiver_data: {
          name,
          email: null,
          phone: phone ? `${phone.slice(0, 2)}****${phone.slice(-2)}` : null,
        },
      };
      console.log("QPay invoice payload:", maskedPayload);
      console.log("QPay expiry format:", expiryFormat, "expiresAt:", expiresAt.toISOString());
      console.log(
        "QPay expiry offset minutes:",
        expiryOffsetMinutes,
        "expiresAtForPayload:",
        expiresAtForPayload.toISOString()
      );
      console.log("QPay disable expiry:", disableExpiry);
    }
    const invoice = await createInvoice(invoicePayload);
    if (process.env.QPAY_DEBUG === "true") {
      console.log("QPay invoice response:", invoice);
    }
    await prisma.adminOrder.update({
      where: { id: created.id },
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
      id: created.id,
      qpay: {
        invoice_id: invoice.invoice_id,
        qr_text: invoice.qr_text,
        qr_image: invoice.qr_image,
        short_url: invoice.qPay_shortUrl,
        deeplinks: invoice.qPay_deeplink,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("QPay invoice error:", err);
    return NextResponse.json({
      id: created.id,
      message: "QPay нэхэмжлэл үүсгэх үед алдаа гарлаа",
    });
  }
}
