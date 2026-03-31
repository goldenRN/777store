import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type StoreInfoRow = {
  id: number;
  working_hours: string | null;
  phone: string | null;
  email: string | null;
  facebook_url: string | null;
  address: string | null;
};

async function hasStoreInfoTable(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: string | null }[]>`
    SELECT to_regclass('public."AdminStoreInfo"') as exists
  `;
  return Boolean(rows?.[0]?.exists);
}

export async function GET() {
  const exists = await hasStoreInfoTable();
  if (!exists) {
    return NextResponse.json({
      working_hours: "",
      phone: "",
      email: "",
      facebook_url: "",
      address: "",
    });
  }

  const rows = await prisma.$queryRaw<StoreInfoRow[]>`
    SELECT id, working_hours, phone, email, facebook_url, address
    FROM "AdminStoreInfo"
    ORDER BY id ASC
    LIMIT 1
  `;
  const info = rows?.[0] ?? null;
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

  const exists = await hasStoreInfoTable();
  if (!exists) {
    return NextResponse.json(
      { message: "AdminStoreInfo хүснэгт байхгүй байна. DB дээр хүснэгт үүсгэнэ үү." },
      { status: 500 }
    );
  }

  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM "AdminStoreInfo" ORDER BY id ASC LIMIT 1
  `;
  const existingId = rows?.[0]?.id;

  if (existingId) {
    await prisma.$executeRaw`
      UPDATE "AdminStoreInfo"
      SET working_hours = ${working_hours},
          phone = ${phone},
          email = ${email},
          facebook_url = ${facebook_url},
          address = ${address},
          updated_at = NOW()
      WHERE id = ${existingId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "AdminStoreInfo"
        (working_hours, phone, email, facebook_url, address)
      VALUES
        (${working_hours}, ${phone}, ${email}, ${facebook_url}, ${address})
    `;
  }

  return NextResponse.json({
    working_hours,
    phone,
    email,
    facebook_url,
    address,
  });
}
