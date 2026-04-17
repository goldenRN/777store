import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const productId = Number(body?.productId);
    const variantIdRaw = body?.variantId;
    const variantId = variantIdRaw === "" || variantIdRaw == null ? null : Number(variantIdRaw);
    const cargo_fee_raw = body?.cargo_fee;
    const cargo_fee =
      cargo_fee_raw == null || cargo_fee_raw === "" ? null : Math.round(Number(cargo_fee_raw));
    const cargo_note = body?.cargo_note != null ? String(body.cargo_note).trim() : null;

    if (!productId) {
      return NextResponse.json({ message: "productId шаардлагатай" }, { status: 400 });
    }
    if (cargo_fee == null || !Number.isFinite(cargo_fee) || cargo_fee < 0) {
      return NextResponse.json({ message: "Карго үнэ зөв оруулна уу." }, { status: 400 });
    }
    if (variantId != null && !Number.isFinite(variantId)) {
      return NextResponse.json({ message: "variantId буруу байна" }, { status: 400 });
    }

    const pendingStatus = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
    const pendingName = pendingStatus?.name ?? null;

    const result = await prisma.$transaction(async (tx) => {
      if (variantId != null) {
        await tx.adminProductVariant.update({
          where: { id: variantId },
          data: { cargo_fee, cargo_note: cargo_note || null },
        });

        const updated = await tx.adminOrderItem.updateMany({
          where: {
            product_id: productId,
            variant_id: variantId,
            status: { not: "Бараа ирсэн" },
            order: {
              is: {
                deleted_at: null,
                payment_status: "PAID",
                ...(pendingName ? { status: pendingName } : {}),
              },
            },
          },
          data: { status: "Бараа ирсэн" },
        });
        return { kind: "variant" as const, updatedCount: updated.count };
      }

      // Product-level fallback (for products without variants)
      await tx.adminProduct.update({
        where: { id: productId },
        data: { cargo_fee, cargo_note: cargo_note || null, arrival_status: "Бараа ирсэн" },
      });

      const updated = await tx.adminOrderItem.updateMany({
        where: {
          product_id: productId,
          variant_id: null,
          status: { not: "Бараа ирсэн" },
          order: {
            is: {
              deleted_at: null,
              payment_status: "PAID",
              ...(pendingName ? { status: pendingName } : {}),
            },
          },
        },
        data: { status: "Бараа ирсэн" },
      });
      return { kind: "product" as const, updatedCount: updated.count };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Серверийн алдаа" }, { status: 500 });
  }
}

