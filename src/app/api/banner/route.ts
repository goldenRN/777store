import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveBannerFile } from "@/lib/upload";

export async function GET() {
  const list = await prisma.adminBanner.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(
    list.map((b) => ({
      id: b.id,
      description: b.description,
      image_url: b.image_url,
    }))
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const description = String(formData.get("description") ?? "").trim();
  const image = formData.get("image");

  let imageUrl: string | null = null;
  if (image && image instanceof File && image.size > 0) {
    const saved = await saveBannerFile(image);
    imageUrl = saved.url;
  }

  const created = await prisma.adminBanner.create({
    data: {
      description: description || null,
      image_url: imageUrl,
    },
  });

  return NextResponse.json({
    id: created.id,
    description: created.description,
    image_url: created.image_url,
  });
}
