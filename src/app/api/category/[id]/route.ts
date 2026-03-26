import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/upload";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const category = await prisma.adminCategory.findUnique({
    where: { id },
    include: { subcategories: true },
  });

  if (!category) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    category_id: category.id,
    category_name: category.category_name,
    category_image: category.category_image,
    description: category.description,
    subcategories: category.subcategories.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
    })),
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

  const existing = await prisma.adminCategory.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const image = formData.get("image");

  if (!name) {
    return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  }

  let imageUrl = existing.category_image;
  if (image && image instanceof File && image.size > 0) {
    const saved = await saveFile(image);
    imageUrl = saved.url;
  }

  const updated = await prisma.adminCategory.update({
    where: { id },
    data: {
      category_name: name,
      description: description || null,
      category_image: imageUrl,
    },
  });

  return NextResponse.json({
    category_id: updated.id,
    category_name: updated.category_name,
    category_image: updated.category_image,
    description: updated.description,
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

  await prisma.adminCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
