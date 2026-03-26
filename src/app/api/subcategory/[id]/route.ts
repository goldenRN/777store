import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const found = await prisma.adminSubCategory.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!found) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: found.id,
    name: found.name,
    description: found.description,
    category_id: found.category_id,
    category_name: found.category?.category_name ?? null,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const category_id = Number(body?.category_id);

  if (!name || !category_id) {
    return NextResponse.json({ message: "Нэр болон ангилал шаардлагатай" }, { status: 400 });
  }

  const updated = await prisma.adminSubCategory.update({
    where: { id },
    data: {
      name,
      description: description || null,
      category_id,
    },
    include: { category: true },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    category_id: updated.category_id,
    category_name: updated.category?.category_name ?? null,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  await prisma.adminSubCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
