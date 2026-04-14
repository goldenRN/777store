import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActorFromRequest, logAdminAction } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = String(body?.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json({ message: "Устгах шалтгаан шаардлагатай" }, { status: 400 });
  }

  const actor = getActorFromRequest(request);

  const existing = await prisma.adminOrder.findUnique({
    where: { id },
    include: {
      items: { select: { product_id: true, variant_id: true, quantity: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (existing.deleted_at) {
    return NextResponse.json({ message: "Захиалга аль хэдийн устгагдсан байна" }, { status: 409 });
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    // If this order already incremented preorder ordered_qty, roll it back safely.
    if (existing.payment_status === "PAID" && existing.order_kind === "preorder") {
      const byProduct = new Map<number, number>();
      const byVariant = new Map<number, number>();
      for (const it of existing.items) {
        if (it.product_id != null) {
          byProduct.set(it.product_id, (byProduct.get(it.product_id) ?? 0) + it.quantity);
        }
        if (it.variant_id != null) {
          byVariant.set(it.variant_id, (byVariant.get(it.variant_id) ?? 0) + it.quantity);
        }
      }

      for (const [pid, qty] of byProduct.entries()) {
        await tx.$executeRaw`UPDATE "AdminProduct" SET ordered_qty = GREATEST(0, ordered_qty - ${qty}) WHERE id = ${pid}`;
      }
      for (const [vid, qty] of byVariant.entries()) {
        await tx.$executeRaw`UPDATE "AdminProductVariant" SET ordered_qty = GREATEST(0, ordered_qty - ${qty}) WHERE id = ${vid}`;
      }
    }

    return tx.adminOrder.update({
      where: { id },
      data: {
        deleted_at: now,
        deleted_reason: reason,
        deleted_by_id: actor.id ?? null,
        deleted_by_name: actor.name ?? null,
        deleted_by_phone: actor.phone ?? null,
        deleted_by_role: actor.role ?? null,
      },
    });
  });

  await logAdminAction({
    request,
    action: "ORDER_SOFT_DELETE",
    entityType: "AdminOrder",
    entityId: id,
    details: {
      reason,
      deleted_by: actor,
    },
  });

  return NextResponse.json({ success: true, order: updated });
}

