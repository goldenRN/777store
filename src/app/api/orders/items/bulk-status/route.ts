import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const itemIds = Array.isArray(body?.itemIds) ? body.itemIds : [];
  const status = String(body?.status ?? "").trim();
  const returnNote = String(body?.returnNote ?? "").trim();
  const statusNorm = status.toLowerCase();
  const isReturned = statusNorm.includes("буца");

  if (!itemIds.length || !status) {
    return NextResponse.json({ message: "itemIds болон status шаардлагатай" }, { status: 400 });
  }
  if (isReturned && !returnNote) {
    return NextResponse.json({ message: "Буцаалтын тайлбар шаардлагатай" }, { status: 400 });
  }

  const numericIds = itemIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id));
  if (numericIds.length === 0) {
    return NextResponse.json({ message: "Invalid itemIds" }, { status: 400 });
  }

  const affectedItems = await prisma.adminOrderItem.findMany({
    where: { id: { in: numericIds } },
    select: { id: true, order_id: true },
  });

  await prisma.adminOrderItem.updateMany({
    where: { id: { in: numericIds } },
    data: {
      status,
      ...(isReturned ? { return_note: returnNote } : {}),
    },
  });

  const affectedOrderIds = Array.from(new Set(affectedItems.map((item) => item.order_id)));
  if (affectedOrderIds.length > 0) {
    const orders = await prisma.adminOrder.findMany({
      where: { id: { in: affectedOrderIds } },
      select: { id: true, items: { select: { status: true } } },
    });

    await Promise.all(
      orders.map((order) => {
        const statuses = order.items.map((item) => String(item.status || "").trim()).filter(Boolean);
        if (statuses.length === 0) return Promise.resolve();
        const allDelivered = statuses.every((itemStatus) => itemStatus === "Бараа олгосон");
        const allReturned = statuses.every((itemStatus) => itemStatus === "Буцаагдсан");
        if (!allDelivered && !allReturned) return Promise.resolve();
        return prisma.adminOrder.update({
          where: { id: order.id },
          data: { status: allDelivered ? "Бараа олгосон" : "Буцаагдсан" },
        });
      })
    );
  }

  await logAdminAction({
    request,
    action: "ORDER_ITEMS_BULK_STATUS",
    entityType: "AdminOrderItem",
    entityId: null,
    details: { itemIds: numericIds, status, returnNote: isReturned ? returnNote : null },
  });

  return NextResponse.json({ success: true, updated: numericIds.length });
}
