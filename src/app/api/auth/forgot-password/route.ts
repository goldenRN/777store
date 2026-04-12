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

  const getBaseUrl = (req: NextRequest) => {
    const env =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.SITE_URL?.trim() ||
      process.env.NEXTAUTH_URL?.trim() ||
      "";
    if (env) {
      const cleaned = env.replace(/\/+$/, "");
      // Avoid accidentally sending localhost links in production emails.
      if (process.env.NODE_ENV === "production" && cleaned.includes("localhost")) {
        // fall through to header-based detection
      } else {
        return cleaned;
      }
    }

    // If request comes from the browser, Origin will be the correct public domain.
    const origin = req.headers.get("origin")?.trim();
    if (origin && !origin.includes("localhost")) return origin.replace(/\/+$/, "");

    // Some deployments omit Origin on same-site requests; Referer still contains the public URL.
    const referer = req.headers.get("referer")?.trim();
    if (referer) {
      try {
        const refOrigin = new URL(referer).origin;
        if (refOrigin && !refOrigin.includes("localhost")) return refOrigin.replace(/\/+$/, "");
      } catch {
        // ignore invalid referer
      }
    }

    const forwardedHost = req.headers.get("x-forwarded-host")?.trim();
    const host = forwardedHost || req.headers.get("host")?.trim() || req.nextUrl.host;
    const proto =
      req.headers.get("x-forwarded-proto")?.trim() ||
      (req.nextUrl.protocol || "https:").replace(":", "");

    if (host) return `${proto}://${host}`.replace(/\/+$/, "");

    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
    return "http://localhost:3000";
  };

  const baseUrl = getBaseUrl(request);

  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

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
