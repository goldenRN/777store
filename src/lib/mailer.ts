import nodemailer from "nodemailer";

type MailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const getEnv = (key: string) => process.env[key] || "";

export async function sendMail(options: MailOptions) {
  const host = getEnv("SMTP_HOST");
  const port = Number(getEnv("SMTP_PORT") || 587);
  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASS");
  const from = getEnv("SMTP_FROM") || user;

  if (!host || !user || !pass || !from) {
    // SMTP тохируулаагүй үед email илгээхгүй, caller нь fallback хийх боломжтой
    return { ok: false, reason: "SMTP_NOT_CONFIGURED" as const };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  return { ok: true as const };
}
