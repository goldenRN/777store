import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { logAdminAction } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const roleRaw = String(body?.role ?? "").trim().toUpperCase();
  const role =
    roleRaw === "SUPER_ADMIN"
      ? UserRole.SUPER_ADMIN
      : roleRaw === "ADMIN"
      ? UserRole.ADMIN
      : roleRaw === "CUSTOMER"
      ? UserRole.CUSTOMER
      : null;
  if (!role) {
    return NextResponse.json({ message: "role шаардлагатай" }, { status: 400 });
  }

  const before = await prisma.user.findUnique({
    where: { id },
    select: { role: true, phone: true, name: true },
  });

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, role: true },
  });

  await logAdminAction({
    request,
    action: "USER_ROLE_UPDATE",
    entityType: "User",
    entityId: id,
    details: {
      before_role: before?.role ?? null,
      after_role: role,
      user_phone: before?.phone ?? null,
      user_name: before?.name ?? null,
    },
  });

  return NextResponse.json(updated);
}
