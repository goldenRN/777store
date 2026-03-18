import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const page = Number(searchParams.get("page") ?? 1);
  const take = Number.isNaN(limit) ? DEFAULT_LIMIT : Math.min(limit, 100);
  const skip = Math.max(page - 1, 0) * take;

  const where: Record<string, unknown> = { status: "ACTIVE" };

  if (type) {
    where.type = type;
  }

  if (category) {
    where.category = { slug: category };
  }

  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { category: true },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit: take });
}
