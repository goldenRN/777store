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
    return NextResponse.json({ message: "status шаардлагатай" }, { status: 400 });
  }

  const existing = await prisma.adminOrder.findUnique({
    where: { id },
    select: { status: true, payment_status: true },
  });

  const updated = await prisma.adminOrder.update({
    where: { id },
    data: { status },
  });

  await logAdminAction({
    request,
    action: "ORDER_STATUS_UPDATE",
    entityType: "AdminOrder",
    entityId: id,
    details: {
      before_status: existing?.status ?? null,
      after_status: status,
      payment_status: existing?.payment_status ?? null,
    },
  });

  return NextResponse.json(updated);
}
