"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getActorHeaders } from "@/lib/actorHeaders";
import { Eye } from "lucide-react";
import OrderDetailsModal from "../order/OrderDetailsModal";
import AdminTableSearchBar from "@/components/admin/AdminTableSearchBar";
import Image from "next/image";

type FulfillmentItem = {
  item_id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  product_description: string;
  image_url: string | null;
  qty: number;
  unit_price: number;
  order_status: string;
  item_status: string;
  buyer_name: string;
  buyer_phone: string;
  created_at: string | null;
  variant_label: string | null;
  variant_confirmed: boolean;
  inferred_by: "image" | "price" | null;
};

export default function FulfillmentPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneApplied, setPhoneApplied] = useState("");
  const [items, setItems] = useState<FulfillmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
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
      setItems(Array.isArray(json.raw_items) ? json.raw_items : []);
      setSelectedItemIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (itemIds: number[], status: string) => {
    if (!itemIds.length) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/items/bulk-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getActorHeaders() },
      body: JSON.stringify({ itemIds, status }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(json?.message || "Төлөв шинэчлэхэд алдаа гарлаа");
      return;
    }
    await fetchOrders(phoneApplied);
  };

  const openDeliveryForOrders = (
    orderIds: number[],
    buyers: { order_id: number; name: string; phone: string; order_status: string }[]
  ) => {
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

  const effectiveStatus = (item: FulfillmentItem) => String(item.item_status || item.order_status || "").trim();

  const filteredItems = useMemo(() => {
    if (statusFilter === "ALL") return items;
    return items.filter((item) => effectiveStatus(item) === statusFilter);
  }, [items, statusFilter]);

  const selectedRows = useMemo(
    () => filteredItems.filter((item) => selectedItemIds.includes(item.item_id)),
    [filteredItems, selectedItemIds]
  );

  const selectedOrderIds = useMemo(
    () => Array.from(new Set(selectedRows.map((item) => item.order_id))),
    [selectedRows]
  );

  const selectedBuyers = useMemo(
    () =>
      selectedOrderIds.map((orderId) => {
        const row = selectedRows.find((item) => item.order_id === orderId);
        return {
          order_id: orderId,
          name: row?.buyer_name || "-",
          phone: row?.buyer_phone || phoneApplied || "-",
          order_status: row?.order_status || "",
        };
      }),
    [phoneApplied, selectedOrderIds, selectedRows]
  );

  const toggleItem = (itemId: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleAll = () => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
      return;
    }
    setSelectedItemIds(filteredItems.map((item) => item.item_id));
  };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/status`, {
      headers: { ...getActorHeaders() },
    })
      .then((r) => r.json())
      .then((json) => {
        const names = Array.isArray(json)
          ? json.map((item: { name?: string }) => String(item?.name || "").trim()).filter(Boolean)
          : [];
        setStatusOptions(["ALL", ...names]);
      })
      .catch(() =>
        setStatusOptions([
          "ALL",
          "Хүлээгдэж байгаа",
          "Бараа ирсэн",
          "Хүргэлтэнд бүртгэгдсэн",
          "Бараа олгосон",
          "Буцаагдсан",
        ])
      );
  }, []);

  useEffect(() => {
    setSelectedItemIds([]);
  }, [statusFilter]);

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
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border bg-white px-3 text-sm"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? "Бүх төлөв" : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={filteredItems.length > 0 && selectedItemIds.length === filteredItems.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="p-3 text-left">Зураг</th>
              <th className="p-3 text-left">Барааны нэр</th>
              <th className="p-3 text-left">Төрөл</th>
              <th className="p-3 text-left">Төлөв</th>
              <th className="p-3 text-left">Тоо</th>
              <th className="p-3 text-left">Захиалга</th>
              <th className="p-3 text-left">Үзэх</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-4 text-center">Уншиж байна...</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-center">Мэдээлэл алга</td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const statusText = effectiveStatus(item) || "-";
                return (
                  <tr key={item.item_id} className="border-t">
                    <td className="p-3 align-top">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.includes(item.item_id)}
                        onChange={() => toggleItem(item.item_id)}
                      />
                    </td>
                    <td className="p-3 align-top">
                      <div className="h-12 w-12 overflow-hidden rounded border bg-gray-100">
                        <img
                          src={item.image_url || "/logo.png"}
                          alt={item.product_name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/logo.png";
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3 align-top font-medium">
                      <div>{item.product_name}</div>
                      <div className="mt-1 text-xs text-gray-500">{item.buyer_name} • {item.buyer_phone}</div>
                    </td>
                    <td className="p-3 align-top text-xs text-gray-600">
                      {item.variant_label ? (
                        <div>
                          <div>{item.variant_label}</div>
                          {!item.variant_confirmed && item.inferred_by && (
                            <div className="mt-1 text-[11px] text-amber-600">
                              {item.inferred_by === "image" ? "Зураг" : "Үнэ"}-ээр таамагласан
                            </div>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        {statusText}
                      </span>
                    </td>
                    <td className="p-3 align-top">{item.qty}</td>
                    <td className="p-3 align-top text-xs text-gray-500">#{item.order_id}</td>
                    <td className="p-3 align-top">
                      <button
                        onClick={() => setSelected(item.order_id)}
                        className="flex h-9 w-9 items-center justify-center rounded border bg-white"
                        title="Харах"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-600">
            Сонгосон бараа: <span className="font-semibold text-black">{selectedItemIds.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openDeliveryForOrders(selectedOrderIds, selectedBuyers)}
              disabled={selectedItemIds.length === 0}
              className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Хүргэлтээр авсан
            </button>
            <button
              onClick={() => updateStatus(selectedItemIds, "Бараа олгосон")}
              disabled={selectedItemIds.length === 0}
              className="rounded-full bg-green-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ирж авсан
            </button>
            <button
              onClick={() => updateStatus(selectedItemIds, "Буцаагдсан")}
              disabled={selectedItemIds.length === 0}
              className="rounded-full bg-gray-700 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Буцаасан
            </button>
          </div>
        </div>
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
