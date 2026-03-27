import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

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
  const role = roleRaw === "ADMIN" ? UserRole.ADMIN : roleRaw === "CUSTOMER" ? UserRole.CUSTOMER : null;
  if (!role) {
    return NextResponse.json({ message: "role шаардлагатай" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, role: true },
  });

  return NextResponse.json(updated);
}
