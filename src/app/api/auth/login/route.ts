import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueTokens } from "@/lib/auth";

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

  const user = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Утасны дугаар эсвэл нууц үг буруу байна" },
      { status: 401 }
    );
  }

  const ok = await bcrypt.compare(password, user.passwordHash);

  if (!ok) {
    return NextResponse.json(
      { error: "Утасны дугаар эсвэл нууц үг буруу байна" },
      { status: 401 }
    );
  }

  const { access, refresh } = issueTokens({
    id: user.id,
    phone: user.phone ?? null,
    role: user.role ?? null,
    name: user.name ?? null,
  });

  const response = NextResponse.json(
    {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      token: access,
    },
    { status: 200 }
  );

  const host = request.headers.get("host") || "";
  const isProd = process.env.NODE_ENV === "production";
  const cookieDomain = isProd && host.endsWith("777store.mn") ? ".777store.mn" : undefined;

  response.cookies.set({
    name: "access_token",
    value: access,
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 10,
    sameSite: "lax",
    secure: isProd,
    domain: cookieDomain,
  });
  response.cookies.set({
    name: "refresh_token",
    value: refresh,
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: isProd,
    domain: cookieDomain,
  });

  return response;
}
