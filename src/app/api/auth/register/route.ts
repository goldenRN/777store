import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phone, password } = body ?? {};
  const normalizedPhone = String(phone ?? "").replace(/\s+/g, "").replace(/-/g, "");

  if (!normalizedPhone || !password) {
    return NextResponse.json(
      { error: "Утасны дугаар болон нууц үг шаардлагатай" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findFirst({
    where: {
      phone: normalizedPhone,
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Энэ дугаараар бүртгэлтэй хэрэглэгч байна" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      phone: normalizedPhone,
      passwordHash,
    },
    select: {
      id: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
