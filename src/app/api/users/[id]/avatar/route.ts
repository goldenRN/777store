import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/upload";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: "file шаардлагатай" }, { status: 400 });
  }

  const saved = await saveFile(file, "uploads");

  const updated = await prisma.user.update({
    where: { id },
    data: { avatarUrl: saved.url },
    select: { id: true, avatarUrl: true },
  });

  return NextResponse.json({ url: saved.url, user: updated });
}
