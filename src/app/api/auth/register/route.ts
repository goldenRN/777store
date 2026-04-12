import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phone, password, name, email } = body ?? {};
  const normalizedPhone = String(phone ?? "").replace(/\s+/g, "").replace(/-/g, "");
  const normalizedName = String(name ?? "").trim() || null;
  const normalizedEmailRaw = String(email ?? "").trim();
  const normalizedEmail = normalizedEmailRaw ? normalizedEmailRaw.toLowerCase() : null;

  if (!normalizedPhone || !password) {
    return NextResponse.json(
      { error: "Утасны дугаар болон нууц үг шаардлагатай" },
      { status: 400 }
    );
  }

  if (normalizedEmail) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!ok) {
      return NextResponse.json({ error: "Имэйл буруу байна" }, { status: 400 });
    }
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: normalizedPhone },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    },
  });

  if (existing) {
    return NextResponse.json(
      {
        error:
          existing.phone === normalizedPhone
            ? "Энэ дугаараар бүртгэлтэй хэрэглэгч байна"
            : "Энэ имэйлээр бүртгэлтэй хэрэглэгч байна",
      },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      phone: normalizedPhone,
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
