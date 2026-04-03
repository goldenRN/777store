import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueTokens, verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  const accessPayload = accessToken ? verifyToken(accessToken) : null;
  if (accessPayload?.sub) {
    const user = await prisma.user.findUnique({ where: { id: accessPayload.sub } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { id: user.id, name: user.name, phone: user.phone, role: user.role },
      { status: 200 }
    );
  }

  const refreshPayload = refreshToken ? verifyToken(refreshToken) : null;
  if (!refreshPayload?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: refreshPayload.sub } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { access, refresh } = issueTokens({
    id: user.id,
    phone: user.phone ?? null,
    role: user.role ?? null,
    name: user.name ?? null,
  });

  const response = NextResponse.json(
    { id: user.id, name: user.name, phone: user.phone, role: user.role },
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
