import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActorFromRequest } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const actor = getActorFromRequest(request);
  if (actor.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);
  const take = Number.isNaN(limit) ? 20 : Math.min(limit, 100);
  const skip = Math.max(page - 1, 0) * take;

  const [total, items] = await Promise.all([
    prisma.adminAuditLog.count(),
    prisma.adminAuditLog.findMany({
      orderBy: { created_at: "desc" },
      take,
      skip,
    }),
  ]);

  return NextResponse.json({ items, total, page, limit: take });
}
