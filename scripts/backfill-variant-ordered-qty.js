"use strict";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");
  const orders = await prisma.adminOrder.findMany({
    where: { payment_status: "PAID", order_kind: "preorder" },
    select: { id: true },
  });

  const orderIds = orders.map((o) => o.id);
  if (orderIds.length === 0) {
    console.log("No paid preorder orders found.");
    return;
  }

  const items = await prisma.adminOrderItem.findMany({
    where: {
      order_id: { in: orderIds },
      variant_id: { not: null },
    },
    select: { variant_id: true, quantity: true },
  });

  const totals = new Map();
  for (const it of items) {
    const vid = Number(it.variant_id);
    if (!Number.isFinite(vid)) continue;
    totals.set(vid, (totals.get(vid) || 0) + Number(it.quantity || 0));
  }

  if (totals.size === 0) {
    console.log("No variant order items with variant_id found.");
    return;
  }

  const updates = Array.from(totals.entries()).map(([variantId, qty]) => ({
    variantId,
    qty,
  }));

  console.log(`Variant rows to update: ${updates.length}`);
  if (!apply) {
    console.log("Dry-run only. Add --apply to update ordered_qty.");
    return;
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.adminProductVariant.update({
        where: { id: u.variantId },
        data: { ordered_qty: u.qty },
      })
    )
  );

  console.log("Backfill completed.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
