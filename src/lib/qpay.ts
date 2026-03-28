import { Buffer } from "buffer";

type QPayToken = {
  access_token: string;
  expires_in: number;
};

type QPayInvoiceResponse = {
  invoice_id: string;
  qr_text?: string;
  qr_image?: string;
  qPay_shortUrl?: string;
  qPay_deeplink?: Array<{ name: string; description: string; logo: string; link: string }>;
};

type QPayPaymentGet = {
  payment_id: string;
  payment_status: string;
  object_type: string;
  object_id: string;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

const getEnv = (key: string) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env ${key}`);
  return val;
};

const getBaseUrl = () => process.env.QPAY_BASE_URL || "https://merchant.qpay.mn/v2";

export async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const username = getEnv("QPAY_USERNAME");
  const password = getEnv("QPAY_PASSWORD");
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const res = await fetch(`${getBaseUrl()}/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QPay token error: ${res.status} ${text}`);
  }
  const json = (await res.json()) as QPayToken;
  const expires = Number(json.expires_in);
  let expiresAt = now + 60 * 60 * 1000;
  if (Number.isFinite(expires)) {
    if (expires > 1e12) {
      expiresAt = expires;
    } else if (expires > 1e9) {
      expiresAt = expires * 1000;
    } else {
      expiresAt = now + expires * 1000;
    }
  }
  cachedToken = { token: json.access_token, expiresAt };
  return json.access_token;
}

export async function createInvoice(payload: Record<string, unknown>) {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}/invoice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QPay invoice error: ${res.status} ${text}`);
  }
  return (await res.json()) as QPayInvoiceResponse;
}

export async function cancelInvoice(invoiceId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}/invoice/${invoiceId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QPay cancel error: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getInvoice(invoiceId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}/invoice/${invoiceId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QPay invoice get error: ${res.status} ${text}`);
  }
  return res.json();
}

export async function paymentCheck(invoiceId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}/payment/check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QPay check error: ${res.status} ${text}`);
  }
  return res.json();
}

export async function paymentGet(paymentId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}/payment/${paymentId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QPay payment get error: ${res.status} ${text}`);
  }
  return (await res.json()) as QPayPaymentGet;
}
