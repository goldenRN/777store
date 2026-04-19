import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const districtId = Number(searchParams.get("districtId") ?? "");

  if (!Number.isFinite(districtId) || districtId <= 0) {
    return NextResponse.json({ items: [] });
  }

  const list = await prisma.adminDeliveryKhoroo.findMany({
    where: { district_id: districtId },
    orderBy: [{ id: "asc" }],
    select: { id: true, name: true, zone: true, fee: true, district_id: true },
  });

  return NextResponse.json({ items: list });
}

