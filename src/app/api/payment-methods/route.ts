import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function GET() {
  const list = await prisma.adminPaymentMethod.findMany({
    orderBy: { id: "asc" },
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const is_active = body?.is_active == null ? true : Boolean(body.is_active);

  if (!name) {
    return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  }

  const created = await prisma.adminPaymentMethod.create({
    data: {
      name,
      description: description || null,
      is_active,
    },
  });

  await logAdminAction({
    request,
    action: "create",
    entityType: "payment_method",
    entityId: String(created.id),
    details: { name, is_active },
  });

  return NextResponse.json(created);
}
