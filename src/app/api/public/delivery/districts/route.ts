import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const list = await prisma.adminDeliveryDistrict.findMany({
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });
  return NextResponse.json({ items: list });
}

