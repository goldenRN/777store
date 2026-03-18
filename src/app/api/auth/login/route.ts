import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phone, password } = body ?? {};

  if (!phone || !password) {
    return NextResponse.json(
      { error: "Утасны дугаар болон нууц үг шаардлагатай" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { phone },
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

  const token = Buffer.from(`${user.id}:${user.phone ?? ""}:${Date.now()}`).toString(
    "base64"
  );

  return NextResponse.json(
    {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      token,
    },
    { status: 200 }
  );
}
