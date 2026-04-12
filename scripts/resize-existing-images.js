/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Re-encode existing uploads to sRGB (fixes green/purple shifts on some devices)
 * and generate `_sm.jpg` thumbnails.
 *
 * Usage:
 *   node scripts/resize-existing-images.js               # dry-run
 *   node scripts/resize-existing-images.js --apply       # overwrite originals + generate thumbs
 *   node scripts/resize-existing-images.js --dir /path/to/uploads --apply
 *
 * Notes:
 * - Keeps the same original filenames (so DB URLs don't need updates)
 * - Creates thumb as `${basename}_sm.jpg` for every image
 */

const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const args = process.argv.slice(2);
const apply = args.includes("--apply");

const dirFlagIdx = args.findIndex((a) => a === "--dir");
const dir =
  (dirFlagIdx >= 0 && args[dirFlagIdx + 1]) ||
  (process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim()) ||
  path.join(process.cwd(), "public", "uploads");

const exts = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function isImageFile(name) {
  const ext = path.extname(name).toLowerCase();
  return exts.has(ext);
}

async function listFiles(uploadDir) {
  const entries = await fs.readdir(uploadDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => isImageFile(name));
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function reencodeOne(uploadDir, filename) {
  const full = path.join(uploadDir, filename);
  const ext = path.extname(filename).toLowerCase();
  const base = filename.slice(0, -ext.length);

  // Always create thumbs as `${basename}_sm.jpg`
  const thumbName = `${base}_sm.jpg`;
  const thumbPath = path.join(uploadDir, thumbName);

  // Skip thumbs in "main file" pass; they will be (re)generated from the original.
  if (filename.endsWith("_sm.jpg")) return { skipped: true };

  const input = await fs.readFile(full);

  // Pipeline: rotate + sRGB + resize(1600)
  let img = sharp(input, { failOnError: false }).rotate();
  if (typeof img.toColourspace === "function") img = img.toColourspace("srgb");
  // Do NOT embed ICC metadata: some iOS decoders behave poorly with profiles.

  const main = img.resize({ width: 1600, withoutEnlargement: true });

  // Encode output in the same extension (keep URLs stable)
  let mainBuf;
  if (ext === ".jpg" || ext === ".jpeg") {
    mainBuf = await main.jpeg({ quality: 78, progressive: false, mozjpeg: false }).toBuffer();
  } else if (ext === ".png") {
    mainBuf = await main.png({ compressionLevel: 9 }).toBuffer();
  } else if (ext === ".webp") {
    mainBuf = await main.webp({ quality: 78 }).toBuffer();
  } else {
    return { skipped: true };
  }

  // Thumb pipeline: 600px wide JPEG
  let thumbImg = sharp(input, { failOnError: false }).rotate();
  if (typeof thumbImg.toColourspace === "function") thumbImg = thumbImg.toColourspace("srgb");
  const thumbBuf = await thumbImg
    .resize({ width: 600, withoutEnlargement: true })
    .jpeg({ quality: 72, progressive: false, mozjpeg: false })
    .toBuffer();

  const existedThumb = await fileExists(thumbPath);

  if (!apply) {
    return { changed: true, thumbCreated: !existedThumb };
  }

  // Write main safely via temp file then rename.
  const tmp = `${full}.tmp`;
  await fs.writeFile(tmp, mainBuf);
  await fs.rename(tmp, full);

  if (!existedThumb) {
    await fs.writeFile(thumbPath, thumbBuf);
  } else {
    // Always refresh thumbs too (fix colors there as well)
    await fs.writeFile(thumbPath, thumbBuf);
  }

  return { changed: true, thumbCreated: true };
}

async function run() {
  console.log(`Uploads dir: ${dir}`);
  console.log(`Mode: ${apply ? "APPLY (overwrite)" : "DRY-RUN"}`);

  const files = await listFiles(dir);
  const mains = files.filter((f) => !f.endsWith("_sm.jpg"));
  console.log(`Found images: ${files.length} (main: ${mains.length}, thumbs: ${files.length - mains.length})`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  let thumbs = 0;

  // Small concurrency to avoid memory spikes
  const concurrency = 4;
  let idx = 0;
  async function worker() {
    while (idx < mains.length) {
      const i = idx++;
      const name = mains[i];
      try {
        const res = await reencodeOne(dir, name);
        if (res?.skipped) {
          skipped += 1;
        } else {
          ok += 1;
          if (res?.thumbCreated) thumbs += 1;
        }
      } catch (e) {
        failed += 1;
        console.error(`Failed: ${name} ->`, e?.message || e);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }).map(() => worker()));

  console.log(`Done. ok=${ok}, skipped=${skipped}, failed=${failed}, thumbs_written=${thumbs}`);
  if (!apply) {
    console.log(`Re-run with --apply to actually overwrite files.`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
