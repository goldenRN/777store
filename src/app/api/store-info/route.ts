import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const info = await prisma.adminStoreInfo.findFirst({ orderBy: { id: "asc" } });
  return NextResponse.json({
    working_hours: info?.working_hours ?? "",
    phone: info?.phone ?? "",
    email: info?.email ?? "",
    facebook_url: info?.facebook_url ?? "",
    address: info?.address ?? "",
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const working_hours = typeof body?.working_hours === "string" ? body.working_hours.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const facebook_url = typeof body?.facebook_url === "string" ? body.facebook_url.trim() : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";

  const existing = await prisma.adminStoreInfo.findFirst({ orderBy: { id: "asc" } });
  const saved = existing
    ? await prisma.adminStoreInfo.update({
        where: { id: existing.id },
        data: { working_hours, phone, email, facebook_url, address },
      })
    : await prisma.adminStoreInfo.create({
        data: { working_hours, phone, email, facebook_url, address },
      });

  return NextResponse.json(saved);
}
