import crypto from "crypto";

type TokenPayload = {
  sub: string;
  phone?: string | null;
  role?: string | null;
  name?: string | null;
  exp: number;
  type?: "access" | "refresh";
};

const getSecret = () => {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "dev-secret"
  );
};

const b64url = (input: Buffer | string) => {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

const sign = (data: string, secret: string) => {
  return b64url(crypto.createHmac("sha256", secret).update(data).digest());
};

export const signToken = (payload: TokenPayload) => {
  const header = { alg: "HS256", typ: "JWT" };
  const secret = getSecret();
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = sign(`${h}.${p}`, secret);
  return `${h}.${p}.${sig}`;
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const secret = getSecret();
    const [h, p, sig] = token.split(".");
    if (!h || !p || !sig) return null;
    const expected = sign(`${h}.${p}`, secret);
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(p, "base64").toString("utf8")) as TokenPayload;
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
};

export const issueTokens = (user: { id: string; phone?: string | null; role?: string | null; name?: string | null }) => {
  const now = Math.floor(Date.now() / 1000);
  const accessExp = now + 60 * 60 * 24 * 365 * 10; // 10 years
  const access = signToken({
    sub: user.id,
    phone: user.phone ?? null,
    role: user.role ?? null,
    name: user.name ?? null,
    exp: accessExp,
    type: "access",
  });
  const refresh = signToken({
    sub: user.id,
    exp: now + 60 * 60 * 24 * 30, // 30 days
    type: "refresh",
  });
  return { access, refresh };
};
