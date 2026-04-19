"use client";

import React, { useEffect, useState } from "react";
import { getActorHeaders } from "@/lib/actorHeaders";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import OrderDetailsModal from "../order/OrderDetailsModal";
import AdminTableSearchBar from "@/components/admin/AdminTableSearchBar";
import Image from "next/image";

type ProductSummary = {
  product_id: number | null;
  product_name: string;
  product_description: string;
  image_url: string | null;
  total_qty: number;
  order_ids: number[];
  buyers: { order_id: number; name: string; phone: string; qty: number; order_status: string }[];
  variants_confirmed: {
    variant_id: number;
    label: string;
    stock: number | null;
    ordered_qty: number;
    remaining_qty: number | null;
  }[];
  variants_inferred: {
    variant_id: number;
    label: string;
    stock: number | null;
    inferred_qty: number;
    remaining_after_inferred: number | null;
    inferred_by: "image" | "price";
  }[];
};

export default function FulfillmentPage() {
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneApplied, setPhoneApplied] = useState("");
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [canViewVariants, setCanViewVariants] = useState(false);
  const [deliveryPickOpen, setDeliveryPickOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryOrderId, setDeliveryOrderId] = useState<number | null>(null);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [districts, setDistricts] = useState<{ id: number; name: string }[]>([]);
  const [khoroos, setKhoroos] = useState<{ id: number; name: string; zone: string; fee: number }[]>([]);
  const [deliveryDistrictId, setDeliveryDistrictId] = useState<number | "">("");
  const [deliveryKhorooId, setDeliveryKhorooId] = useState<number | "">("");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<"QPAY" | "BANK">("QPAY");
  const [showBankApps, setShowBankApps] = useState(false);
  const [qpay, setQpay] = useState<{
    orderId: number;
    qr_image?: string | null;
    qr_text?: string | null;
    short_url?: string | null;
    deeplinks?: { name: string; description: string; logo: string; link: string }[] | null;
    expires_at?: string | null;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [deliveryCandidates, setDeliveryCandidates] = useState<
    { order_id: number; name: string; phone: string; order_status: string }[]
  >([]);

  const resetDeliveryUi = () => {
    setDeliveryName("");
    setDeliveryPhone("");
    setDeliveryAddress("");
    setDeliveryDistrictId("");
    setDeliveryKhorooId("");
    setDeliveryFee(0);
    setDeliveryPaymentMethod("QPAY");
    setShowBankApps(false);
    setQpay(null);
  };

  const loadOrderForDelivery = async (id: number) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/${id}`, {
      headers: { ...getActorHeaders() },
    });
    const json = await res.json().catch(() => ({}));
    const order = json?.order ?? null;
    if (!order) return;
    setDeliveryName(String(order.delivery_name || order.name || "").trim());
    setDeliveryPhone(String(order.delivery_phone || order.phone1 || "").trim());
    setDeliveryAddress(String(order.delivery_address || "").trim());
    setDeliveryDistrictId(order.delivery_district_id ?? "");
    setDeliveryKhorooId(order.delivery_khoroo_id ?? "");
  };

  const fetchOrders = async (query = phoneApplied) => {
    const q = String(query || "").trim();
    if (!q) return;
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = new URL(`${base}/api/orders/items/by-phone`, window.location.origin);
      url.searchParams.set("phone", q);
      url.searchParams.set("payment", "PAID");
      const res = await fetch(url.toString(), { headers: { ...getActorHeaders() } });
      const json = await res.json();
      setItems(json.items || []);
      setCanViewVariants(Boolean(json?.can_view_variants));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderIds: number[], status: string) => {
    await Promise.all(
      orderIds.map((id) =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getActorHeaders() },
          body: JSON.stringify({ status }),
        })
      )
    );
    fetchOrders(phoneApplied);
  };

  const openDeliveryForOrders = (orderIds: number[], buyers: ProductSummary["buyers"]) => {
    const unique = Array.from(new Set(orderIds.filter((x) => Number.isFinite(Number(x))))) as number[];
    if (unique.length === 0) return;

    const map = new Map<number, { order_id: number; name: string; phone: string; order_status: string }>();
    (buyers || []).forEach((b) => {
      if (!unique.includes(b.order_id)) return;
      if (!map.has(b.order_id)) {
        map.set(b.order_id, {
          order_id: b.order_id,
          name: b.name,
          phone: b.phone,
          order_status: b.order_status,
        });
      }
    });

    const candidates = unique
      .map((id) => map.get(id) || { order_id: id, name: "-", phone: phoneApplied || "-", order_status: "" })
      .sort((a, b) => b.order_id - a.order_id);
    setDeliveryCandidates(candidates);
    resetDeliveryUi();

    if (unique.length === 1) {
      setDeliveryOrderId(unique[0] || null);
      setDeliveryOpen(true);
    } else {
      setDeliveryPickOpen(true);
    }
  };

  useEffect(() => {
    if (!deliveryOpen) return;
    if (!deliveryOrderId) return;
    loadOrderForDelivery(deliveryOrderId).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryOpen, deliveryOrderId]);

  useEffect(() => {
    if (!deliveryOpen) return;
    if (districts.length > 0) return;
    fetch("/api/public/delivery/districts")
      .then((r) => r.json())
      .then((d) => setDistricts(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setDistricts([]));
  }, [deliveryOpen, districts.length]);

  useEffect(() => {
    if (!deliveryOpen) return;
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
  }, [deliveryOpen, deliveryDistrictId]);

  useEffect(() => {
    if (!deliveryOpen) return;
    if (!deliveryKhorooId) {
      setDeliveryFee(0);
      return;
    }
    const k = khoroos.find((x) => Number(x.id) === Number(deliveryKhorooId));
    setDeliveryFee(k?.fee != null ? Number(k.fee) : 0);
  }, [deliveryOpen, deliveryKhorooId, khoroos]);

  const requestDelivery = async () => {
    if (!deliveryOrderId) return;
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
    setDeliverySaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/${deliveryOrderId}/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getActorHeaders() },
        body: JSON.stringify({
          deliveryName,
          deliveryPhone,
          deliveryAddress,
          deliveryDistrictId,
          deliveryKhorooId,
          paymentMethod: deliveryPaymentMethod,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.message || "Хүргэлт бүртгэхэд алдаа гарлаа");
        return;
      }
      if (json?.qpay) {
        setQpay({
          orderId: deliveryOrderId,
          qr_image: json.qpay.qr_image,
          qr_text: json.qpay.qr_text,
          short_url: json.qpay.short_url,
          deeplinks: json.qpay.deeplinks || [],
          expires_at: json.qpay.expires_at,
        });
      } else {
        alert("Хүргэлтэнд бүртгэгдлээ.");
        window.location.href = "/admin/order?status=shipping";
      }
    } finally {
      setDeliverySaving(false);
    }
  };

  const refreshDeliveryStatus = async () => {
    if (!deliveryOrderId) return;
    setChecking(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/${deliveryOrderId}`, {
        headers: { ...getActorHeaders() },
      });
      const json = await res.json().catch(() => ({}));
      const order = json?.order ?? null;
      const status = String(order?.status || "");
      if (status.includes("Хүргэлт")) {
        alert("Төлбөр баталгаажлаа. Хүргэлтэнд бүртгэгдсэн.");
        window.location.href = "/admin/order?status=shipping";
        return;
      }
      alert("Одоогоор төлбөр баталгаажаагүй байна. Дахин оролдоно уу.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="w-full p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Бараа олгох</h1>
        <AdminTableSearchBar
          value={phoneInput}
          onValueChange={setPhoneInput}
          placeholder="Утасны дугаар"
          debounceMs={3000}
          loading={loading}
          onSearch={() => {
            setPhoneApplied(phoneInput);
            fetchOrders(phoneInput);
          }}
          onRefresh={() => fetchOrders(phoneApplied)}
          showSearchButton
          searchButtonLabel="Хайх"
        />
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Зураг</th>
              <th className="p-3 text-left">Барааны нэр</th>
              <th className="p-3 text-left">Тайлбар</th>
              <th className="p-3 text-left">Захиалсан тоо</th>
              <th className="p-3 text-left">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center">Уншиж байна...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center">Мэдээлэл алга</td></tr>
            ) : (
              items.map((p) => {
                const rowKey = `${p.product_id ?? "x"}-${p.product_name}`;
                const isOpen = !!expanded[rowKey];
                return (
                  <React.Fragment key={rowKey}>
                    <tr className="border-t">
                      <td className="p-3">
                        <div className="h-12 w-12 rounded overflow-hidden border bg-gray-100">
                          <img
                            src={p.image_url || "/logo.png"}
                            alt={p.product_name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/logo.png";
                            }}
                          />
                        </div>
                      </td>
                      <td className="p-3 font-medium">{p.product_name}</td>
                      <td className="p-3 text-sm text-gray-600">
                        <span className="line-clamp-2">{p.product_description || "-"}</span>
                      </td>
                      <td className="p-3">{p.total_qty}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {canViewVariants && (
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                              className="h-9 w-9 rounded border bg-white flex items-center justify-center"
                              title="Төрлүүд"
                            >
                              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                          <button
                            onClick={() => setSelected(p.order_ids[0] ?? null)}
                            className="h-9 w-9 rounded border bg-white flex items-center justify-center"
                            title="Харах"
                            style={{ display: "none" }}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openDeliveryForOrders(p.order_ids, p.buyers)}
                            className="px-2 py-1 text-xs rounded bg-blue-600 text-white"
                          >
                            Хүргэлтэнд
                          </button>
                          <button
                            onClick={() => updateStatus(p.order_ids, "Бараа олгосон")}
                            className="px-2 py-1 text-xs rounded bg-green-600 text-white"
                          >
                            Олгосон
                          </button>
                          <button
                            onClick={() => updateStatus(p.order_ids, "Буцаагдсан")}
                            className="px-2 py-1 text-xs rounded bg-gray-600 text-white"
                          >
                            Буцаах
                          </button>
                        </div>
                      </td>
                    </tr>
                    {canViewVariants && isOpen && (
                      <tr className="border-t bg-gray-50">
                        <td colSpan={5} className="p-3">
                          <div className="grid gap-4">
                            <div>
                              <div className="text-xs font-semibold mb-2">Баталгаатай (variant_id)</div>
                              {p.variants_confirmed && p.variants_confirmed.length > 0 ? (
                                <div className="overflow-auto rounded border bg-white">
                                  <table className="min-w-full text-xs">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-3 py-2 text-left">Төрөл</th>
                                        <th className="px-3 py-2 text-left">Захиалга авах тоо</th>
                                        <th className="px-3 py-2 text-left">Захиалсан</th>
                                        <th className="px-3 py-2 text-left">Үлдэгдэл</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {p.variants_confirmed.map((v) => (
                                        <tr key={`c-${v.variant_id}`} className="border-t">
                                          <td className="px-3 py-2">{v.label}</td>
                                          <td className="px-3 py-2">{v.stock != null ? v.stock : "-"}</td>
                                          <td className="px-3 py-2">{v.ordered_qty}</td>
                                          <td className="px-3 py-2">
                                            {v.remaining_qty != null ? v.remaining_qty : "-"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">Төрөл мэдээлэл алга.</div>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-semibold mb-2">Таамагласан</div>
                              {p.variants_inferred && p.variants_inferred.length > 0 ? (
                                <div className="overflow-auto rounded border bg-white">
                                  <table className="min-w-full text-xs">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-3 py-2 text-left">Төрөл</th>
                                        <th className="px-3 py-2 text-left">Таамагласан захиалсан</th>
                                        <th className="px-3 py-2 text-left">Боломжит үлдэгдэл</th>
                                        <th className="px-3 py-2 text-left">Таамаглал</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {p.variants_inferred.map((v) => (
                                        <tr key={`i-${v.variant_id}-${v.inferred_by}`} className="border-t">
                                          <td className="px-3 py-2">{v.label}</td>
                                          <td className="px-3 py-2">{v.inferred_qty}</td>
                                          <td className="px-3 py-2">
                                            {v.remaining_after_inferred != null ? v.remaining_after_inferred : "-"}
                                          </td>
                                          <td className="px-3 py-2">
                                            {v.inferred_by === "image" ? "Зураг" : "Үнэ"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">Таамагласан өгөгдөл алга.</div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <OrderDetailsModal id={selected} onClose={() => setSelected(null)} />
      )}

      {deliveryPickOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">Хүргэлтэнд бүртгэх</div>
              <button onClick={() => setDeliveryPickOpen(false)} className="text-xl">
                &times;
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">Хүргэлт бүртгэх захиалгаа сонгоно уу.</div>
            <div className="mt-4 max-h-[60vh] space-y-2 overflow-auto pr-1">
              {deliveryCandidates.map((c) => (
                <button
                  key={c.order_id}
                  onClick={() => {
                    setDeliveryPickOpen(false);
                    setDeliveryOrderId(c.order_id);
                    setDeliveryOpen(true);
                  }}
                  className="w-full rounded-xl border p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">Захиалга #{c.order_id}</div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        {c.name} • {c.phone}
                      </div>
                      {c.order_status ? (
                        <div className="mt-1 text-[11px] text-gray-500">Төлөв: {c.order_status}</div>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-400">→</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {deliveryOpen && deliveryOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">Хүргэлтэнд бүртгэх (#{deliveryOrderId})</div>
              <button
                onClick={() => {
                  setDeliveryOpen(false);
                  setDeliveryOrderId(null);
                  setQpay(null);
                }}
                className="text-xl"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 grid gap-2 text-xs">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={deliveryDistrictId === "" ? "" : String(deliveryDistrictId)}
                  onChange={(e) => setDeliveryDistrictId(e.target.value ? Number(e.target.value) : "")}
                  className="rounded-lg border bg-white px-3 py-2"
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
                  className="rounded-lg border bg-white px-3 py-2"
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
                <div className="rounded-lg border bg-white px-3 py-2">
                  Хүргэлтийн төлбөр:{" "}
                  <span className="font-semibold text-red-600">{deliveryFee.toLocaleString()}₮</span>
                </div>
              )}

              <input
                value={deliveryName}
                onChange={(e) => setDeliveryName(e.target.value)}
                placeholder="Хүлээн авагчийн нэр"
                className="rounded-lg border bg-white px-3 py-2"
              />
              <input
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
                placeholder="Утас"
                className="rounded-lg border bg-white px-3 py-2"
              />
              <input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Нэмэлт хаяг (байр, тоот, орц гэх мэт)"
                className="rounded-lg border bg-white px-3 py-2"
              />

              <div className="mt-2 rounded-xl border bg-gray-50 p-3">
                <div className="text-xs font-semibold">Төлбөрийн сонголт</div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="deliveryPay"
                      checked={deliveryPaymentMethod === "QPAY"}
                      onChange={() => setDeliveryPaymentMethod("QPAY")}
                    />
                    QPay
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="deliveryPay"
                      checked={deliveryPaymentMethod === "BANK"}
                      onChange={() => setDeliveryPaymentMethod("BANK")}
                    />
                    Дансаар
                  </label>
                </div>
                <div className="mt-2 text-[11px] text-gray-500">
                  “Дансаар” сонговол шууд “Хүргэлтэнд бүртгэгдсэн” рүү шилжинэ.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={requestDelivery}
                  disabled={deliverySaving}
                  className="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {deliverySaving
                    ? "Хадгалж байна..."
                    : deliveryPaymentMethod === "QPAY"
                    ? "QPay үүсгэх"
                    : "Хүргэлтэнд бүртгэх"}
                </button>
              </div>

              {qpay && (
                <div className="mt-3 rounded-xl border bg-white p-3">
                  <div className="text-xs font-semibold">Хүргэлтийн төлбөр төлөх (QPay)</div>
                  <div className="mt-3 flex flex-col items-center gap-3">
                    {qpay.qr_image ? (
                      <Image
                        src={`data:image/png;base64,${qpay.qr_image}`}
                        alt="QPay QR"
                        width={208}
                        height={208}
                        className="h-52 w-52 rounded-lg border"
                        unoptimized
                      />
                    ) : qpay.qr_text ? (
                      <div className="text-[10px] break-all">{qpay.qr_text}</div>
                    ) : null}
                    <button
                      onClick={refreshDeliveryStatus}
                      disabled={checking}
                      className="rounded-full border px-4 py-2 text-xs font-semibold"
                    >
                      {checking ? "Шинэчилж байна..." : "Төлөв шинэчлэх"}
                    </button>
                    <div className="text-[11px] text-gray-500">
                      Төлбөр төлөгдвөл автоматаар “Хүргэлтэнд бүртгэгдсэн” рүү шилжинэ.
                    </div>
                  </div>
                  {qpay.deeplinks && qpay.deeplinks.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <button
                        type="button"
                        onClick={() => setShowBankApps((v) => !v)}
                        className="w-full rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
                      >
                        Банкны апп-аар төлөх
                      </button>
                      {showBankApps && (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {qpay.deeplinks.map((bank) => (
                            <a
                              key={bank.link}
                              href={bank.link}
                              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-gray-50"
                            >
                              {bank.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={bank.logo} alt={bank.name} className="h-5 w-5" />
                              ) : null}
                              <span>{bank.description || bank.name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
