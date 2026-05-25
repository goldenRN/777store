import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = String(searchParams.get("userId") ?? "").trim();
  const unreadOnly = String(searchParams.get("unreadOnly") ?? "false").trim() === "true";
  const takeRaw = Number(searchParams.get("take") ?? 50);
  const take = Number.isFinite(takeRaw) ? Math.min(Math.max(Math.trunc(takeRaw), 1), 100) : 50;

  if (!userId) {
    return NextResponse.json({ message: "userId шаардлагатай" }, { status: 400 });
  }

  const [items, unreadCount] = await Promise.all([
    prisma.userNotification.findMany({
      where: {
        user_id: userId,
        ...(unreadOnly ? { is_read: false } : {}),
      },
      orderBy: { created_at: "desc" },
      take,
    }),
    prisma.userNotification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    }),
  ]);

  return NextResponse.json({
    unreadCount,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      order_id: item.order_id,
      order_item_id: item.order_item_id,
      is_read: item.is_read,
      read_at: item.read_at,
      metadata: item.metadata,
      created_at: item.created_at,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const userId = String(body?.userId ?? "").trim();
  const markAll = body?.markAll === true;
  const ids = Array.isArray(body?.ids)
    ? body.ids
        .map((value: unknown) => Number(value))
        .filter((value: number) => Number.isFinite(value) && value > 0)
    : [];

  if (!userId) {
    return NextResponse.json({ message: "userId шаардлагатай" }, { status: 400 });
  }

  if (!markAll && ids.length === 0) {
    return NextResponse.json({ message: "Уншсан болгох notification сонгоно уу." }, { status: 400 });
  }

  await prisma.userNotification.updateMany({
    where: {
      user_id: userId,
      is_read: false,
      ...(markAll ? {} : { id: { in: ids } }),
    },
    data: {
      is_read: true,
      read_at: new Date(),
    },
  });

  const unreadCount = await prisma.userNotification.count({
    where: { user_id: userId, is_read: false },
  });

  return NextResponse.json({ success: true, unreadCount });
}
