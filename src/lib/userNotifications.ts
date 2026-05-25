import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type NotificationDb = Prisma.TransactionClient | typeof prisma;

type OrderItemNotificationRow = {
  id: number;
  order_id: number;
  product_name: string;
  quantity: number;
  image_url: string | null;
  order: {
    user_id: string | null;
  };
};

const formatProductSummary = (names: string[]) => {
  if (names.length <= 1) return names[0] ?? "Захиалсан бараа";
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} болон бусад`;
};

export async function createArrivedNotificationsByOrderItemIds(
  db: NotificationDb,
  orderItemIds: number[],
) {
  const uniqueIds = Array.from(
    new Set(orderItemIds.filter((id) => Number.isFinite(id) && id > 0)),
  );
  if (uniqueIds.length === 0) return 0;

  const items = await db.adminOrderItem.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      order_id: true,
      product_name: true,
      quantity: true,
      image_url: true,
      order: {
        select: {
          user_id: true,
        },
      },
    },
  });

  const grouped = new Map<string, OrderItemNotificationRow[]>();
  for (const item of items) {
    const userId = item.order.user_id;
    if (!userId) continue;
    const key = `${userId}:${item.order_id}`;
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }

  if (grouped.size === 0) return 0;

  const payloads = Array.from(grouped.values()).map((group) => {
    const first = group[0];
    const productNames = Array.from(
      new Set(
        group
          .map((item) => item.product_name.trim())
          .filter((name) => name.length > 0),
      ),
    );
    const totalQty = group.reduce(
      (sum, item) => sum + Math.max(0, Number(item.quantity || 0)),
      0,
    );
    const title =
      group.length > 1 ? "Таны хэд хэдэн бараа ирлээ" : "Таны бараа ирлээ";
    const body =
      group.length > 1
        ? `Захиалга #${first.order_id}-ийн ${group.length} бараа ирлээ: ${formatProductSummary(productNames)}.`
        : `Захиалга #${first.order_id}-ийн ${productNames[0] ?? "бараа"} бараа ирлээ.`;

    return {
      user_id: first.order.user_id!,
      type: "order_arrived",
      title,
      body,
      order_id: first.order_id,
      metadata: {
        itemIds: group.map((item) => item.id),
        productNames,
        totalQty,
        imageUrl: first.image_url ?? null,
      },
    };
  });

  await db.userNotification.createMany({ data: payloads });
  return payloads.length;
}
