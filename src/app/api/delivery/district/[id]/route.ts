import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const sort_order = Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0;
  if (!name) return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  await prisma.adminDeliveryDistrict.update({
    where: { id },
    data: { name, sort_order: Math.floor(sort_order) },
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  await prisma.adminDeliveryDistrict.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

