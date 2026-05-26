import { mkdir, writeFile, access } from "fs/promises";
import { createHash } from "crypto";
import path from "path";
import sharp from "sharp";

export type SavedFile = {
  url: string;
  publicId: string;
};

const PRODUCT_IMAGE_MAX_WIDTH = 1440;
const PRODUCT_IMAGE_JPEG_QUALITY = 74;
const PRODUCT_THUMB_MAX_WIDTH = 420;
const PRODUCT_THUMB_JPEG_QUALITY = 68;
const BANNER_IMAGE_MAX_WIDTH = 1800;
const BANNER_IMAGE_JPEG_QUALITY = 80;

const uploadDir =
  process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim()
    ? process.env.UPLOAD_DIR.trim()
    : path.join(process.cwd(), "public", "uploads");

const publicBase =
  process.env.UPLOAD_PUBLIC_URL && process.env.UPLOAD_PUBLIC_URL.trim()
    ? process.env.UPLOAD_PUBLIC_URL.trim().replace(/\/+$/, "")
    : "/uploads";

const resolveTarget = (folder = "uploads") => {
  const cleanFolder = folder.trim().replace(/^\/+|\/+$/g, "");
  const isRootUploads = !cleanFolder || cleanFolder === "uploads";
  const targetDir = isRootUploads ? uploadDir : path.join(uploadDir, cleanFolder);
  const targetBase = isRootUploads ? publicBase : `${publicBase}/${cleanFolder}`;
  return { targetDir, targetBase };
};

export async function saveFile(file: File, folder = "uploads"): Promise<SavedFile> {
  const { targetDir, targetBase } = resolveTarget(folder);
  await mkdir(targetDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const hash = createHash("sha256").update(buffer).digest("hex");
  const ext = path.extname(file.name || "") || ".bin";
  const extLower = ext.toLowerCase();
  const heicLikeExts = [".heic", ".heif"];
  const optimizableImageExts = [".jpg", ".jpeg", ".png", ".webp", ...heicLikeExts];
  const outputExt = heicLikeExts.includes(extLower) ? ".jpg" : extLower;
  const safeName = `${hash}${outputExt}`;
  const filePath = path.join(targetDir, safeName);

  try {
    await access(filePath);
  } catch {
    let wroteOptimized = false;
    const isImage = optimizableImageExts.includes(extLower);
    if (isImage) {
      try {
        // Force sRGB to avoid color shifts on some devices (e.g. CMYK/P3 uploads).
        let pipeline = sharp(buffer, { failOnError: false }).rotate();
        if (typeof pipeline.toColourspace === "function") {
          pipeline = pipeline.toColourspace("srgb");
        }
        // Do NOT embed ICC metadata: some iOS decoders behave poorly with profiles.
        const resized = pipeline.resize({
          width: PRODUCT_IMAGE_MAX_WIDTH,
          withoutEnlargement: true,
        });
        if (extLower === ".jpg" || extLower === ".jpeg" || heicLikeExts.includes(extLower)) {
          await writeFile(
            filePath,
            await resized
              .jpeg({
                quality: PRODUCT_IMAGE_JPEG_QUALITY,
                progressive: false,
                mozjpeg: false,
              })
              .toBuffer()
          );
        } else if (extLower === ".png") {
          await writeFile(filePath, await resized.png({ compressionLevel: 9 }).toBuffer());
        } else if (extLower === ".webp") {
          await writeFile(
            filePath,
            await resized.webp({ quality: PRODUCT_IMAGE_JPEG_QUALITY }).toBuffer()
          );
        } else {
          await writeFile(filePath, buffer);
        }
        wroteOptimized = true;
      } catch {
        // ignore
      }
    }
    if (!wroteOptimized) {
      await writeFile(filePath, buffer);
    }
  }

  const isImage = optimizableImageExts.includes(extLower);
  if (isImage) {
    try {
      const thumbName = `${hash}_sm.jpg`;
      const thumbPath = path.join(targetDir, thumbName);
      try {
        await access(thumbPath);
      } catch {
        let pipeline = sharp(buffer, { failOnError: false }).rotate();
        if (typeof pipeline.toColourspace === "function") {
          pipeline = pipeline.toColourspace("srgb");
        }
        const outputBuffer = await pipeline
          .resize({
            width: PRODUCT_THUMB_MAX_WIDTH,
            withoutEnlargement: true,
          })
          .jpeg({
            quality: PRODUCT_THUMB_JPEG_QUALITY,
            progressive: false,
            mozjpeg: false,
          })
          .toBuffer();
        await writeFile(thumbPath, outputBuffer);
      }
    } catch {
      // ignore thumb failures
    }
  }

  return {
    url: `${targetBase}/${safeName}`,
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
  const { targetDir, targetBase } = resolveTarget(folder);
  await mkdir(targetDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-banner`;

  try {
    let pipeline = sharp(buffer, { failOnError: false }).rotate();
    if (typeof pipeline.toColourspace === "function") {
      pipeline = pipeline.toColourspace("srgb");
    }
    const outputBuffer = await pipeline
      .resize({ width: BANNER_IMAGE_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({
        quality: BANNER_IMAGE_JPEG_QUALITY,
        progressive: false,
        mozjpeg: false,
      })
      .toBuffer();
    const safeName = `${baseName}.jpg`;
    const filePath = path.join(targetDir, safeName);
    await writeFile(filePath, outputBuffer);
    return {
      url: `${targetBase}/${safeName}`,
      publicId: safeName,
    };
  } catch {
    // fall back to original file
  }

  const originalExt = path.extname(file.name || "") || ".jpg";
  const safeName = `${baseName}${originalExt}`;
  const filePath = path.join(targetDir, safeName);
  await writeFile(filePath, buffer);
  return {
    url: `${targetBase}/${safeName}`,
    publicId: safeName,
  };
}
