import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/upload";
import { logAdminAction } from "@/lib/audit";

export async function GET() {
  const categories = await prisma.adminCategory.findMany({
    orderBy: { id: "asc" },
    include: { subcategories: true },
  });

  const result = categories.map((c) => ({
    category_id: c.id,
    category_name: c.category_name,
    category_image: c.category_image,
    description: c.description,
    subcategories: c.subcategories.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
    })),
  }));

  return NextResponse.json(result);
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

  const created = await prisma.adminCategory.create({
    data: {
      category_name: name,
      description: description || null,
      category_image: imageUrl,
    },
  });

  await logAdminAction({
    request,
    action: "CATEGORY_CREATE",
    entityType: "AdminCategory",
    entityId: created.id,
    details: {
      name: created.category_name,
    },
  });

  return NextResponse.json({
    category_id: created.id,
    category_name: created.category_name,
    category_image: created.category_image,
    description: created.description,
    subcategories: [],
  });
}
