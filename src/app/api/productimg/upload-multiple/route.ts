import { NextResponse } from "next/server";
import { saveFiles } from "@/lib/upload";

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("images").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ message: "No files" }, { status: 400 });
  }

  const saved = await saveFiles(files);
  return NextResponse.json({
    images: saved.map((file) => ({
      imageUrl: file.url,
      public_id: file.publicId,
    })),
  });
}
