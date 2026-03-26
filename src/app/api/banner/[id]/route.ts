import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/upload";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.adminBanner.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const description = String(formData.get("description") ?? "").trim();
  const image = formData.get("image");

  let imageUrl = existing.image_url;
  if (image && image instanceof File && image.size > 0) {
    const saved = await saveFile(image);
    imageUrl = saved.url;
  }

  const updated = await prisma.adminBanner.update({
    where: { id },
    data: {
      description: description || null,
      image_url: imageUrl,
    },
  });

  return NextResponse.json({
    id: updated.id,
    description: updated.description,
    image_url: updated.image_url,
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

  await prisma.adminBanner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
