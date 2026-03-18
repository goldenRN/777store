import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const list = await prisma.adminUnit.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();

  if (!name) {
    return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  }

  const created = await prisma.adminUnit.create({
    data: {
      name,
      description: description || null,
    },
  });

  return NextResponse.json(created);
}
