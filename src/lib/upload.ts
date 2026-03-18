import { mkdir, writeFile } from "fs/promises";
import path from "path";

export type SavedFile = {
  url: string;
  publicId: string;
};

const uploadDir = path.join(process.cwd(), "public", "uploads");

export async function saveFile(file: File, folder = "uploads"): Promise<SavedFile> {
  await mkdir(uploadDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
  const filePath = path.join(uploadDir, safeName);

  await writeFile(filePath, buffer);

  return {
    url: `/${folder}/${safeName}`,
    publicId: safeName,
  };
}

export async function saveFiles(files: File[], folder = "uploads"): Promise<SavedFile[]> {
  const saved: SavedFile[] = [];
  for (const file of files) {
    saved.push(await saveFile(file, folder));
  }
  return saved;
}
