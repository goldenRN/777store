import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActorFromRequest } from "@/lib/audit";

type ActionStatus = "Бараа олгосон" | "Хүргэлтэнд бүртгэгдсэн" | "Буцаагдсан";

type ExpandedAuditItem = {
  itemId: number;
  createdAt: Date;
  actorName: string | null;
  actorPhone: string | null;
  status: ActionStatus;
  note: string | null;
};

const ALLOWED_ACTIONS = [
  "ORDER_ITEMS_BULK_STATUS",
  "ORDER_ITEM_DELIVERY_REGISTERED",
] as const;

const isAllowedRole = (role?: string | null) => {
  const norm = String(role || "").toUpperCase().replace(/\s+/g, "_");
  return norm === "SUPER_ADMIN" || norm === "ADMIN";
};

const parseDateRange = (raw?: string | null) => {
  const value = String(raw || "").trim();
  if (!value) return null;
  const start = new Date(`${value}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const parsePresetRange = (raw?: string | null) => {
  const preset = String(raw || "").trim().toLowerCase();
  if (!preset) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preset === "today") {
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    return { start: today, end };
  }
  if (preset === "yesterday") {
    const start = new Date(today);
    start.setDate(start.getDate() - 1);
    return { start, end: today };
  }
  if (preset === "7d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  return null;
};

const normalizeActionStatus = (value?: string | null): ActionStatus | null => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes("олгосон")) return "Бараа олгосон";
  if (raw.includes("хүргэлт")) return "Хүргэлтэнд бүртгэгдсэн";
  if (raw.includes("буца")) return "Буцаагдсан";
  return null;
};

export async function GET(request: NextRequest) {
  const actor = getActorFromRequest(request);
  if (!isAllowedRole(actor.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
  const range = parsePresetRange(searchParams.get("preset")) ?? parseDateRange(searchParams.get("date"));
  const statusFilter = normalizeActionStatus(searchParams.get("status"));

  const auditLogs = await prisma.adminAuditLog.findMany({
    where: {
      action: { in: [...ALLOWED_ACTIONS] },
      ...(range
        ? {
            created_at: {
              gte: range.start,
              lt: range.end,
            },
          }
        : {}),
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  const expanded: ExpandedAuditItem[] = auditLogs.flatMap<ExpandedAuditItem>((log) => {
    const details = (log.details ?? {}) as Record<string, unknown>;
    if (log.action === "ORDER_ITEM_DELIVERY_REGISTERED") {
      const itemId = Number(details.item_id ?? log.entity_id ?? "");
      if (!Number.isFinite(itemId)) return [];
      return [
        {
          itemId,
          createdAt: log.created_at,
          actorName: log.actor_name ?? null,
          actorPhone: log.actor_phone ?? null,
          status: "Хүргэлтэнд бүртгэгдсэн" as ActionStatus,
          note: null,
        },
      ];
    }

    const status = normalizeActionStatus(String(details.status ?? ""));
    if (!status || (status !== "Бараа олгосон" && status !== "Буцаагдсан")) return [];
    const itemIds = Array.isArray(details.itemIds)
      ? details.itemIds
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
      : [];
    if (itemIds.length === 0) return [];
    const note =
      status === "Буцаагдсан" ? String(details.returnNote ?? "").trim() || null : null;
    return itemIds.map((itemId) => ({
      itemId,
      createdAt: log.created_at,
      actorName: log.actor_name ?? null,
      actorPhone: log.actor_phone ?? null,
      status,
      note,
    }));
  });

  const deduped: ExpandedAuditItem[] = expanded
    .filter((entry) => (statusFilter ? entry.status === statusFilter : true))
    .slice(0, 200);
  const itemIds = Array.from(new Set(deduped.map((entry) => entry.itemId)));

  const itemRows = await prisma.adminOrderItem.findMany({
    where: { id: { in: itemIds } },
    select: {
      id: true,
      order_id: true,
      product_name: true,
      image_url: true,
      quantity: true,
      return_note: true,
      status: true,
      variant: {
        select: {
          sku: true,
          attribute: true,
        },
      },
      order: {
        select: {
          name: true,
          phone1: true,
        },
      },
    },
  });

  const itemMap = new Map(itemRows.map((row) => [row.id, row]));

  const getVariantLabel = (variant?: { sku: string | null; attribute: unknown } | null) => {
    if (!variant) return null;
    const attr =
      variant.attribute && typeof variant.attribute === "object"
        ? (variant.attribute as Record<string, unknown>)
        : {};
    const type = typeof attr.type === "string" ? attr.type : "";
    const color = typeof attr.color === "string" ? attr.color : "";
    const size = typeof attr.size === "string" ? attr.size : "";
    const merged = [type, color, size].filter(Boolean).join(" / ");
    return merged || variant.sku || null;
  };

  const items = deduped
    .map((entry) => {
      const item = itemMap.get(entry.itemId);
      if (!item) return null;
      return {
        item_id: item.id,
        order_id: item.order_id,
        product_name: item.product_name,
        image_url: item.image_url ?? null,
        qty: item.quantity,
        buyer_name: item.order?.name ?? "",
        buyer_phone: item.order?.phone1 ?? "",
        variant_label: getVariantLabel(item.variant),
        status: entry.status,
        note: entry.note ?? item.return_note ?? null,
        actor_name: entry.actorName,
        actor_phone: entry.actorPhone,
        created_at: entry.createdAt,
      };
    })
    .filter(Boolean)
    .slice(0, limit);

  return NextResponse.json({ items });
}
