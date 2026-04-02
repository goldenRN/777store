import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const methodId = Number(id);
  if (!Number.isFinite(methodId)) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const is_active = body?.is_active == null ? true : Boolean(body.is_active);

  if (!name) {
    return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  }

  const updated = await prisma.adminPaymentMethod.update({
    where: { id: methodId },
    data: {
      name,
      description: description || null,
      is_active,
    },
  });

  await logAdminAction({
    request,
    action: "update",
    entityType: "payment_method",
    entityId: String(methodId),
    details: { name, is_active },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const methodId = Number(id);
  if (!Number.isFinite(methodId)) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  await prisma.adminPaymentMethod.delete({ where: { id: methodId } });

  await logAdminAction({
    request,
    action: "delete",
    entityType: "payment_method",
    entityId: String(methodId),
  });

  return NextResponse.json({ message: "ok" });
}
