"use strict";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  let cleaned = raw.split("#")[0].split("?")[0];
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    try {
      const parsed = new URL(cleaned);
      if (parsed.pathname && parsed.pathname.includes("/uploads/")) {
        return parsed.pathname;
      }
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

function pickCanonical(urls) {
  const list = Array.from(urls);
  if (list.length === 0) return "";
  list.sort((a, b) => {
    const aLocal = a.startsWith("/uploads/");
    const bLocal = b.startsWith("/uploads/");
    if (aLocal !== bLocal) return aLocal ? -1 : 1;
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  });
  return list[0];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const images = await prisma.adminProductImage.findMany({
    select: {
      id: true,
      image_url: true,
      product_id: true,
      product_variant_id: true,
    },
  });

  const groups = new Map();
  for (const img of images) {
    if (!img.image_url) continue;
    const norm = normalizeUrl(img.image_url);
    if (!norm) continue;
    if (!groups.has(norm)) {
      groups.set(norm, { norm, urls: new Set() });
    }
    groups.get(norm).urls.add(img.image_url);
  }

  const canonicalByNorm = new Map();
  for (const [norm, data] of groups.entries()) {
    canonicalByNorm.set(norm, pickCanonical(data.urls));
  }

  const updates = [];
  for (const img of images) {
    if (!img.image_url) continue;
    const norm = normalizeUrl(img.image_url);
    const canonical = canonicalByNorm.get(norm);
    if (canonical && canonical !== img.image_url) {
      updates.push({ id: img.id, from: img.image_url, to: canonical });
    }
  }

  if (updates.length === 0) {
    console.log("No URL updates needed.");
  } else {
    console.log(`URL updates needed: ${updates.length}`);
    if (!apply) {
      console.log("Dry-run only. Add --apply to execute updates.");
    } else {
      for (const u of updates) {
        // update one by one to keep it simple and safe
        await prisma.adminProductImage.update({
          where: { id: u.id },
          data: { image_url: u.to },
        });
      }
      console.log("URL updates applied.");
    }
  }

  const effectiveUrl = (img) => {
    if (!img.image_url) return "";
    const norm = normalizeUrl(img.image_url);
    const canonical = canonicalByNorm.get(norm);
    return canonical || img.image_url;
  };

  const dupMap = new Map();
  for (const img of images) {
    const url = effectiveUrl(img);
    if (!url) continue;
    const key = `${img.product_id ?? "null"}|${img.product_variant_id ?? "null"}|${url}`;
    if (!dupMap.has(key)) dupMap.set(key, []);
    dupMap.get(key).push(img.id);
  }

  const duplicateIds = [];
  for (const ids of dupMap.values()) {
    if (ids.length > 1) {
      ids.sort((a, b) => a - b);
      duplicateIds.push(...ids.slice(1));
    }
  }

  if (duplicateIds.length === 0) {
    console.log("No duplicate rows to delete.");
  } else {
    console.log(`Duplicate rows to delete: ${duplicateIds.length}`);
    if (!apply) {
      console.log("Dry-run only. Add --apply to delete duplicates.");
    } else {
      await prisma.adminProductImage.deleteMany({
        where: { id: { in: duplicateIds } },
      });
      console.log("Duplicate rows deleted.");
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
