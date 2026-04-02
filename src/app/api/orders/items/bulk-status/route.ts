import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const itemIds = Array.isArray(body?.itemIds) ? body.itemIds : [];
  const status = String(body?.status ?? "").trim();

  if (!itemIds.length || !status) {
    return NextResponse.json({ message: "itemIds болон status шаардлагатай" }, { status: 400 });
  }

  const numericIds = itemIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id));
  if (numericIds.length === 0) {
    return NextResponse.json({ message: "Invalid itemIds" }, { status: 400 });
  }

  await prisma.adminOrderItem.updateMany({
    where: { id: { in: numericIds } },
    data: { status },
  });

  await logAdminAction({
    request,
    action: "ORDER_ITEMS_BULK_STATUS",
    entityType: "AdminOrderItem",
    entityId: null,
    details: { itemIds: numericIds, status },
  });

  return NextResponse.json({ success: true, updated: numericIds.length });
}
