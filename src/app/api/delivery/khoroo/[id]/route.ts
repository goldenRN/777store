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
  const zone = String(body?.zone ?? "Ойр").trim() || "Ойр";
  const fee = Number.isFinite(Number(body?.fee)) ? Math.round(Number(body.fee)) : 0;
  if (!name) return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  await prisma.adminDeliveryKhoroo.update({
    where: { id },
    data: { name, zone, fee: Math.max(0, fee) },
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
  await prisma.adminDeliveryKhoroo.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

