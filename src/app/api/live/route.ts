import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sessions = await prisma.liveSession.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      liveItems: {
        include: { product: true },
      },
    },
  });

  return NextResponse.json(sessions);
}
