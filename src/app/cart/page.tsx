"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  const [checkMessage, setCheckMessage] = useState<string>("");
  const [orderError, setOrderError] = useState<string>("");
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [invoiceExpiry, setInvoiceExpiry] = useState<string | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<string | null>(null);
  const totalCountdownMs = 60 * 60 * 1000;
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup" | "">("");
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const activeExpiry = invoiceExpiry || qpay?.expires_at || null;

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return url;
    return `/uploads/${url}`;
  };

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

  const normalizeType = (name?: string | null) => {
    const t = (name || "").toLowerCase();
    if (t.includes("захиал") || t.includes("preorder") || t.includes("урьдчил")) return "preorder";
    if (t.includes("лайв") || t.includes("live")) return "preorder";
    if (t.includes("бэлэн") || t.includes("ready")) return "ready";
    return "";
  };

  const hasPreorder = items.some((it) => normalizeType(it.type_name) === "preorder");
  const orderKind = hasPreorder ? "preorder" : "ready";

  const handleCheckout = async () => {
    if (!user?.id) {
      router.push("/login?next=/cart");
      return;
    }
    if (items.length === 0) return;
    setOrderError("");
    if (!hasPreorder) {
      if (!deliveryMethod) {
        alert("Хүргэлтээр авах уу, дэлгүүрээс авах уу гэдгийг сонгоно уу.");
        return;
      }
      if (deliveryMethod === "delivery") {
        if (!deliveryName.trim() || !deliveryPhone.trim() || !deliveryAddress.trim()) {
          alert("Хүргэлтийн нэр, утас, хаягаа бүрэн бөглөнө үү.");
          return;
        }
      }
    }
    setLoading(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: user.name || user.phone || "Хэрэглэгч",
          phone: user.phone || "0000-0000",
          orderKind,
          deliveryMethod: hasPreorder ? null : deliveryMethod || null,
          deliveryName: deliveryMethod === "delivery" ? deliveryName : null,
          deliveryPhone: deliveryMethod === "delivery" ? deliveryPhone : null,
          deliveryAddress: deliveryMethod === "delivery" ? deliveryAddress : null,
          items: items.map((it) => ({
            product_id: it.id,
            name: it.name,
            price: it.price,
            qty: it.qty,
            image_url: it.image_url,
            type_name: it.type_name ?? null,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setOrderError(json?.message || json?.error || "Захиалга үүсгэхэд алдаа гарлаа");
        setLoading(false);
        return;
      }
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
    setCheckMessage("");
    try {
      const res = await fetch(`/api/payments/qpay/check?orderId=${qpay.orderId}`);
      const json = await res.json();
      if (json?.status === "PAID") {
        setCheckMessage("Төлбөр амжилттай төлөгдсөн байна.");
        clear();
        router.push("/orders?status=ALL");
      }
      if (json?.status === "EXPIRED") {
        setCheckMessage("Нэхэмжлэлийн хугацаа дууссан байна.");
        await fetch("/api/payments/qpay/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: qpay.orderId }),
        });
      }
      if (json?.status === "UNPAID") {
        setCheckMessage("Төлбөр хийгдээгүй байна. Хэрэв төлсөн бол дахин шалгана уу.");
      }
    } catch {
      setCheckMessage("Алдаа гарлаа. Гүйлгээ хийгдсэн эсэхийг заавал шалгана уу.");
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(item.image_url)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
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

              {orderError && (
                <div className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-black">
                  {orderError}
                </div>
              )}

              {hasPreorder ? (
                <div className="rounded-xl border bg-[var(--sky-50)] p-3 text-xs text-[var(--gray-600)]">
                  Энэ захиалга дотор **захиалгын бараа** байгаа тул төлбөр амжилттай болсны дараа
                  “Хүлээгдэж байгаа” жагсаалтад бүртгэгдэнэ.
                </div>
              ) : (
                <div className="rounded-xl border bg-white p-4 text-sm">
                  <div className="font-semibold">Хүлээн авах хэлбэр</div>
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        checked={deliveryMethod === "delivery"}
                        onChange={() => setDeliveryMethod("delivery")}
                      />
                      Хүргэлтээр авах
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        checked={deliveryMethod === "pickup"}
                        onChange={() => setDeliveryMethod("pickup")}
                      />
                      Дэлгүүрээс авах
                    </label>
                  </div>

                  {deliveryMethod === "delivery" && (
                    <div className="mt-3 grid gap-2 text-xs">
                      <input
                        value={deliveryName}
                        onChange={(e) => setDeliveryName(e.target.value)}
                        placeholder="Хүлээн авагчийн нэр"
                        className="rounded-lg border px-3 py-2"
                      />
                      <input
                        value={deliveryPhone}
                        onChange={(e) => setDeliveryPhone(e.target.value)}
                        placeholder="Утас"
                        className="rounded-lg border px-3 py-2"
                      />
                      <input
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Хүргэлтийн хаяг"
                        className="rounded-lg border px-3 py-2"
                      />
                    </div>
                  )}
                </div>
              )}

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
                {checkMessage && (
                  <div className="mt-3 rounded-xl bg-[var(--sky-50)] px-4 py-2 text-xs font-semibold text-black">
                    {checkMessage}
                  </div>
                )}
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
