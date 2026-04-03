import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const phone = String(body?.phone ?? "").trim();
  const nameInput = String(body?.name ?? "").trim();
  const emailInput = String(body?.email ?? "").trim();
  const paymentMethodId = body?.payment_method_id ? Number(body.payment_method_id) : null;
  const userIdInput = body?.user_id ? String(body.user_id) : null;
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!phone) {
    return NextResponse.json({ message: "Утас шаардлагатай" }, { status: 400 });
  }
  if (items.length === 0) {
    return NextResponse.json({ message: "Бараа сонгох шаардлагатай" }, { status: 400 });
  }

  const user = userIdInput
    ? await prisma.user.findUnique({ where: { id: userIdInput } })
    : await prisma.user.findFirst({ where: { phone } });
  const name = nameInput || user?.name || phone;
  const email = emailInput || user?.email || null;

  const productIds = items
    .map((it: any) => Number(it.product_id))
    .filter((id: number) => Number.isFinite(id));
  const variantIds = items
    .map((it: any) => Number(it.variant_id))
    .filter((id: number) => Number.isFinite(id));
  const [products, variants] = await Promise.all([
    prisma.adminProduct.findMany({
      where: { id: { in: productIds } },
      include: { images: true },
    }),
    variantIds.length > 0
      ? prisma.adminProductVariant.findMany({
          where: { id: { in: variantIds } },
          include: { images: true },
        })
      : Promise.resolve([]),
  ]);
  if (products.length !== productIds.length) {
    return NextResponse.json({ message: "Зарим бараа олдсонгүй" }, { status: 400 });
  }
  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const orderItems = items.map((it: any) => {
    const productId = Number(it.product_id);
    const variantId = it.variant_id ? Number(it.variant_id) : null;
    const qty = Math.max(1, Number(it.qty ?? 1));
    const product = productMap.get(productId)!;
    const variant = variantId ? variantMap.get(variantId) : null;
    const unitPrice =
      variant && variant.price != null
        ? variant.price
        : product.discount_price != null && product.discount_price > 0
        ? product.discount_price
        : product.price;
    const imageUrl =
      variant?.images?.[0]?.image_url ??
      product.images?.[0]?.image_url ??
      null;
    return {
      product_id: productId,
      product_name: product.name,
      quantity: qty,
      price: unitPrice,
      image_url: imageUrl,
    };
  });

  const total = orderItems.reduce(
    (sum: number, it: { quantity: number; price: number }) => sum + it.quantity * it.price,
    0
  );

  const firstStatus = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
  const defaultStatus = firstStatus?.name || "pending";

  const paymentMethod = paymentMethodId
    ? await prisma.adminPaymentMethod.findUnique({ where: { id: paymentMethodId } })
    : null;

  const created = await prisma.adminOrder.create({
    data: {
      user_id: user?.id ?? null,
      name,
      email,
      phone1: phone,
      status: defaultStatus,
      payment_status: "PAID",
      payment_provider: "admin",
      payment_method_id: paymentMethod?.id ?? null,
      payment_method_name: paymentMethod?.name ?? null,
      total,
      items: {
        create: orderItems.map((it: { product_id: number; product_name: string; quantity: number; price: number; image_url: string | null }) => ({
          ...it,
          status: defaultStatus,
        })),
      },
    },
  });

  await logAdminAction({
    request,
    action: "create",
    entityType: "order_admin",
    entityId: String(created.id),
    details: { phone, total, payment_method: paymentMethod?.name ?? null },
  });

  return NextResponse.json({ id: created.id });
}
