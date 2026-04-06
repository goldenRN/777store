import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendMail } from "@/lib/mailer";

const TOKEN_TTL_MINUTES = 30;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ message: "Имэйл шаардлагатай" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Email enumeration хамгаалалт
    return NextResponse.json({ message: "Хүсэлт амжилттай" });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Нууц үг сэргээх</h2>
      <p>Доорх товчийг дарж нууц үгээ шинэчилнэ үү.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Нууц үг сэргээх</a></p>
      <p>Энэ холбоос ${TOKEN_TTL_MINUTES} минут хүчинтэй.</p>
      <p>Хэрвээ та энэ хүсэлтийг гаргаагүй бол үл тооно уу.</p>
    </div>
  `;

  const sent = await sendMail({
    to: email,
    subject: "Нууц үг сэргээх холбоос",
    html,
    text: `Нууц үг сэргээх холбоос: ${resetUrl}`,
  });

  if (!sent.ok) {
    // SMTP тохируулаагүй үед линкийг client талд авах боломжтой (dev)
    return NextResponse.json({ message: "Хүсэлт амжилттай", resetUrl });
  }

  return NextResponse.json({ message: "Хүсэлт амжилттай" });
}
