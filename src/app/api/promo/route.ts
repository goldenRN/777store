import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_PROMO = {
  badge: "Онцгой хямдрал",
  title: "LIVE бараа шинэчлэгдлээ",
  subtitle: "24 цагийн дотор дуусах hot deal.",
};

export async function GET() {
  const promo = await prisma.adminPromo.findFirst({ orderBy: { id: "asc" } });
  if (!promo) {
    return NextResponse.json({ ...DEFAULT_PROMO });
  }
  return NextResponse.json({
    id: promo.id,
    badge: promo.badge ?? DEFAULT_PROMO.badge,
    title: promo.title ?? DEFAULT_PROMO.title,
    subtitle: promo.subtitle ?? DEFAULT_PROMO.subtitle,
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const badge = String(body?.badge ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const subtitle = String(body?.subtitle ?? "").trim();

  const updated = await prisma.adminPromo.upsert({
    where: { id: 1 },
    update: {
      badge: badge || null,
      title: title || null,
      subtitle: subtitle || null,
    },
    create: {
      id: 1,
      badge: badge || null,
      title: title || null,
      subtitle: subtitle || null,
    },
  });

  return NextResponse.json({
    id: updated.id,
    badge: updated.badge ?? DEFAULT_PROMO.badge,
    title: updated.title ?? DEFAULT_PROMO.title,
    subtitle: updated.subtitle ?? DEFAULT_PROMO.subtitle,
  });
}
