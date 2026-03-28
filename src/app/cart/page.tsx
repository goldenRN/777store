"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type QPayInfo = {
  orderId: number;
  qr_image?: string | null;
  qr_text?: string | null;
  short_url?: string | null;
  deeplinks?: { name: string; description: string; logo: string; link: string }[] | null;
  expires_at?: string | null;
};

export default function CartPage() {
  const { items, total, updateQty, removeItem, clear } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [qpay, setQpay] = useState<QPayInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [invoiceExpiry, setInvoiceExpiry] = useState<string | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<string | null>(null);
  const totalCountdownMs = 60 * 60 * 1000;
  const activeExpiry = invoiceExpiry || qpay?.expires_at || null;

  useEffect(() => {
    if (!activeExpiry || !qpay?.orderId) return;
    const ms = new Date(activeExpiry).getTime() - Date.now();
    if (ms <= 0) {
      setRemainingMs(0);
      return;
    }
    setRemainingMs(ms);
    const timer = setTimeout(() => {
      fetch("/api/payments/qpay/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: qpay.orderId }),
      }).catch(() => null);
    }, ms);
    return () => clearTimeout(timer);
  }, [activeExpiry, qpay?.orderId]);

  useEffect(() => {
    if (!activeExpiry) return;
    const interval = setInterval(() => {
      const ms = new Date(activeExpiry as string).getTime() - Date.now();
      setRemainingMs(Math.max(0, ms));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeExpiry]);

  useEffect(() => {
    if (!qpay?.orderId) return;
    fetch(`/api/payments/qpay/invoice?orderId=${qpay.orderId}`)
      .then((r) => r.json())
      .then((data) => {
        const expiry = data?.invoice?.expiry_date;
        const status = data?.invoice?.invoice_status;
        if (expiry) setInvoiceExpiry(expiry);
        if (status) setInvoiceStatus(status);
      })
      .catch(() => null);
  }, [qpay?.orderId]);

  const getCountdownParts = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return {
      hh: String(h).padStart(2, "0"),
      mm: String(m).padStart(2, "0"),
      ss: String(s).padStart(2, "0"),
    };
  };

  const user = (() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      return JSON.parse(raw) as { id?: string; name?: string; phone?: string };
    } catch {
      return null;
    }
  })();

  const handleCheckout = async () => {
    if (!user?.id) {
      router.push("/login?next=/cart");
      return;
    }
    if (items.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: user.name || user.phone || "Хэрэглэгч",
          phone: user.phone || "0000-0000",
          items: items.map((it) => ({
            name: it.name,
            price: it.price,
            qty: it.qty,
            image_url: it.image_url,
          })),
        }),
      });
      const json = await res.json();
      if (json?.qpay) {
        setQpay({
          orderId: json.id,
          qr_image: json.qpay.qr_image,
          qr_text: json.qpay.qr_text,
          short_url: json.qpay.short_url,
          deeplinks: json.qpay.deeplinks || [],
          expires_at: json.qpay.expires_at,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const checkPayment = async () => {
    if (!qpay?.orderId) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/payments/qpay/check?orderId=${qpay.orderId}`);
      const json = await res.json();
      if (json?.status === "PAID") {
        clear();
        router.push("/orders?status=ALL");
      }
      if (json?.status === "EXPIRED") {
        await fetch("/api/payments/qpay/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: qpay.orderId }),
        });
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <main className="container mx-auto px-6 py-10 flex-1">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Сагс</h1>
            {items.length > 0 && (
              <button onClick={clear} className="text-xs text-red-600">
                Сагс хоослох
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="mt-6 text-sm text-[var(--gray-500)]">Сагс хоосон байна.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-xl border p-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-[var(--sky-100)]">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="text-xs text-[var(--gray-500)]">
                      {Number(item.price).toLocaleString()}₮
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="h-8 w-8 rounded-full border text-sm"
                    >
                      -
                    </button>
                    <div className="w-8 text-center text-sm">{item.qty}</div>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="h-8 w-8 rounded-full border text-sm"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-24 text-right text-sm font-semibold">
                    {(item.price * item.qty).toLocaleString()}₮
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-xs text-red-600">
                    Устгах
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between border-t pt-4 text-sm font-semibold">
                <div>Нийт дүн</div>
                <div>{total.toLocaleString()}₮</div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? "Захиалга үүсгэж байна..." : "Захиалга үүсгэх"}
                </button>
              </div>
            </div>
          )}
        </div>

        {qpay && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow">
            <div className="text-lg font-bold">QPay төлбөр</div>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="flex items-center justify-center">
                {qpay.qr_image ? (
                  <img
                    src={`data:image/png;base64,${qpay.qr_image}`}
                    alt="QPay QR"
                    className="h-64 w-64 rounded-lg border"
                  />
                ) : qpay.qr_text ? (
                  <div className="text-xs break-all">{qpay.qr_text}</div>
                ) : null}
              </div>
              <div>
                {qpay.short_url && (
                  <div className="text-sm">
                    Богино холбоос:{" "}
                    <a className="text-blue-600 underline" href={qpay.short_url} target="_blank">
                      {qpay.short_url}
                    </a>
                  </div>
                )}
                {qpay.deeplinks && qpay.deeplinks.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {qpay.deeplinks.map((b) => (
                      <a
                        key={b.link}
                        href={b.link}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                      >
                        {b.logo && (
                          <img src={b.logo} alt={b.name} className="h-5 w-5" />
                        )}
                        <span>{b.description || b.name}</span>
                      </a>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <button
                    onClick={checkPayment}
                    disabled={checking}
                    className="rounded-full border px-4 py-2 text-xs font-semibold"
                  >
                    {checking ? "Шалгаж байна..." : "Төлбөр шалгах"}
                  </button>
                </div>
                {remainingMs !== null && (
                  <div className="mt-4 rounded-2xl border bg-gradient-to-br from-[var(--sky-50)] to-white p-4 text-center shadow-sm">
                    <div className="text-[11px] font-medium uppercase tracking-widest text-[var(--gray-500)]">
                      Төлбөр дуусах хугацаа
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-3">
                      {(() => {
                        const parts = getCountdownParts(remainingMs);
                        const box =
                          "min-w-[70px] rounded-xl border bg-white px-3 py-2 shadow-sm";
                        const label = "text-[10px] text-[var(--gray-500)]";
                        const value =
                          "text-2xl font-bold text-[var(--navy-900)]";
                        return (
                          <>
                            <div className={box}>
                              <div className={value}>{parts.hh}</div>
                              <div className={label}>цаг</div>
                            </div>
                            <div className="text-xl font-semibold text-[var(--gray-400)]">:</div>
                            <div className={box}>
                              <div className={value}>{parts.mm}</div>
                              <div className={label}>мин</div>
                            </div>
                            <div className="text-xl font-semibold text-[var(--gray-400)]">:</div>
                            <div className={box}>
                              <div className={value}>{parts.ss}</div>
                              <div className={label}>сек</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="mt-4 h-2 w-full rounded-full bg-[var(--sky-100)]">
                      <div
                        className="h-full rounded-full bg-red-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, Math.round((remainingMs / totalCountdownMs) * 100))
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 text-[11px] font-semibold text-[var(--navy-900)]">
                      {remainingMs > 0 ? "QR хүчинтэй байна" : "Хугацаа дууссан"}
                    </div>
                    {activeExpiry && (
                      <div className="mt-2 text-[10px] text-[var(--gray-500)]">
                        Дуусах огноо: {new Date(activeExpiry).toLocaleString()}
                      </div>
                    )}
                    {invoiceStatus && (
                      <div className="mt-1 text-[10px] text-[var(--gray-500)]">
                        QPay төлөв: {invoiceStatus}
                      </div>
                    )}
                  </div>
                )}
                {remainingMs === null && invoiceStatus && (
                  <div className="mt-4 rounded-xl border bg-[var(--sky-50)] p-3 text-center text-xs">
                    {invoiceStatus === "OPEN" ? "QR хүчинтэй байна" : `QPay төлөв: ${invoiceStatus}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
