import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
  const limit = Math.max(Number(searchParams.get("limit") ?? 20), 1);

  const where =
    q.length > 0
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            ...(Number.isFinite(Number(q)) ? [{ id: String(q) }] : []),
          ],
        }
      : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
  ]);

  const userIds = users.map((u) => u.id);
  const orderAgg = await prisma.adminOrder.groupBy({
    by: ["user_id"],
    where: { user_id: { in: userIds } },
    _count: { _all: true },
    _sum: { total: true },
  });
  const orderMap = new Map(
    orderAgg.map((o) => [o.user_id, { count: o._count._all, total: o._sum.total ?? 0 }])
  );

  const data = users.map((u) => ({
    ...u,
    orderCount: orderMap.get(u.id)?.count ?? 0,
    totalSpent: orderMap.get(u.id)?.total ?? 0,
  }));

  const pages = Math.max(Math.ceil(total / limit), 1);
  return NextResponse.json({ data, meta: { page, limit, total, pages } });
}
