import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const list = await prisma.adminSubCategory.findMany({
    orderBy: { id: "asc" },
    include: { category: true },
  });

  return NextResponse.json(
    list.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category_id: s.category_id,
      category_name: s.category?.category_name ?? null,
    }))
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const category_id = Number(body?.category_id);

  if (!name || !category_id) {
    return NextResponse.json({ message: "Нэр болон ангилал шаардлагатай" }, { status: 400 });
  }

  const created = await prisma.adminSubCategory.create({
    data: {
      name,
      description: description || null,
      category_id,
    },
    include: { category: true },
  });

  return NextResponse.json({
    id: created.id,
    name: created.name,
    description: created.description,
    category_id: created.category_id,
    category_name: created.category?.category_name ?? null,
  });
}
