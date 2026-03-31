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

// Banner зураг шахаж хадгалах (sharp байвал ашиглана)
export async function saveBannerFile(file: File, folder = "uploads"): Promise<SavedFile> {
  await mkdir(uploadDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-banner`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require("sharp") as any;
    if (sharp) {
      const outputBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: 2000, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      const safeName = `${baseName}.jpg`;
      const filePath = path.join(uploadDir, safeName);
      await writeFile(filePath, outputBuffer);
      return {
        url: `/${folder}/${safeName}`,
        publicId: safeName,
      };
    }
  } catch {
    // fall back to original file
  }

  const originalExt = path.extname(file.name || "") || ".jpg";
  const safeName = `${baseName}${originalExt}`;
  const filePath = path.join(uploadDir, safeName);
  await writeFile(filePath, buffer);
  return {
    url: `/${folder}/${safeName}`,
    publicId: safeName,
  };
}
