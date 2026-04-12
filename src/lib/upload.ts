import { mkdir, writeFile, access } from "fs/promises";
import { createHash } from "crypto";
import path from "path";

export type SavedFile = {
  url: string;
  publicId: string;
};

const uploadDir =
  process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim()
    ? process.env.UPLOAD_DIR.trim()
    : path.join(process.cwd(), "public", "uploads");

const publicBase =
  process.env.UPLOAD_PUBLIC_URL && process.env.UPLOAD_PUBLIC_URL.trim()
    ? process.env.UPLOAD_PUBLIC_URL.trim().replace(/\/+$/, "")
    : "/uploads";

export async function saveFile(file: File, folder = "uploads"): Promise<SavedFile> {
  await mkdir(uploadDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const hash = createHash("sha256").update(buffer).digest("hex");
  const ext = path.extname(file.name || "") || ".bin";
  const extLower = ext.toLowerCase();
  const safeName = `${hash}${ext}`;
  const filePath = path.join(uploadDir, safeName);

  try {
    await access(filePath);
  } catch {
    let wroteOptimized = false;
    const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(extLower);
    if (isImage) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sharp = require("sharp") as any;
        if (sharp) {
          // Force sRGB to avoid color shifts on some devices (e.g. CMYK/P3 uploads).
          let pipeline = sharp(buffer, { failOnError: false }).rotate();
          if (typeof pipeline.toColourspace === "function") {
            pipeline = pipeline.toColourspace("srgb");
          }
          // Do NOT embed ICC metadata: some iOS decoders behave poorly with profiles.
          const resized = pipeline.resize({ width: 1600, withoutEnlargement: true });
          if (extLower === ".jpg" || extLower === ".jpeg") {
            await writeFile(
              filePath,
              await resized.jpeg({ quality: 78, progressive: false, mozjpeg: false }).toBuffer()
            );
          } else if (extLower === ".png") {
            await writeFile(filePath, await resized.png({ compressionLevel: 9 }).toBuffer());
          } else if (extLower === ".webp") {
            await writeFile(filePath, await resized.webp({ quality: 78 }).toBuffer());
          } else {
            await writeFile(filePath, buffer);
          }
          wroteOptimized = true;
        }
      } catch {
        // ignore
      }
    }
    if (!wroteOptimized) {
      await writeFile(filePath, buffer);
    }
  }

  const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(extLower);
  if (isImage) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sharp = require("sharp") as any;
      if (sharp) {
        const thumbName = `${hash}_sm.jpg`;
        const thumbPath = path.join(uploadDir, thumbName);
        try {
          await access(thumbPath);
        } catch {
          let pipeline = sharp(buffer, { failOnError: false }).rotate();
          if (typeof pipeline.toColourspace === "function") {
            pipeline = pipeline.toColourspace("srgb");
          }
          const outputBuffer = await pipeline
            .resize({ width: 600, withoutEnlargement: true })
            .jpeg({ quality: 72, progressive: false, mozjpeg: false })
            .toBuffer();
          await writeFile(thumbPath, outputBuffer);
        }
      }
    } catch {
      // ignore thumb failures
    }
  }

  return {
    url: `${publicBase}/${safeName}`,
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
      let pipeline = sharp(buffer, { failOnError: false }).rotate();
      if (typeof pipeline.toColourspace === "function") {
        pipeline = pipeline.toColourspace("srgb");
      }
      const outputBuffer = await pipeline
        .resize({ width: 2000, withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: false, mozjpeg: false })
        .toBuffer();
      const safeName = `${baseName}.jpg`;
      const filePath = path.join(uploadDir, safeName);
      await writeFile(filePath, outputBuffer);
      return {
        url: `${publicBase}/${safeName}`,
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
    url: `${publicBase}/${safeName}`,
    publicId: safeName,
  };
}
