/* eslint-disable no-console */
const fs = require("fs/promises");
const path = require("path");

const ROOT = path.join(process.cwd(), "public", "uploads");
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch (err) {
    console.error("sharp not installed. Please add it to dependencies.");
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const files = await walk(ROOT);
  let processed = 0;
  let skipped = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!EXTENSIONS.has(ext)) {
      skipped += 1;
      continue;
    }
    const base = path.basename(file, ext);
    if (base.endsWith("_sm")) {
      skipped += 1;
      continue;
    }

    try {
      const buffer = await fs.readFile(file);
      const pipeline = sharp(buffer).rotate().resize({ width: 1600, withoutEnlargement: true });
      if (ext === ".jpg" || ext === ".jpeg") {
        await fs.writeFile(file, await pipeline.jpeg({ quality: 75 }).toBuffer());
      } else if (ext === ".png") {
        await fs.writeFile(file, await pipeline.png({ compressionLevel: 9 }).toBuffer());
      } else if (ext === ".webp") {
        await fs.writeFile(file, await pipeline.webp({ quality: 75 }).toBuffer());
      }

      const thumbName = `${base}_sm.jpg`;
      const thumbPath = path.join(path.dirname(file), thumbName);
      if (force) {
        await fs.rm(thumbPath, { force: true });
      }
      try {
        await fs.access(thumbPath);
      } catch {
        const thumbBuffer = await sharp(buffer)
          .rotate()
          .resize({ width: 600, withoutEnlargement: true })
          .jpeg({ quality: 70 })
          .toBuffer();
        await fs.writeFile(thumbPath, thumbBuffer);
      }

      processed += 1;
    } catch (err) {
      console.error("Failed:", file, err?.message || err);
      skipped += 1;
    }
  }

  console.log(`Processed: ${processed}, Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
