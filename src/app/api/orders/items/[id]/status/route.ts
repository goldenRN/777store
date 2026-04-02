import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const status = String(body?.status ?? "").trim();
  if (!status) {
    return NextResponse.json({ message: "Status шаардлагатай" }, { status: 400 });
  }

  const existing = await prisma.adminOrderItem.findUnique({
    where: { id },
    select: { status: true, order_id: true, product_name: true },
  });

  const updated = await prisma.adminOrderItem.update({
    where: { id },
    data: { status },
  });

  await logAdminAction({
    request,
    action: "ORDER_ITEM_STATUS_UPDATE",
    entityType: "AdminOrderItem",
    entityId: id,
    details: {
      order_id: existing?.order_id ?? null,
      product_name: existing?.product_name ?? null,
      before_status: existing?.status ?? null,
      after_status: status,
    },
  });

  return NextResponse.json({ success: true, item: updated });
}
