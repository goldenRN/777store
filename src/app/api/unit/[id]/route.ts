import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();

  if (!name) {
    return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  }

  const updated = await prisma.adminUnit.update({
    where: { id },
    data: {
      name,
      description: description || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  await prisma.adminUnit.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
