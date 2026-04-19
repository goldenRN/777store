"use client";

import { useCart } from "@/components/cart/CartProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

type QPayInfo = {
  orderId: number;
  qr_image?: string | null;
  qr_text?: string | null;
  short_url?: string | null;
  deeplinks?: { name: string; description: string; logo: string; link: string }[] | null;
  expires_at?: string | null;
};

export default function CartPageClient() {
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
  const [invoiceEnableExpiry, setInvoiceEnableExpiry] = useState<boolean | null>(null);
  const [showBankApps, setShowBankApps] = useState(false);
  const totalCountdownMs = 60 * 60 * 1000;
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup" | "">("");
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [districts, setDistricts] = useState<{ id: number; name: string }[]>([]);
  const [khoroos, setKhoroos] = useState<{ id: number; name: string; zone: string; fee: number }[]>([]);
  const [deliveryDistrictId, setDeliveryDistrictId] = useState<number | "">("");
  const [deliveryKhorooId, setDeliveryKhorooId] = useState<number | "">("");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
  const activeExpiry = invoiceEnableExpiry ? invoiceExpiry || qpay?.expires_at || null : null;

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return url;
    return `/uploads/${url}`;
  };

  useEffect(() => {
    if (!activeExpiry || !qpay?.orderId || invoiceEnableExpiry === false) return;
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
    if (!activeExpiry || invoiceEnableExpiry === false) return;
    const interval = setInterval(() => {
      const ms = new Date(activeExpiry as string).getTime() - Date.now();
      setRemainingMs(Math.max(0, ms));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeExpiry, invoiceEnableExpiry]);

  useEffect(() => {
    const missing = items.filter((it) => !it.image_url);
    if (missing.length === 0) return;
    missing.forEach((item) => {
      const key = `${item.id}-${item.variant_id ?? "base"}`;
      if (resolvedImages[key]) return;
      if (item.variant_id) {
        fetch(`/api/productvar/${item.id}`)
          .then((r) => r.json())
          .then((list) => {
            const variants = Array.isArray(list) ? list : [];
            const v = variants.find((x: any) => Number(x.id) === Number(item.variant_id)) || null;
            const vImg = v?.images?.[0]?.image_url ?? null;
            if (vImg) {
              setResolvedImages((prev) => ({ ...prev, [key]: vImg }));
              return;
            }
            return fetch(`/api/public/products/${item.id}`)
              .then((r) => r.json())
              .then((p) => {
                const img = p?.image_url ?? null;
                if (img) setResolvedImages((prev) => ({ ...prev, [key]: img }));
              });
          })
          .catch(() => null);
      } else {
        fetch(`/api/public/products/${item.id}`)
          .then((r) => r.json())
          .then((p) => {
            const img = p?.image_url ?? null;
            if (img) setResolvedImages((prev) => ({ ...prev, [key]: img }));
          })
          .catch(() => null);
      }
    });
  }, [items, resolvedImages]);

  useEffect(() => {
    if (!qpay?.orderId) return;
    fetch(`/api/payments/qpay/invoice?orderId=${qpay.orderId}`)
      .then((r) => r.json())
      .then((data) => {
        const expiry = data?.invoice?.expiry_date;
        const status = data?.invoice?.invoice_status;
        const enableExpiry = data?.invoice?.enable_expiry;
        if (expiry) setInvoiceExpiry(expiry);
        if (status) setInvoiceStatus(status);
        if (typeof enableExpiry === "boolean") setInvoiceEnableExpiry(enableExpiry);
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
      return JSON.parse(raw) as { id?: string; name?: string; phone?: string; address?: string };
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (deliveryMethod !== "delivery" || !user?.id) return;
    // If already filled, skip
    if (
      deliveryName &&
      deliveryPhone &&
      deliveryAddress &&
      deliveryDistrictId &&
      deliveryKhorooId
    )
      return;

    const fillFromUser = async () => {
      try {
        const res = await fetch(`/api/users/${user.id}`);
        const data = await res.json();
        const u = data?.user ?? {};
        const last = data?.lastDelivery ?? null;
        if (!deliveryName) setDeliveryName(u.name || user.name || "");
        if (!deliveryPhone) setDeliveryPhone(u.phone || user.phone || "");
        if (!deliveryAddress)
          setDeliveryAddress(last?.delivery_address || u.address || user.address || "");
        if (!deliveryDistrictId && last?.delivery_district_id) {
          setDeliveryDistrictId(Number(last.delivery_district_id));
        }
        if (!deliveryKhorooId && last?.delivery_khoroo_id) {
          setDeliveryKhorooId(Number(last.delivery_khoroo_id));
        }
      } catch {
        // ignore
      }
    };
    fillFromUser();
  }, [
    deliveryMethod,
    user?.id,
    deliveryName,
    deliveryPhone,
    deliveryAddress,
    deliveryDistrictId,
    deliveryKhorooId,
    user?.name,
    user?.phone,
    user?.address,
  ]);

  const normalizeType = (name?: string | null) => {
    const t = (name || "").toLowerCase();
    if (t.includes("захиал") || t.includes("preorder") || t.includes("урьдчил")) return "preorder";
    if (t.includes("лайв") || t.includes("live")) return "preorder";
    if (t.includes("бэлэн") || t.includes("ready")) return "ready";
    return "";
  };

  const hasPreorder = items.some((it) => normalizeType(it.type_name) === "preorder");
  const hasReady = items.some((it) => normalizeType(it.type_name) === "ready" || !normalizeType(it.type_name));
  const orderKind = hasPreorder ? "preorder" : "ready";
  const grandTotal =
    hasReady && deliveryMethod === "delivery" ? Math.max(0, total + (deliveryFee || 0)) : total;

  useEffect(() => {
    if (!hasReady) return;
    if (deliveryMethod !== "delivery") return;
    if (districts.length > 0) return;
    fetch("/api/public/delivery/districts")
      .then((r) => r.json())
      .then((d) => setDistricts(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setDistricts([]));
  }, [deliveryMethod, hasReady, districts.length]);

  useEffect(() => {
    if (!hasReady) return;
    if (deliveryMethod !== "delivery") return;
    if (!deliveryDistrictId) {
      setKhoroos([]);
      setDeliveryKhorooId("");
      setDeliveryFee(0);
      return;
    }
    fetch(`/api/public/delivery/khoroos?districtId=${deliveryDistrictId}`)
      .then((r) => r.json())
      .then((d) => setKhoroos(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setKhoroos([]));
  }, [deliveryDistrictId, deliveryMethod, hasReady]);

  useEffect(() => {
    if (deliveryMethod !== "delivery") return;
    if (!deliveryKhorooId) {
      setDeliveryFee(0);
      return;
    }
    const k = khoroos.find((x) => Number(x.id) === Number(deliveryKhorooId)) as any;
    setDeliveryFee(k?.fee != null ? Number(k.fee) : 0);
  }, [deliveryKhorooId, deliveryMethod, khoroos]);

  const handleCheckout = async () => {
    if (!user?.id) {
      router.push("/login?next=/cart");
      return;
    }
    if (items.length === 0) return;
    setOrderError("");
    if (hasReady) {
      if (!deliveryMethod) {
        alert("Хүргэлтээр авах уу, дэлгүүрээс авах уу гэдгийг сонгоно уу.");
        return;
      }
      if (deliveryMethod === "delivery") {
        if (!deliveryName.trim() || !deliveryPhone.trim()) {
          alert("Хүргэлтийн нэр, утсаа бүрэн бөглөнө үү.");
          return;
        }
        if (!deliveryDistrictId || !deliveryKhorooId) {
          alert("Дүүрэг, хороо сонгоно уу.");
          return;
        }
        if (!deliveryAddress.trim()) {
          alert("Нэмэлт хаягаа (байр, тоот, орц гэх мэт) бичнэ үү.");
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
          deliveryMethod: hasReady ? deliveryMethod || null : null,
          deliveryName: deliveryMethod === "delivery" ? deliveryName : null,
          deliveryPhone: deliveryMethod === "delivery" ? deliveryPhone : null,
          deliveryAddress: deliveryMethod === "delivery" ? deliveryAddress : null,
          deliveryDistrictId: deliveryMethod === "delivery" ? deliveryDistrictId : null,
          deliveryKhorooId: deliveryMethod === "delivery" ? deliveryKhorooId : null,
          items: items.map((it) => ({
            product_id: it.id,
            variant_id: it.variant_id ?? null,
            variant_sku: it.variant_sku ?? null,
            variant_label: it.variant_label ?? null,
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
      <main className="container mx-auto flex-1 px-6 py-10">
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
                <div
                  key={`${item.id}-${item.variant_id ?? "base"}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border p-3"
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-[var(--sky-100)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        item.image_url
                          ? resolveImageUrl(item.image_url)
                          : resolvedImages[`${item.id}-${item.variant_id ?? "base"}`]
                          ? resolveImageUrl(resolvedImages[`${item.id}-${item.variant_id ?? "base"}`])
                          : "/logo.png"
                      }
                      alt={item.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/logo.png";
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="text-xs text-[var(--gray-500)]">
                      {Number(item.price).toLocaleString()}₮
                    </div>
                    {(item.variant_sku || item.variant_label) && (
                      <div className="mt-1 text-[10px] text-[var(--gray-500)]">
                        SKU:{" "}
                        <span className="font-semibold text-[var(--navy-900)]">
                          {item.variant_sku || item.variant_label}
                        </span>
                        {item.variant_label && item.variant_sku && item.variant_label !== item.variant_sku && (
                          <span className="ml-1 text-[var(--gray-400)]">({item.variant_label})</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1, item.variant_id ?? null)}
                      className="h-8 w-8 rounded-full border text-sm"
                    >
                      -
                    </button>
                    <div className="w-8 text-center text-sm">{item.qty}</div>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1, item.variant_id ?? null)}
                      className="h-8 w-8 rounded-full border text-sm"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-full sm:w-24 text-right text-sm font-semibold">
                    {(item.price * item.qty).toLocaleString()}₮
                  </div>
                  <button
                    onClick={() => removeItem(item.id, item.variant_id ?? null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-red-600 hover:bg-red-50"
                    aria-label="Устгах"
                    title="Устгах"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between border-t pt-4 text-sm font-semibold">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-semibold">Дүн</div>
                    <div className="font-semibold">{total.toLocaleString()}₮</div>
                  </div>
                  {!hasPreorder && deliveryMethod === "delivery" ? (
                    <div className="flex items-center justify-between gap-4 text-xs text-[var(--gray-600)]">
                      <div>Хүргэлт</div>
                      <div>{deliveryFee.toLocaleString()}₮</div>
                    </div>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--gray-500)]">Нийт төлөх</div>
                  <div className="text-base font-bold text-[var(--navy-900)]">
                    {grandTotal.toLocaleString()}₮
                  </div>
                </div>
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
              ) : null}

              {hasReady ? (
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
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <select
                          value={deliveryDistrictId === "" ? "" : String(deliveryDistrictId)}
                          onChange={(e) => setDeliveryDistrictId(e.target.value ? Number(e.target.value) : "")}
                          className="rounded-lg border px-3 py-2"
                        >
                          <option value="">Дүүрэг сонгох</option>
                          {districts.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={deliveryKhorooId === "" ? "" : String(deliveryKhorooId)}
                          onChange={(e) => setDeliveryKhorooId(e.target.value ? Number(e.target.value) : "")}
                          className="rounded-lg border px-3 py-2"
                          disabled={!deliveryDistrictId}
                        >
                          <option value="">Хороо сонгох</option>
                          {khoroos.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.name} ({k.zone}) — {Number(k.fee || 0).toLocaleString()}₮
                            </option>
                          ))}
                        </select>
                      </div>

                      {deliveryFee > 0 && (
                        <div className="rounded-lg border bg-[var(--sky-50)] px-3 py-2">
                          Хүргэлтийн төлбөр:{" "}
                          <span className="font-semibold text-red-600">{deliveryFee.toLocaleString()}₮</span>
                        </div>
                      )}

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
                        placeholder="Нэмэлт хаяг (байр, тоот, орц гэх мэт)"
                        className="rounded-lg border px-3 py-2"
                      />
                    </div>
                  )}
                </div>
              ) : null}

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
              <div className="flex flex-col items-center justify-center">
                {qpay.qr_image ? (
                  <img
                    src={`data:image/png;base64,${qpay.qr_image}`}
                    alt="QPay QR"
                    className="h-64 w-64 rounded-lg border"
                  />
                ) : qpay.qr_text ? (
                  <div className="text-xs break-all">{qpay.qr_text}</div>
                ) : null}
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
              </div>
              <div>
                {qpay.deeplinks && qpay.deeplinks.length > 0 && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowBankApps((v) => !v)}
                      className="w-full rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
                    >
                      Банкны апп-аар төлөх
                    </button>
                    {showBankApps && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
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
                      {remainingMs > 0 ? "Хугацаа тоолж байна" : "Хугацаа дууссан"}
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
                    {`QPay төлөв: ${invoiceStatus}`}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
  );
}
