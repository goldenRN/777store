import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const districtId = searchParams.get("district_id");
  const where =
    districtId && Number.isFinite(Number(districtId)) ? { district_id: Number(districtId) } : {};
  const items = await prisma.adminDeliveryKhoroo.findMany({
    where,
    orderBy: [{ district_id: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const district_id = Number(body?.district_id);
  const name = String(body?.name ?? "").trim();
  const zone = String(body?.zone ?? "Ойр").trim() || "Ойр";
  const fee = Number.isFinite(Number(body?.fee)) ? Math.round(Number(body.fee)) : 0;
  if (!Number.isFinite(district_id) || district_id <= 0) {
    return NextResponse.json({ message: "district_id шаардлагатай" }, { status: 400 });
  }
  if (!name) return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  const created = await prisma.adminDeliveryKhoroo.create({
    data: { district_id, name, zone, fee: Math.max(0, fee) },
  });
  return NextResponse.json({ id: created.id });
}

