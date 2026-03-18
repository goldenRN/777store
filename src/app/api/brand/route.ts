import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/upload";

export async function GET() {
  const list = await prisma.adminBrand.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(
    list.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      image_url: b.image_url,
    }))
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const image = formData.get("image");

  if (!name) {
    return NextResponse.json({ message: "Нэр шаардлагатай" }, { status: 400 });
  }

  let imageUrl: string | null = null;
  if (image && image instanceof File && image.size > 0) {
    const saved = await saveFile(image);
    imageUrl = saved.url;
  }

  const created = await prisma.adminBrand.create({
    data: {
      name,
      description: description || null,
      image_url: imageUrl,
    },
  });

  return NextResponse.json({
    id: created.id,
    name: created.name,
    description: created.description,
    image_url: created.image_url,
  });
}
