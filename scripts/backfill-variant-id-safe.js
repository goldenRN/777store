"use strict";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeImage(input) {
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

async function main() {
  const apply = process.argv.includes("--apply");

  const items = await prisma.adminOrderItem.findMany({
    where: { variant_id: null, product_id: { not: null } },
    select: { id: true, product_id: true, image_url: true, price: true },
  });

  if (items.length === 0) {
    console.log("No order items with missing variant_id.");
    return;
  }

  const productIds = Array.from(new Set(items.map((i) => Number(i.product_id))));
  const products = await prisma.adminProduct.findMany({
    where: { id: { in: productIds } },
    include: { variants: { include: { images: true } } },
  });

  const variantsByProduct = new Map();
  const imageIndex = new Map();
  const priceIndex = new Map();

  for (const p of products) {
    const variants = p.variants || [];
    variantsByProduct.set(p.id, variants);
    const byImage = new Map();
    const byPrice = new Map();
    for (const v of variants) {
      if (v.price != null) {
        const price = Number(v.price);
        if (!byPrice.has(price)) byPrice.set(price, []);
        byPrice.get(price).push(v.id);
      }
      (v.images || []).forEach((img) => {
        const norm = normalizeImage(img.image_url);
        if (!norm) return;
        if (!byImage.has(norm)) byImage.set(norm, []);
        byImage.get(norm).push(v.id);
      });
    }
    imageIndex.set(p.id, byImage);
    priceIndex.set(p.id, byPrice);
  }

  const updates = [];
  const skipped = [];
  const reasons = { single_variant: 0, image: 0, price: 0 };

  for (const it of items) {
    const productId = Number(it.product_id);
    const variants = variantsByProduct.get(productId) || [];
    let picked = null;
    let reason = "";

    if (variants.length === 1) {
      picked = variants[0].id;
      reason = "single_variant";
    } else {
      const normImage = normalizeImage(it.image_url);
      if (normImage) {
        const candidates = imageIndex.get(productId)?.get(normImage) || [];
        if (candidates.length === 1) {
          picked = candidates[0];
          reason = "image";
        }
      }
      if (!picked && it.price != null) {
        const candidates = priceIndex.get(productId)?.get(Number(it.price)) || [];
        if (candidates.length === 1) {
          picked = candidates[0];
          reason = "price";
        }
      }
    }

    if (picked) {
      updates.push({ id: it.id, variant_id: picked, reason });
      if (reason && reasons[reason] != null) reasons[reason] += 1;
    } else {
      skipped.push(it.id);
    }
  }

  console.log(`Eligible updates: ${updates.length}`);
  console.log(`Skipped (no safe match): ${skipped.length}`);
  console.log(
    `Reasons: single_variant=${reasons.single_variant}, image=${reasons.image}, price=${reasons.price}`
  );

  if (!apply) {
    console.log("Dry-run only. Add --apply to update variant_id.");
    const report = {
      updated_count: updates.length,
      skipped_count: skipped.length,
      reasons,
      updates: updates.slice(0, 500),
      skipped: skipped.slice(0, 500),
    };
    const fs = require("fs");
    const path = require("path");
    const outPath = path.join(process.cwd(), "scripts", "backfill-variant-id-safe.report.json");
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Report saved: ${outPath}`);
    return;
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.adminOrderItem.update({
        where: { id: u.id },
        data: { variant_id: u.variant_id },
      })
    )
  );

  const fs = require("fs");
  const path = require("path");
  const outPath = path.join(process.cwd(), "scripts", "backfill-variant-id-safe.applied.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        updated_count: updates.length,
        skipped_count: skipped.length,
        reasons,
      },
      null,
      2
    )
  );
  console.log(`Applied report saved: ${outPath}`);
  console.log("Backfill variant_id completed.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
