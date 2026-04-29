"use strict";

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Convert existing HEIC/HEIF uploads to JPG, generate `_sm.jpg` thumbs,
 * and update DB image URLs to the new `.jpg` path.
 *
 * Usage:
 *   node scripts/convert-heic-uploads.js
 *   node scripts/convert-heic-uploads.js --apply
 *   node scripts/convert-heic-uploads.js --dir /path/to/uploads --apply
 */

const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const apply = args.includes("--apply");

const dirFlagIdx = args.findIndex((a) => a === "--dir");
const dir =
  (dirFlagIdx >= 0 && args[dirFlagIdx + 1]) ||
  (process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim()) ||
  path.join(process.cwd(), "public", "uploads");

const heicExts = new Set([".heic", ".heif"]);

function normalizeUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  let cleaned = raw.split("#")[0].split("?")[0];
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    try {
      const parsed = new URL(cleaned);
      if (parsed.pathname && parsed.pathname.includes("/uploads/")) return parsed.pathname;
      return cleaned;
    } catch {
      return cleaned;
    }
  }
  if (cleaned.startsWith("uploads/")) return `/${cleaned}`;
  if (cleaned.startsWith("/uploads/")) return cleaned;
  if (cleaned.startsWith("/")) return cleaned;
  return `/uploads/${cleaned}`;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listHeicFiles(uploadDir) {
  const entries = await fs.readdir(uploadDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => heicExts.has(path.extname(name).toLowerCase()));
}

async function convertOne(uploadDir, filename) {
  const ext = path.extname(filename).toLowerCase();
  const base = filename.slice(0, -ext.length);
  const oldPath = path.join(uploadDir, filename);
  const newName = `${base}.jpg`;
  const newPath = path.join(uploadDir, newName);
  const thumbName = `${base}_sm.jpg`;
  const thumbPath = path.join(uploadDir, thumbName);
  const oldUrl = `/uploads/${filename}`;
  const newUrl = `/uploads/${newName}`;

  const input = await fs.readFile(oldPath);

  let pipeline = sharp(input, { failOnError: false }).rotate();
  if (typeof pipeline.toColourspace === "function") {
    pipeline = pipeline.toColourspace("srgb");
  }

  const mainBuf = await pipeline
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 78, progressive: false, mozjpeg: false })
    .toBuffer();

  let thumbPipeline = sharp(input, { failOnError: false }).rotate();
  if (typeof thumbPipeline.toColourspace === "function") {
    thumbPipeline = thumbPipeline.toColourspace("srgb");
  }
  const thumbBuf = await thumbPipeline
    .resize({ width: 600, withoutEnlargement: true })
    .jpeg({ quality: 72, progressive: false, mozjpeg: false })
    .toBuffer();

  if (!apply) {
    return {
      filename,
      newName,
      oldUrl,
      newUrl,
      alreadyConverted: await fileExists(newPath),
    };
  }

  await fs.writeFile(newPath, mainBuf);
  await fs.writeFile(thumbPath, thumbBuf);

  return { filename, newName, oldUrl, newUrl, alreadyConverted: false };
}

async function updateDatabaseUrls(oldUrl, newUrl, newName) {
  const tasks = [];

  tasks.push(
    prisma.adminProductImage.updateMany({
      where: { image_url: oldUrl },
      data: { image_url: newUrl, public_id: newName },
    })
  );
  tasks.push(
    prisma.adminBrand.updateMany({
      where: { image_url: oldUrl },
      data: { image_url: newUrl },
    })
  );
  tasks.push(
    prisma.adminBanner.updateMany({
      where: { image_url: oldUrl },
      data: { image_url: newUrl },
    })
  );
  tasks.push(
    prisma.adminCategory.updateMany({
      where: { category_image: oldUrl },
      data: { category_image: newUrl },
    })
  );
  tasks.push(
    prisma.user.updateMany({
      where: { avatarUrl: oldUrl },
      data: { avatarUrl: newUrl },
    })
  );
  tasks.push(
    prisma.adminOrderItem.updateMany({
      where: { image_url: oldUrl },
      data: { image_url: newUrl },
    })
  );
  tasks.push(
    prisma.adminDeliveryOrderItem.updateMany({
      where: { image_url: oldUrl },
      data: { image_url: newUrl },
    })
  );
  tasks.push(
    prisma.product.updateMany({
      where: { thumbnailUrl: oldUrl },
      data: { thumbnailUrl: newUrl },
    })
  );

  const products = await prisma.product.findMany({
    where: { images: { has: oldUrl } },
    select: { id: true, images: true },
  });
  for (const product of products) {
    const nextImages = product.images.map((img) => (normalizeUrl(img) === oldUrl ? newUrl : img));
    tasks.push(
      prisma.product.update({
        where: { id: product.id },
        data: { images: nextImages },
      })
    );
  }

  return Promise.all(tasks);
}

async function cleanupOldFile(uploadDir, filename) {
  const oldPath = path.join(uploadDir, filename);
  if (await fileExists(oldPath)) {
    await fs.unlink(oldPath);
  }
}

async function main() {
  console.log(`Uploads dir: ${dir}`);
  console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN"}`);

  const files = await listHeicFiles(dir);
  if (files.length === 0) {
    console.log("HEIC/HEIF зураг олдсонгүй.");
    return;
  }

  console.log(`HEIC/HEIF зураг олдлоо: ${files.length}`);

  for (const filename of files) {
    try {
      const result = await convertOne(dir, filename);
      console.log(`- ${result.filename} -> ${result.newName}${result.alreadyConverted ? " (jpg already exists)" : ""}`);
      if (!apply) continue;
      await updateDatabaseUrls(result.oldUrl, result.newUrl, result.newName);
      await cleanupOldFile(dir, filename);
    } catch (error) {
      console.error(`Failed: ${filename}`, error?.message || error);
    }
  }

  if (!apply) {
    console.log("Dry-run тул өөрчлөлт хийгдээгүй. Жинхэнээсээ хийх бол --apply нэмээрэй.");
  } else {
    console.log("HEIC/HEIF зураг JPG болгож хөрвүүлж, DB URL шинэчлэл дууслаа.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
