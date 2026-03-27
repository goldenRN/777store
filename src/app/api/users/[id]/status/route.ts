import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const isActive = Boolean(body?.isActive);

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, isActive: true },
  });

  return NextResponse.json(updated);
}
