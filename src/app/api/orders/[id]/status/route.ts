import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const status = String(body?.status ?? "").trim();
  if (!status) {
    return NextResponse.json({ message: "status шаардлагатай" }, { status: 400 });
  }

  const updated = await prisma.adminOrder.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}
