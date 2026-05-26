"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getActorHeaders } from "@/lib/actorHeaders";
import { Eye } from "lucide-react";
import OrderDetailsModal from "../order/OrderDetailsModal";
import AdminTableSearchBar from "@/components/admin/AdminTableSearchBar";
import Image from "next/image";
import { RURAL_DELIVERY_FEE } from "@/lib/deliveryFees";

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
  cargo_fee: number;
  variant_label: string | null;
  variant_confirmed: boolean;
  inferred_by: "image" | "price" | null;
};

type RecentFulfillmentAction = {
  item_id: number;
  order_id: number;
  product_name: string;
  image_url: string | null;
  qty: number;
  buyer_name: string;
  buyer_phone: string;
  variant_label: string | null;
  status: string;
  note: string | null;
  actor_name: string | null;
  actor_phone: string | null;
  created_at: string;
  delivery_address: string | null;
};

type RecentActionFilter = "ALL" | "ирж авсан" | "Хүргэлтээр авсан" | "Буцаагдсан";
type RecentRangePreset = "today" | "yesterday" | "7d" | "custom";
export type FulfillmentViewMode = "fulfill" | "history";
type DeliveryAreaType = "city" | "rural";

export default function FulfillmentWorkspace({ mode }: { mode: FulfillmentViewMode }) {
  const activeTab = mode;
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneApplied, setPhoneApplied] = useState("");
  const [items, setItems] = useState<FulfillmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryPrefillOrderId, setDeliveryPrefillOrderId] = useState<number | null>(null);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryAreaType, setDeliveryAreaType] = useState<DeliveryAreaType>("city");
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
    deliveryOrderId?: number | null;
    orderItemId?: number | null;
    qr_image?: string | null;
    qr_text?: string | null;
    short_url?: string | null;
    deeplinks?: { name: string; description: string; logo: string; link: string }[] | null;
    expires_at?: string | null;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [returnSaving, setReturnSaving] = useState(false);
  const [recentDate, setRecentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recentRangePreset, setRecentRangePreset] = useState<RecentRangePreset>("today");
  const [recentActionFilter, setRecentActionFilter] = useState<RecentActionFilter>("ALL");
  const [recentSearchInput, setRecentSearchInput] = useState("");
  const [recentSearchApplied, setRecentSearchApplied] = useState("");
  const [recentActions, setRecentActions] = useState<RecentFulfillmentAction[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [deliveryPaidRedirecting, setDeliveryPaidRedirecting] = useState(false);


  const resetDeliveryUi = () => {
    setDeliveryName("");
    setDeliveryPhone("");
    setDeliveryAddress("");
    setDeliveryAreaType("city");
    setDeliveryDistrictId("");
    setDeliveryKhorooId("");
    setDeliveryFee(0);
    setDeliveryPaymentMethod("QPAY");
    setShowBankApps(false);
    setQpay(null);
    setDeliveryPaidRedirecting(false);
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
    setDeliveryAreaType(order.delivery_district_id ? "city" : "rural");
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

  const updateStatus = async (itemIds: number[], status: string, extra?: { returnNote?: string }) => {
    if (!itemIds.length) return false;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/items/bulk-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getActorHeaders() },
      body: JSON.stringify({ itemIds, status, returnNote: extra?.returnNote }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(json?.message || "Төлөв шинэчлэхэд алдаа гарлаа");
      return false;
    }
    await fetchOrders(phoneApplied);
    return true;
  };

  const submitReturn = async () => {
    const note = returnNote.trim();
    if (!selectedItemIds.length) return;
    if (!note) {
      alert("Буцаалтын тайлбар оруулна уу.");
      return;
    }
    setReturnSaving(true);
    try {
      const ok = await updateStatus(selectedItemIds, "Буцаагдсан", { returnNote: note });
      if (!ok) return;
      setReturnOpen(false);
      setReturnNote("");
    } finally {
      setReturnSaving(false);
    }
  };

  const openDeliveryForSelection = () => {
    if (!selectedRows.length) return;
    resetDeliveryUi();
    setDeliveryPrefillOrderId(selectedOrderIds[0] || null);
    const firstRow = selectedRows[0];
    setDeliveryName(String(firstRow?.buyer_name || "").trim());
    setDeliveryPhone(String(firstRow?.buyer_phone || "").trim());
    setDeliveryOpen(true);
  };

  const effectiveStatus = (item: FulfillmentItem) => String(item.item_status || item.order_status || "").trim();

  const statusBadgeClass = (status: string) => {
    const normalized = status.trim().toLowerCase();
    if (normalized.includes("хүргэгд") || normalized.includes("delivered") || normalized.includes("completed")) {
      return "bg-slate-200 text-slate-700";
    }
    if (normalized.includes("олгосон") || normalized.includes("handed")) {
      return "bg-emerald-100 text-emerald-700";
    }
    if (normalized.includes("хүргэлт") || normalized.includes("shipping")) {
      return "bg-blue-100 text-blue-700";
    }
    if (normalized.includes("буца") || normalized.includes("return")) {
      return "bg-red-100 text-red-700";
    }
    if (normalized.includes("ирсэн") || normalized.includes("arrived")) {
      return "bg-emerald-100 text-emerald-700";
    }
    return "bg-gray-100 text-gray-700";
  };

  const deliveredRowClass = (status: string) => {
    const normalized = status.trim().toLowerCase();
    if (normalized.includes("хүргэгд") || normalized.includes("delivered") || normalized.includes("completed")) {
      return "bg-slate-50 text-slate-500";
    }
    return "";
  };

  const recentFilterPillClass = (selected: boolean) =>
    selected
      ? "bg-black text-white border-black"
      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";

  const fetchRecentActions = async (
    date = recentDate,
    preset: RecentRangePreset = recentRangePreset,
    status: RecentActionFilter = recentActionFilter
  ) => {
    setRecentLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = new URL(`${base}/api/orders/items/recent-actions`, window.location.origin);
      url.searchParams.set("limit", "20");
      if (preset === "custom") {
        if (date) url.searchParams.set("date", date);
      } else {
        url.searchParams.set("preset", preset);
      }
      if (status !== "ALL") {
        url.searchParams.set("status", status);
      }
      const res = await fetch(url.toString(), { headers: { ...getActorHeaders() } });
      const json = await res.json().catch(() => ({}));
      setRecentActions(Array.isArray(json.items) ? json.items : []);
    } catch (error) {
      console.error(error);
      setRecentActions([]);
    } finally {
      setRecentLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (statusFilter === "ALL") return items;
    return items.filter((item) => effectiveStatus(item) === statusFilter);
  }, [items, statusFilter]);

  const selectedRows = useMemo(
    () => filteredItems.filter((item) => selectedItemIds.includes(item.item_id)),
    [filteredItems, selectedItemIds]
  );

  const filteredRecentActions = useMemo(() => {
    const needle = recentSearchApplied.trim().toLowerCase();
    if (!needle) return recentActions;
    return recentActions.filter((action) => {
      const haystack = [
        action.product_name,
        action.buyer_name,
        action.buyer_phone,
        action.variant_label,
        action.status,
        action.note,
        action.actor_name,
        action.actor_phone,
        `#${action.order_id}`,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [recentActions, recentSearchApplied]);

  const groupedRecentActions = useMemo(() => {
    const normalizeActionGroupTime = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      date.setMilliseconds(0);
      return date.toISOString();
    };

    const groups = new Map<
      string,
      {
        key: string;
        buyer_name: string;
        buyer_phone: string;
        status: string;
        note: string | null;
        created_at: string;
        orderIds: number[];
        totalQty: number;
        items: RecentFulfillmentAction[];
      }
    >();

    for (const action of filteredRecentActions) {
      const normalizedCreatedAt = normalizeActionGroupTime(action.created_at);
      const key = [
        action.buyer_phone || "",
        action.status || "",
        normalizedCreatedAt,
        action.note || "",
        action.actor_phone || action.actor_name || "",
      ].join("|");

      const existing = groups.get(key);
      if (existing) {
        existing.totalQty += Number(action.qty || 0);
        existing.items.push(action);
        if (!existing.orderIds.includes(action.order_id)) {
          existing.orderIds.push(action.order_id);
        }
      } else {
        groups.set(key, {
          key,
          buyer_name: action.buyer_name,
          buyer_phone: action.buyer_phone,
          status: action.status,
          note: action.note,
          created_at: action.created_at,
          orderIds: [action.order_id],
          totalQty: Number(action.qty || 0),
          items: [action],
        });
      }
    }

    return Array.from(groups.values());
  }, [filteredRecentActions]);

  const selectedOrderIds = useMemo(
    () => Array.from(new Set(selectedRows.map((item) => item.order_id))),
    [selectedRows]
  );

  const selectedCargoTotal = useMemo(
    () => selectedRows.reduce((sum, item) => sum + Number(item.cargo_fee || 0) * Number(item.qty || 0), 0),
    [selectedRows]
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

  const handleMarkDelivered = async () => {
    if (!selectedItemIds.length) return;
    const message =
      selectedCargoTotal > 0
        ? `Сонгосон ${selectedItemIds.length} барааг "Ирж авсан" болгох уу?\nНийт карго: ${selectedCargoTotal.toLocaleString()}₮`
        : `Сонгосон ${selectedItemIds.length} барааг "Ирж авсан" болгох уу?`;
    if (!window.confirm(message)) return;
    await updateStatus(selectedItemIds, "Бараа олгосон");
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
    if (activeTab !== "history") return;
    fetchRecentActions(recentDate, recentRangePreset, recentActionFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, recentDate, recentRangePreset, recentActionFilter]);

  useEffect(() => {
    if (!deliveryOpen) return;
    if (!deliveryPrefillOrderId) return;
    loadOrderForDelivery(deliveryPrefillOrderId).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryOpen, deliveryPrefillOrderId]);

  useEffect(() => {
    if (!deliveryOpen) return;
    if (deliveryAreaType === "rural") {
      setKhoroos([]);
      setDeliveryKhorooId("");
      setDeliveryFee(RURAL_DELIVERY_FEE);
      return;
    }
    if (districts.length > 0) return;
    fetch("/api/public/delivery/districts")
      .then((r) => r.json())
      .then((d) => setDistricts(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setDistricts([]));
  }, [deliveryAreaType, deliveryOpen, districts.length]);

  useEffect(() => {
    if (!deliveryOpen) return;
    if (deliveryAreaType === "rural") {
      setKhoroos([]);
      setDeliveryKhorooId("");
      setDeliveryFee(RURAL_DELIVERY_FEE);
      return;
    }
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
  }, [deliveryAreaType, deliveryOpen, deliveryDistrictId]);

  useEffect(() => {
    if (!deliveryOpen) return;
    if (deliveryAreaType === "rural") {
      setDeliveryFee(RURAL_DELIVERY_FEE);
      return;
    }
    if (!deliveryKhorooId) {
      setDeliveryFee(0);
      return;
    }
    const k = khoroos.find((x) => Number(x.id) === Number(deliveryKhorooId));
    setDeliveryFee(k?.fee != null ? Number(k.fee) : 0);
  }, [deliveryAreaType, deliveryOpen, deliveryKhorooId, khoroos]);

  const requestDelivery = async () => {
    if (!selectedItemIds.length) return;
    if (!deliveryName.trim() || !deliveryPhone.trim()) {
      alert("Хүргэлтийн нэр, утсаа бүрэн бөглөнө үү.");
      return;
    }
    if (deliveryAreaType === "city" && (!deliveryDistrictId || !deliveryKhorooId)) {
      alert("Дүүрэг, хороо сонгоно уу.");
      return;
    }
    if (!deliveryAddress.trim()) {
      alert(
        deliveryAreaType === "rural"
          ? "Орон нутгийн бүтэн хаягаа бичнэ үү."
          : "Нэмэлт хаягаа (байр, тоот, орц гэх мэт) бичнэ үү.",
      );
      return;
    }
    setDeliverySaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/delivery-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getActorHeaders() },
        body: JSON.stringify({
          orderItemIds: selectedItemIds,
          deliveryAreaType,
          deliveryName,
          deliveryPhone,
          deliveryAddress,
          deliveryDistrictId: deliveryAreaType === "city" ? deliveryDistrictId : null,
          deliveryKhorooId: deliveryAreaType === "city" ? deliveryKhorooId : null,
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
          orderId: selectedOrderIds[0] || 0,
          deliveryOrderId: Number(json.delivery_order_id || 0) || null,
          orderItemId: Number(json.orderItemId || 0) || null,
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

  const refreshDeliveryStatus = async (options?: { silent?: boolean }) => {
    const deliveryOrderId = Number(qpay?.deliveryOrderId || 0);
    const orderItemId = Number(qpay?.orderItemId || 0);
    if (!deliveryOrderId && !orderItemId) return;
    setChecking(true);
    try {
      if (orderItemId) {
        const checkRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/payments/qpay/check?orderItemId=${orderItemId}`,
          {
            headers: { ...getActorHeaders() },
          }
        );
        const checkJson = await checkRes.json().catch(() => ({}));
        if (String(checkJson?.status || "").toUpperCase() === "PAID") {
          if (!options?.silent) {
            alert("Төлбөр баталгаажлаа. Хүргэлтэнд бүртгэгдсэн.");
          }
          setDeliveryPaidRedirecting(true);
          window.location.href = "/admin/order?status=shipping";
          return;
        }
      }

      if (deliveryOrderId) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/delivery-orders/${deliveryOrderId}`, {
          headers: { ...getActorHeaders() },
        });
        const json = await res.json().catch(() => ({}));
        const order = json?.order ?? null;
        const status = String(order?.status || "").toLowerCase();
        const paymentStatus = String(order?.payment_status || "").toUpperCase();
        if (paymentStatus === "PAID" || status.includes("хүргэлт")) {
          if (!options?.silent) {
            alert("Төлбөр баталгаажлаа. Хүргэлтэнд бүртгэгдсэн.");
          }
          setDeliveryPaidRedirecting(true);
          window.location.href = "/admin/order?status=shipping";
          return;
        }
      }

      if (!options?.silent) {
        alert("Одоогоор төлбөр баталгаажаагүй байна. Дахин оролдоно уу.");
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!deliveryOpen || !qpay || deliveryPaidRedirecting) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      refreshDeliveryStatus({ silent: true }).catch(() => null);
    };

    const interval = window.setInterval(tick, 5000);
    const onFocus = () => {
      refreshDeliveryStatus({ silent: true }).catch(() => null);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshDeliveryStatus({ silent: true }).catch(() => null);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [deliveryOpen, qpay, deliveryPaidRedirecting]);

  return (
    <div className="w-full p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">
          {activeTab === "history" ? "Олгогдсон бараа" : "Бараа олгох"}
        </h1>
        {activeTab === "fulfill" ? (
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
        ) : (
          <AdminTableSearchBar
            value={recentSearchInput}
            onValueChange={setRecentSearchInput}
            placeholder="Бараа, захиалга, худалдан авагч хайх..."
            debounceMs={3000}
            loading={recentLoading}
            onSearch={() => setRecentSearchApplied(recentSearchInput)}
            onRefresh={() => {
              setRecentSearchApplied(recentSearchInput);
              fetchRecentActions(recentDate, recentRangePreset, recentActionFilter);
            }}
            showSearchButton
            searchButtonLabel="Хайх"
          />
        )}
      </div>

      {activeTab === "history" ? (
        <div className="mb-5 rounded-2xl bg-white p-4 shadow">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-base font-semibold">Сүүлийн үйлдлүүд</div>
              <div className="mt-1 text-xs text-gray-500">
                Сонгосон өдөрт бүртгэгдсэн хамгийн сүүлийн 20 олголт, хүргэлт, буцаалт.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={recentDate}
                onChange={(e) => {
                  setRecentRangePreset("custom");
                  setRecentDate(e.target.value);
                }}
                className="h-10 rounded-lg border bg-white px-3 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRecentRangePreset("today")}
                className={`rounded-full border px-3 py-2 text-xs font-semibold ${recentFilterPillClass(recentRangePreset === "today")}`}
              >
                Өнөөдөр
              </button>
              <button
                onClick={() => setRecentRangePreset("yesterday")}
                className={`rounded-full border px-3 py-2 text-xs font-semibold ${recentFilterPillClass(recentRangePreset === "yesterday")}`}
              >
                Өчигдөр
              </button>
              <button
                onClick={() => setRecentRangePreset("7d")}
                className={`rounded-full border px-3 py-2 text-xs font-semibold ${recentFilterPillClass(recentRangePreset === "7d")}`}
              >
                7 хоног
              </button>
              <button
                onClick={() => setRecentRangePreset("custom")}
                className={`rounded-full border px-3 py-2 text-xs font-semibold ${recentFilterPillClass(recentRangePreset === "custom")}`}
              >
                Огноо сонгох
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                { key: "ALL", label: "Бүгд" },
                { key: "Бараа олгосон", label: "Зөвхөн олгосон" },
                { key: "Хүргэлтэнд бүртгэгдсэн", label: "Зөвхөн хүргэлт" },
                { key: "Буцаагдсан", label: "Зөвхөн буцаалт" },
              ] as { key: RecentActionFilter; label: string }[]).map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setRecentActionFilter(filter.key)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold ${recentFilterPillClass(recentActionFilter === filter.key)}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Зураг</th>
                  <th className="p-3 text-left">Худалдан авагч</th>
                  <th className="p-3 text-left">Бараанууд</th>
                  <th className="p-3 text-left">Төлөв</th>
                  <th className="p-3 text-left">Хаяг</th>
                  <th className="p-3 text-left">Тайлбар</th>
                  <th className="p-3 text-left">Захиалга</th>
                  <th className="p-3 text-left">Огноо</th>
                </tr>
              </thead>
              <tbody>
                {recentLoading ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center">Уншиж байна...</td>
                  </tr>
                ) : groupedRecentActions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-500">
                      Сүүлийн олголтын түүх олдсонгүй.
                    </td>
                  </tr>
                ) : (
                  groupedRecentActions.map((group) => {
                    const cover = group.items[0];
                    return (
                    <tr key={group.key} className="border-t align-top">
                      <td className="p-3 align-top">
                        <div className="h-12 w-12 overflow-hidden rounded border bg-gray-100">
                          {cover?.image_url ? (
                            <Image
                              src={cover.image_url}
                              alt={cover.product_name}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <img
                              src="/logo.png"
                              alt={cover?.product_name || "Бараа"}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-medium">{group.buyer_name || "—"}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {group.buyer_phone}
                        </div>
                        <div className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">
                          {group.items.length} бараа • {group.totalQty}ш
                        </div>
                      </td>
                      <td className="p-3 align-top">
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <div key={`${item.item_id}-${item.order_id}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                              <div className="font-medium text-gray-900">{item.product_name}</div>
                              <div className="mt-1 text-xs text-gray-500">
                                {item.variant_label || "Төрөлгүй"} • {item.qty}ш
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 align-top">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(group.status)}`}>
                          {group.status}
                        </span>
                      </td>
                      <td className="p-3 align-top text-xs text-gray-600">
                        {group.status === "Хүргэлтэнд бүртгэгдсэн" ? (
                          <div className="max-w-[220px] whitespace-pre-wrap break-words" title={group.items.find((item) => item.delivery_address)?.delivery_address || "-"}>
                            {group.items.find((item) => item.delivery_address)?.delivery_address || "-"}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 align-top text-xs text-gray-600">
                        {group.note || "-"}
                      </td>
                      <td className="p-3 align-top text-xs text-gray-500">
                        {group.orderIds.map((id) => `#${id}`).join(", ")}
                      </td>
                      <td className="p-3 align-top text-xs text-gray-500">
                        {new Date(group.created_at).toLocaleString()}
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>

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
                  <th className="p-3 text-left">Карго</th>
                  <th className="p-3 text-left">Тоо</th>
                  <th className="p-3 text-left">Захиалга</th>
                  <th className="p-3 text-left">Үзэх</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center">Уншиж байна...</td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center">Мэдээлэл алга</td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const statusText = effectiveStatus(item) || "-";
                    return (
                      <tr key={item.item_id} className={`border-t ${deliveredRowClass(statusText)}`}>
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
                        <td className="p-3 align-top font-medium">
                          {Number(item.cargo_fee || 0) > 0 ? (
                            <div>
                              <div>{(Number(item.cargo_fee || 0) * Number(item.qty || 0)).toLocaleString()}₮</div>
                              {Number(item.qty || 0) > 1 && (
                                <div className="mt-1 text-[11px] font-normal text-gray-500">
                                  {Number(item.cargo_fee || 0).toLocaleString()}₮ × {item.qty}
                                </div>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
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
                <span className="mx-2 text-gray-300">•</span>
                Нийт карго: <span className="font-semibold text-black">{selectedCargoTotal.toLocaleString()}₮</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={openDeliveryForSelection}
                  disabled={selectedItemIds.length === 0}
                  className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Хүргэлтээр авсан
                </button>
                <button
                  onClick={handleMarkDelivered}
                  disabled={selectedItemIds.length === 0}
                  className="rounded-full bg-green-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ирж авсан
                </button>
                <button
                  onClick={() => setReturnOpen(true)}
                  disabled={selectedItemIds.length === 0}
                  className="rounded-full bg-gray-700 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Буцаасан
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {selected && (
        <OrderDetailsModal id={selected} onClose={() => setSelected(null)} />
      )}

      {deliveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">Хүргэлтэнд бүртгэх ({selectedItemIds.length} бараа)</div>
              <button
                onClick={() => {
                  setDeliveryOpen(false);
                  setDeliveryPrefillOrderId(null);
                  setQpay(null);
                }}
                className="text-xl"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 grid gap-2 text-xs">
              <select
                value={deliveryAreaType}
                onChange={(e) => setDeliveryAreaType((e.target.value as DeliveryAreaType) || "city")}
                className="rounded-lg border bg-white px-3 py-2"
              >
                <option value="city">Нийслэл</option>
                <option value="rural">Орон нутаг</option>
              </select>

              {deliveryAreaType === "city" ? (
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
              ) : (
                <div className="rounded-lg border bg-white px-3 py-2 text-[11px] text-[var(--gray-700)]">
                  Орон нутаг сонгосон тул доорх хамгийн сүүлийн хаягийн талбарт бүтэн хаягаа оруулна уу.
                </div>
              )}

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
                placeholder={
                  deliveryAreaType === "rural"
                    ? "Бүтэн хаяг (аймаг, сум, баг, гудамж, тоот...)"
                    : "Нэмэлт хаяг (байр, тоот, орц гэх мэт)"
                }
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
                      onClick={() => {
                        refreshDeliveryStatus().catch(() => null);
                      }}
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

      {returnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">Буцаалт хийх</div>
              <button
                onClick={() => {
                  if (returnSaving) return;
                  setReturnOpen(false);
                  setReturnNote("");
                }}
                className="text-xl"
              >
                &times;
              </button>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Сонгосон {selectedItemIds.length} бараанд буцаалтын тайлбар оруулаад хадгална.
            </div>
            <textarea
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="Буцааж байгаа шалтгаан, тайлбар..."
              className="mt-4 min-h-[140px] w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-gray-400"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  if (returnSaving) return;
                  setReturnOpen(false);
                  setReturnNote("");
                }}
                className="rounded-full border px-4 py-2 text-sm font-semibold"
              >
                Болих
              </button>
              <button
                onClick={submitReturn}
                disabled={returnSaving}
                className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {returnSaving ? "Хадгалж байна..." : "Хадгалах"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
