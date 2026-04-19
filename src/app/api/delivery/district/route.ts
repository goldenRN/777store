import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.adminDeliveryDistrict.findMany({
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const sort_order = Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0;
  if (!name) return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  const created = await prisma.adminDeliveryDistrict.create({
    data: { name, sort_order: Math.floor(sort_order) },
  });
  return NextResponse.json({ id: created.id });
}

