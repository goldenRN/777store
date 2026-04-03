import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  const host = request.headers.get("host") || "";
  const isProd = process.env.NODE_ENV === "production";
  const cookieDomain = isProd && host.endsWith("777store.mn") ? ".777store.mn" : undefined;

  response.cookies.set({
    name: "access_token",
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: isProd,
    domain: cookieDomain,
  });
  response.cookies.set({
    name: "refresh_token",
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: isProd,
    domain: cookieDomain,
  });

  return response;
}

