"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

type QPayInfo = {
  orderId: number;
  orderItemId: number;
  orderItemIds?: number[];
  cargo_fee?: number;
  delivery_fee?: number;
  total_fee?: number;
  qr_image?: string | null;
  qr_text?: string | null;
  short_url?: string | null;
  deeplinks?: { name: string; description: string; logo: string; link: string }[] | null;
  expires_at?: string | null;
};

type OrderItem = {
  id: number;
  qty: number;
  unitPrice: number;
  productId: number | null;
  productName: string;
  productImage: string | null;
  variantLabel?: { label: string; inferredBy: "image" | "price" | null; confirmed: boolean } | null;
  status?: string | null;
  delivery_method?: string | null;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  delivery_district_id?: number | null;
  delivery_district_name?: string | null;
  delivery_khoroo_id?: number | null;
  delivery_khoroo_name?: string | null;
  delivery_zone?: string | null;
  delivery_fee?: number;
  cargoFee?: number;
  return_note?: string | null;
};

type Order = {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  order_kind?: string | null;
  delivery_method?: string | null;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  delivery_district_id?: number | null;
  delivery_district_name?: string | null;
  delivery_khoroo_id?: number | null;
  delivery_khoroo_name?: string | null;
  delivery_zone?: string | null;
  delivery_fee?: number;
  items: OrderItem[];
};

type DeliveryOrderItem = {
  id: number;
  orderId: number;
  orderItemId: number;
  productId: number | null;
  variantId: number | null;
  productName: string;
  variantLabel?: string | null;
  qty: number;
  unitPrice: number;
  productImage: string | null;
  cargoFee?: number;
  status?: string | null;
  return_note?: string | null;
};

type DeliveryOrder = {
  id: number;
  sourceOrderId?: number | null;
  status: string;
  payment_status?: string | null;
  name: string;
  phone: string;
  address?: string | null;
  district_id?: number | null;
  district_name?: string | null;
  khoroo_id?: number | null;
  khoroo_name?: string | null;
  zone?: string | null;
  delivery_fee?: number;
  cargo_fee?: number;
  total: number;
  createdAt: string;
  items: DeliveryOrderItem[];
};

type StoredUser = {
  id?: string;
  role?: string | null;
};

type FlatOrderItem = OrderItem & {
  orderId: number;
  orderStatus: string;
  createdAt: string;
  total: number;
  effectiveStatus: string;
};

const getStatusLabel = (status: string, statuses: { name: string }[]) => {
  const hit = statuses.find((s) => s.name === status);
  return hit?.name ?? status;
};

const getStatusTabLabel = (status: string) => {
  if (status === "Буцаагдсан") return "Буцаасан";
  return status;
};

function OrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("status") || "ALL";
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState<DeliveryOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusOptions, setStatusOptions] = useState<{ id: number; name: string }[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [groupDeliveryOpen, setGroupDeliveryOpen] = useState(false);
  const [selectedDeliveryItemId, setSelectedDeliveryItemId] = useState<number | null>(null);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [districts, setDistricts] = useState<{ id: number; name: string }[]>([]);
  const [khoroos, setKhoroos] = useState<{ id: number; name: string; zone: string; fee: number }[]>([]);
  const [deliveryDistrictId, setDeliveryDistrictId] = useState<number | "">("");
  const [deliveryKhorooId, setDeliveryKhorooId] = useState<number | "">("");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [showBankApps, setShowBankApps] = useState(false);
  const [qpay, setQpay] = useState<QPayInfo | null>(null);
  const [groupDeliverySaving, setGroupDeliverySaving] = useState(false);
  const [groupShowBankApps, setGroupShowBankApps] = useState(false);
  const [groupQpay, setGroupQpay] = useState<QPayInfo | null>(null);
  const [groupChecking, setGroupChecking] = useState(false);
  const [groupCheckMessage, setGroupCheckMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState("");
  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return url;
    return `/uploads/${url}`;
  };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/status`)
      .then((r) => r.json())
      .then((data) => setStatusOptions(Array.isArray(data) ? data : []))
      .catch(() => setStatusOptions([]));
  }, []);

  const userId = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredUser;
      const role = String(parsed.role ?? "");
      const norm = role.toUpperCase().replace(/\s+/g, "_");
      setIsSuperAdmin(norm === "SUPER_ADMIN");
      return parsed?.id ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      router.push("/login");
      return;
    }
    Promise.all([
      (async () => {
        const url = new URL(`/api/public/orders`, window.location.origin);
        url.searchParams.set("userId", userId);
        const res = await fetch(url.toString());
        const json = await res.json().catch(() => ({}));
        setOrders(Array.isArray(json.items) ? json.items : []);
      })(),
      (async () => {
        const url = new URL(`/api/public/delivery-orders`, window.location.origin);
        url.searchParams.set("userId", userId);
        const res = await fetch(url.toString());
        const json = await res.json().catch(() => ({}));
        setDeliveryOrders(Array.isArray(json.items) ? json.items : []);
      })(),
    ]).finally(() => setLoading(false));
  }, [userId, active, router]);

  const loadDetail = async (
    id: string,
    opts?: {
      preservePaymentUi?: boolean;
      preserveDeliveryUi?: boolean;
      openDelivery?: boolean;
      deliveryItemId?: number | null;
    }
  ) => {
    if (!userId) return;
    setDetailLoading(true);
    try {
      const url = new URL(`/api/public/orders/${id}`, window.location.origin);
      url.searchParams.set("userId", userId);
      const res = await fetch(url.toString());
      const json = await res.json();
      setSelectedDeliveryOrder(null);
      setSelected(json);
      setSelectedDeliveryItemId(opts?.deliveryItemId ?? null);
      if (!opts?.preserveDeliveryUi) {
        setDeliveryOpen(Boolean(opts?.openDelivery));
      } else if (opts?.openDelivery) {
        setDeliveryOpen(true);
      }
      if (!opts?.preservePaymentUi) {
        setQpay(null);
        setCheckMessage("");
        setShowBankApps(false);
      }
      const deliveryItem =
        (opts?.deliveryItemId != null
          ? json?.items?.find((item: OrderItem) => Number(item.id) === Number(opts.deliveryItemId))
          : null) ?? null;
      setDeliveryName(deliveryItem?.delivery_name || json?.delivery_name || "");
      setDeliveryPhone(deliveryItem?.delivery_phone || json?.delivery_phone || "");
      setDeliveryAddress(deliveryItem?.delivery_address || json?.delivery_address || "");
      setDeliveryDistrictId(deliveryItem?.delivery_district_id ?? json?.delivery_district_id ?? "");
      setDeliveryKhorooId(deliveryItem?.delivery_khoroo_id ?? json?.delivery_khoroo_id ?? "");
    } finally {
      setDetailLoading(false);
    }
  };

  const loadDeliveryDetail = async (id: number) => {
    if (!userId) return;
    setDetailLoading(true);
    try {
      const url = new URL(`/api/public/delivery-orders/${id}`, window.location.origin);
      url.searchParams.set("userId", userId);
      const res = await fetch(url.toString());
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        setSelected(null);
        setSelectedDeliveryOrder(json);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const isArrivedStatus = (status?: string | null) => {
    const s = String(status || "").trim().toLowerCase();
    return s.includes("ирсэн") || s.includes("arrived");
  };

  const getEffectiveItemStatus = useCallback((orderStatus?: string | null, itemStatus?: string | null) => {
    const item = String(itemStatus || "").trim();
    const itemNorm = item.toLowerCase();
    const order = String(orderStatus || "").trim();
    if (isArrivedStatus(item)) return "Бараа ирсэн";
    if (
      itemNorm.includes("хүргэлт") ||
      itemNorm.includes("shipping") ||
      itemNorm.includes("олгосон") ||
      itemNorm.includes("handed") ||
      itemNorm.includes("буца") ||
      itemNorm.includes("return")
    ) {
      return item;
    }
    if (isArrivedStatus(order)) return "Бараа ирсэн";
    return item || order;
  }, []);

  const canRequestDeliveryForStatus = (order: Order | null, statusOverride?: string | null) => {
    if (!order) return false;
    const status = String(statusOverride ?? order.status ?? "").trim().toLowerCase();
    return status.includes("ирсэн") && !status.includes("олгосон") && !status.includes("хүргэлт");
  };

  const currentSelectedDeliveryItem = useMemo(() => {
    if (!selected || selectedDeliveryItemId == null) return null;
    return selected.items.find((item) => Number(item.id) === Number(selectedDeliveryItemId)) ?? null;
  }, [selected, selectedDeliveryItemId]);

  const currentCargoFee = Number(currentSelectedDeliveryItem?.cargoFee || 0);
  const currentDeliveryTotalFee = Number(deliveryFee || 0) + currentCargoFee;

  const deliveryActionLabel = (item?: OrderItem | null) => {
    if (!item) return "Хүргэлтээр авах";
    return String(item.delivery_method || "").trim().toLowerCase() === "delivery"
      ? "Хүргэлтийг үргэлжлүүлэх"
      : "Хүргэлтээр авах";
  };

  const arrivedTabKey = "Бараа ирсэн";

  useEffect(() => {
    if (!deliveryOpen && !groupDeliveryOpen) return;
    if (!userId) return;
    if (!selected && !groupDeliveryOpen) return;
    // Pre-fill from last delivery address if this item doesn't have delivery info yet.
    const fill = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`);
        const json = await res.json();
        const last = json?.lastDelivery ?? null;
        if (last) {
          if (!deliveryName.trim()) setDeliveryName(last.delivery_name || "");
          if (!deliveryPhone.trim()) setDeliveryPhone(last.delivery_phone || "");
          if (!deliveryAddress.trim()) setDeliveryAddress(last.delivery_address || "");
          if (!deliveryDistrictId && last.delivery_district_id) {
            setDeliveryDistrictId(Number(last.delivery_district_id));
          }
          if (!deliveryKhorooId && last.delivery_khoroo_id) {
            setDeliveryKhorooId(Number(last.delivery_khoroo_id));
          }
        }
      } catch {
        // ignore
      }
    };
    fill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryOpen, groupDeliveryOpen, userId, selected, selectedDeliveryItemId]);

  useEffect(() => {
    if (!deliveryOpen && !groupDeliveryOpen) return;
    if (districts.length > 0) return;
    fetch("/api/public/delivery/districts")
      .then((r) => r.json())
      .then((d) => setDistricts(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setDistricts([]));
  }, [deliveryOpen, groupDeliveryOpen, districts.length]);

  useEffect(() => {
    if (!deliveryOpen && !groupDeliveryOpen) return;
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
  }, [deliveryOpen, groupDeliveryOpen, deliveryDistrictId]);

  useEffect(() => {
    if (!deliveryOpen && !groupDeliveryOpen) return;
    if (!deliveryKhorooId) {
      setDeliveryFee(0);
      return;
    }
    const k = khoroos.find((x) => Number(x.id) === Number(deliveryKhorooId));
    setDeliveryFee(k?.fee != null ? Number(k.fee) : 0);
  }, [deliveryOpen, groupDeliveryOpen, deliveryKhorooId, khoroos]);

  const requestDelivery = async () => {
    if (!selected || !userId) return;
    if (selectedDeliveryItemId == null) {
      alert("Хүргэлт хүсэх бараагаа сонгоно уу.");
      return;
    }
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
      const res = await fetch(`/api/public/orders/${selected.id}/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          orderItemId: selectedDeliveryItemId,
          deliveryName,
          deliveryPhone,
          deliveryAddress,
          deliveryDistrictId,
          deliveryKhorooId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.message || "Хүргэлт бүртгэхэд алдаа гарлаа");
        return;
      }
      if (json?.qpay) {
        setQpay({
          orderId: Number(selected.id),
          orderItemId: Number(json.orderItemId ?? selectedDeliveryItemId),
          cargo_fee: Number(json.cargo_fee ?? currentCargoFee ?? 0),
          delivery_fee: Number(json.delivery_fee ?? deliveryFee ?? 0),
          total_fee: Number(
            json.total_fee ??
              Number(json.delivery_fee ?? deliveryFee ?? 0) +
                Number(json.cargo_fee ?? currentCargoFee ?? 0)
          ),
          qr_image: json.qpay.qr_image,
          qr_text: json.qpay.qr_text,
          short_url: json.qpay.short_url,
          deeplinks: json.qpay.deeplinks || [],
          expires_at: json.qpay.expires_at,
        });
        setDeliveryOpen(true);
      } else {
        setCheckMessage("Хүргэлтийн төлбөр 0₮ тул захиалга шууд хүргэлтэнд орлоо.");
      }
      // refresh detail so delivery info appears
      await loadDetail(String(selected.id), {
        preservePaymentUi: true,
        preserveDeliveryUi: true,
        openDelivery: true,
        deliveryItemId: selectedDeliveryItemId,
      });
    } finally {
      setDeliverySaving(false);
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    setChecking(true);
    try {
      if (qpay?.orderItemId) {
        const url = new URL("/api/payments/qpay/check", window.location.origin);
        url.searchParams.set("orderItemId", String(qpay.orderItemId));
        const res = await fetch(url.toString());
        const json = await res.json().catch(() => ({}));
        const status = String(json?.status || "").toUpperCase();
        if (status === "PAID") {
          setCheckMessage("Хүргэлтийн төлбөр амжилттай төлөгдлөө.");
          setQpay(null);
        } else if (status === "EXPIRED") {
          setCheckMessage("Хүргэлтийн нэхэмжлэлийн хугацаа дууссан байна.");
          setQpay(null);
        } else if (status === "UNPAID") {
          setCheckMessage("Төлбөр хийгдээгүй байна. Дахин шалгана уу.");
        }
      }
      await loadDetail(String(selected.id), {
        preservePaymentUi: true,
        preserveDeliveryUi: true,
        deliveryItemId: selectedDeliveryItemId,
      });
      await refreshOrders();
    } finally {
      setChecking(false);
    }
  };

  const filteredItems = useMemo<FlatOrderItem[]>(() => {
    if (active === "ALL") return [];
    return orders.flatMap((order) =>
      order.items
        .map((item) => {
          const effectiveStatus = getEffectiveItemStatus(order.status, item.status);
          return {
            ...item,
            orderId: order.id,
            orderStatus: order.status,
            createdAt: order.createdAt,
            total: order.total,
            effectiveStatus,
          };
        })
        .filter((item) => item.effectiveStatus === active)
    );
  }, [orders, active, getEffectiveItemStatus]);

  const footerDeliveryEntries = useMemo<FlatOrderItem[]>(() => {
    if (active !== arrivedTabKey) return [];
    const seen = new Set<number>();
    return filteredItems.filter((item) => {
      if (seen.has(item.id)) return false;
      const status = String(item.effectiveStatus || "").trim().toLowerCase();
      const canRequest =
        status.includes("ирсэн") &&
        !status.includes("олгосон") &&
        !status.includes("хүргэлт");
      if (!canRequest) return false;
      seen.add(item.id);
      return true;
    });
  }, [active, filteredItems]);

  const groupedCargoTotal = useMemo(
    () =>
      footerDeliveryEntries.reduce(
        (sum, item) =>
          sum +
          Math.max(0, Number(item.cargoFee || 0)) * Math.max(1, Number(item.qty || 0)),
        0,
      ),
    [footerDeliveryEntries],
  );
  const groupedDeliveryTotalFee = Number(deliveryFee || 0) + groupedCargoTotal;
  const groupDeliveryButtonLabel = useMemo(() => {
    return footerDeliveryEntries.some(
      (item) => String(item.delivery_method || "").trim().toLowerCase() === "delivery",
    )
      ? "Хүргэлтийг үргэлжлүүлэх"
      : "Хүргэлтээр авах";
  }, [footerDeliveryEntries]);

  const openGroupedDelivery = () => {
    if (footerDeliveryEntries.length === 0) return;
    const seed =
      footerDeliveryEntries.find(
        (item) => String(item.delivery_method || "").trim().toLowerCase() === "delivery",
      ) ?? footerDeliveryEntries[0];
    setSelected(null);
    setDeliveryOpen(false);
    setSelectedDeliveryItemId(null);
    setGroupDeliveryOpen(true);
    setDeliveryName(seed.delivery_name || "");
    setDeliveryPhone(seed.delivery_phone || "");
    setDeliveryAddress(seed.delivery_address || "");
    setDeliveryDistrictId(seed.delivery_district_id ?? "");
    setDeliveryKhorooId(seed.delivery_khoroo_id ?? "");
    setGroupQpay(null);
    setGroupCheckMessage("");
    setGroupShowBankApps(false);
  };

  const refreshOrders = async () => {
    if (!userId) return;
    const [ordersRes, deliveryRes] = await Promise.all([
      fetch(new URL(`/api/public/orders?userId=${userId}`, window.location.origin).toString()),
      fetch(new URL(`/api/public/delivery-orders?userId=${userId}`, window.location.origin).toString()),
    ]);
    const ordersJson = await ordersRes.json().catch(() => ({}));
    const deliveryJson = await deliveryRes.json().catch(() => ({}));
    setOrders(Array.isArray(ordersJson.items) ? ordersJson.items : []);
    setDeliveryOrders(Array.isArray(deliveryJson.items) ? deliveryJson.items : []);
  };

  const requestGroupedDelivery = async () => {
    if (!userId) return;
    if (footerDeliveryEntries.length === 0) {
      alert("Хүргэлтэнд оруулах бараа алга байна.");
      return;
    }
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

    setGroupDeliverySaving(true);
    try {
      const isSingleItem = footerDeliveryEntries.length === 1;
      const singleItem = isSingleItem ? footerDeliveryEntries[0] : null;
      const endpoint =
        isSingleItem && singleItem
          ? `/api/public/orders/${singleItem.orderId}/delivery`
          : "/api/public/orders/delivery-batch";
      const payload =
        isSingleItem && singleItem
          ? {
              userId,
              orderItemId: singleItem.id,
              deliveryName,
              deliveryPhone,
              deliveryAddress,
              deliveryDistrictId,
              deliveryKhorooId,
            }
          : {
              userId,
              orderItemIds: footerDeliveryEntries.map((item) => item.id),
              deliveryName,
              deliveryPhone,
              deliveryAddress,
              deliveryDistrictId,
              deliveryKhorooId,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.message || "Нэгтгэсэн хүргэлт бүртгэхэд алдаа гарлаа");
        return;
      }
      if (json?.qpay) {
        setGroupQpay({
          orderId: Number(singleItem?.orderId ?? footerDeliveryEntries[0]?.orderId ?? 0),
          orderItemId: Number(json.orderItemId ?? singleItem?.id ?? footerDeliveryEntries[0]?.id ?? 0),
          orderItemIds: Array.isArray(json.orderItemIds)
            ? json.orderItemIds.map((value: unknown) => Number(value)).filter((value: number) => Number.isFinite(value))
            : singleItem
              ? [singleItem.id]
              : footerDeliveryEntries.map((item) => item.id),
          cargo_fee: Number(json.cargo_fee ?? groupedCargoTotal ?? 0),
          delivery_fee: Number(json.delivery_fee ?? deliveryFee ?? 0),
          total_fee: Number(json.total_fee ?? groupedDeliveryTotalFee ?? 0),
          qr_image: json.qpay.qr_image,
          qr_text: json.qpay.qr_text,
          short_url: json.qpay.short_url,
          deeplinks: json.qpay.deeplinks || [],
          expires_at: json.qpay.expires_at,
        });
      } else {
        setGroupCheckMessage("Хүргэлтийн төлбөр 0₮ тул сонгосон бараанууд шууд хүргэлтэнд орлоо.");
      }
      await refreshOrders();
    } finally {
      setGroupDeliverySaving(false);
    }
  };

  const refreshGroupedDelivery = async () => {
    if (!groupQpay?.orderItemId) return;
    setGroupChecking(true);
    try {
      const url = new URL("/api/payments/qpay/check", window.location.origin);
      url.searchParams.set("orderItemId", String(groupQpay.orderItemId));
      const res = await fetch(url.toString());
      const json = await res.json().catch(() => ({}));
      const status = String(json?.status || "").toUpperCase();
      if (status === "PAID") {
        setGroupCheckMessage("Хүргэлтийн төлбөр амжилттай төлөгдлөө.");
        setGroupQpay(null);
      } else if (status === "EXPIRED") {
        setGroupCheckMessage("Хүргэлтийн нэхэмжлэлийн хугацаа дууссан байна.");
        setGroupQpay(null);
      } else if (status === "UNPAID") {
        setGroupCheckMessage("Төлбөр хийгдээгүй байна. Дахин шалгана уу.");
      }
      await refreshOrders();
    } finally {
      setGroupChecking(false);
    }
  };

  const orderedTabs = useMemo(() => {
    const orderedKeys = [
      "ALL",
      "Хүлээгдэж байгаа",
      "Бараа ирсэн",
      "Бараа олгосон",
      "Хүргэлтэнд бүртгэгдсэн",
      "Буцаагдсан",
    ];
    const known = new Set(orderedKeys.filter((key) => key !== "ALL"));
    const extras = statusOptions
      .map((s) => s.name)
      .filter((name) => name && !known.has(name));

    const tabs = orderedKeys.map((key) => {
      if (key === "ALL") return { key, label: "Бүгд" };
      return { key, label: getStatusTabLabel(key) };
    });

    return [
      ...tabs,
      ...extras.map((key) => ({ key, label: getStatusTabLabel(key) })),
    ];
  }, [statusOptions]);

  const shippingDeliveryOrders = useMemo(() => {
    if (active !== "Хүргэлтэнд бүртгэгдсэн") return [];
    return deliveryOrders.filter(
      (order) => String(order.status || "").trim() === "Хүргэлтэнд бүртгэгдсэн",
    );
  }, [active, deliveryOrders]);

  return (
    <main className="container mx-auto flex-1 px-6 py-10">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-lg font-bold">Захиалгууд</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {orderedTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => router.push(`/orders?status=${tab.key}`)}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  active === tab.key
                    ? "bg-[var(--accent-2)] text-white"
                    : "bg-[var(--sky-100)] text-[var(--gray-700)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-[var(--gray-500)]">Уншиж байна...</div>
          ) : active === "ALL" ? (
            orders.length === 0 ? (
              <div className="mt-6 text-sm text-[var(--gray-500)]">Одоогоор захиалга байхгүй.</div>
            ) : (
              <div className="mt-6 space-y-4">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold">Захиалга #{o.id}</div>
                      <div className="text-xs text-[var(--gray-500)]">
                        {new Date(o.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-2 text-xs">
                      Төлөв:{" "}
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                        {getStatusLabel(o.status, statusOptions)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {o.items.map((it) => (
                        <div key={it.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-[var(--sky-100)]">
                            {it.productImage ? (
                              <Image
                                src={resolveImageUrl(it.productImage)}
                                alt={it.productName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : null}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold">{it.productName}</div>
                            <div className="text-xs text-[var(--gray-500)]">
                              {it.qty}ш × {Number(it.unitPrice).toLocaleString()}₮
                            </div>
                            {isSuperAdmin && it.variantLabel && (
                              <div className="mt-1 text-[10px] text-[var(--gray-500)]">
                                Төрөл: {it.variantLabel.label}
                                {!it.variantLabel.confirmed && it.variantLabel.inferredBy && (
                                  <span className="ml-1 text-[10px] text-amber-600">
                                    ({it.variantLabel.inferredBy === "image" ? "зураг" : "үнэ"}‑ээр таамагласан)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-semibold sm:text-right">
                            {(it.qty * it.unitPrice).toLocaleString()}₮
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm font-semibold">
                      <div>Нийт дүн</div>
                      <div>{Number(o.total).toLocaleString()}₮</div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => loadDetail(String(o.id))}
                          className="rounded-full border px-4 py-2 text-xs font-semibold"
                        >
                          Дэлгэрэнгүй
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : active === "Хүргэлтэнд бүртгэгдсэн" ? (
            shippingDeliveryOrders.length === 0 ? (
              <div className="mt-6 text-sm text-[var(--gray-500)]">Одоогоор хүргэлтэнд бүртгэгдсэн захиалга байхгүй.</div>
            ) : (
              <div className="mt-6 space-y-4">
                {shippingDeliveryOrders.map((deliveryOrder) => {
                  const firstItem = deliveryOrder.items[0];
                  const itemCount = deliveryOrder.items.length;
                  const quantityTotal = deliveryOrder.items.reduce(
                    (sum, item) => sum + Math.max(1, Number(item.qty || 0)),
                    0,
                  );
                  return (
                    <div key={`delivery-${deliveryOrder.id}`} className="rounded-xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-1 items-start gap-3">
                          <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-[var(--sky-100)]">
                            {firstItem?.productImage ? (
                              <Image
                                src={resolveImageUrl(firstItem.productImage)}
                                alt={firstItem.productName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">
                              Хүргэлтийн захиалга #{deliveryOrder.id}
                            </div>
                            <div className="mt-1 text-xs text-[var(--gray-500)]">
                              {itemCount} мөр • Нийт {quantityTotal}ш бараа
                            </div>
                            {firstItem && (
                              <div className="mt-1 text-xs text-[var(--gray-500)]">
                                Эхний бараа: {firstItem.productName}
                                {firstItem.variantLabel ? ` / ${firstItem.variantLabel}` : ""}
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                              <span className="font-medium text-amber-700">
                                Карго: {Number(deliveryOrder.cargo_fee || 0).toLocaleString()}₮
                              </span>
                              <span className="font-medium text-red-600">
                                Хүргэлт: {Number(deliveryOrder.delivery_fee || 0).toLocaleString()}₮
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-[var(--gray-500)]">
                              {deliveryOrder.district_name || ""} {deliveryOrder.khoroo_name ? `• ${deliveryOrder.khoroo_name}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {Number(deliveryOrder.total || 0).toLocaleString()}₮
                          </div>
                          <div className="mt-1 text-[11px] text-[var(--gray-500)]">
                            {new Date(deliveryOrder.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] font-semibold text-sky-700">
                          Хүргэлтэнд бүртгэгдсэн
                        </span>
                        <button
                          onClick={() => loadDeliveryDetail(deliveryOrder.id)}
                          className="rounded-full border px-4 py-2 text-xs font-semibold"
                        >
                          Дэлгэрэнгүй
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredItems.length === 0 ? (
            <div className="mt-6 text-sm text-[var(--gray-500)]">Одоогоор захиалга байхгүй.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredItems.map((it) => (
                <div key={`${it.orderId}-${it.id}`} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-1 items-start gap-3">
                      <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-[var(--sky-100)]">
                        {it.productImage ? (
                          <Image
                            src={resolveImageUrl(it.productImage)}
                            alt={it.productName}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{it.productName}</div>
                        <div className="mt-1 text-xs text-[var(--gray-500)]">
                          {it.qty}ш × {Number(it.unitPrice).toLocaleString()}₮
                        </div>
                        {it.variantLabel && (
                          <div className="mt-1 text-[11px] text-[var(--gray-500)]">
                            Төрөл: {it.variantLabel.label}
                          </div>
                        )}
                        {isArrivedStatus(it.effectiveStatus) && Number(it.cargoFee || 0) > 0 && (
                          <div className="mt-1 text-[11px] font-medium text-amber-700">
                            Карго: {Number(it.cargoFee || 0).toLocaleString()}₮
                          </div>
                        )}
                        {it.return_note && (
                          <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                            Буцаалтын тайлбар: {it.return_note}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {(it.qty * it.unitPrice).toLocaleString()}₮
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--gray-500)]">
                        {new Date(it.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                      {getStatusLabel(it.effectiveStatus, statusOptions)}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <button
                        onClick={() =>
                          loadDetail(String(it.orderId), {
                            deliveryItemId: it.id,
                          })
                        }
                        className="rounded-full border px-4 py-2 text-xs font-semibold"
                      >
                        Дэлгэрэнгүй
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {footerDeliveryEntries.length > 0 && (
                <div className="rounded-xl border bg-[var(--sky-50)] px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-[var(--gray-600)]">
                      Бараа ирсэн бараа: <span className="font-semibold">{footerDeliveryEntries.length}</span>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={openGroupedDelivery}
                        className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
                      >
                        {groupDeliveryButtonLabel}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      {groupDeliveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b bg-white px-6 py-4">
              <div>
                <div className="text-lg font-bold">Нэгтгэсэн хүргэлт</div>
                <div className="text-xs text-[var(--gray-500)]">
                  Сонгогдсон бараа: {footerDeliveryEntries.length}
                </div>
              </div>
              <button
                onClick={() => setGroupDeliveryOpen(false)}
                className="text-xl"
              >
                &times;
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {footerDeliveryEntries.map((item) => (
                  <div
                    key={`group-${item.orderId}-${item.id}`}
                    className="flex items-center gap-3 rounded-xl border px-3 py-3"
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-[var(--sky-100)]">
                      {item.productImage ? (
                        <Image
                          src={resolveImageUrl(item.productImage)}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{item.productName}</div>
                      <div className="mt-1 text-xs text-[var(--gray-500)]">
                        #{item.orderId}
                        {item.variantLabel?.label ? ` • ${item.variantLabel.label}` : ""}
                      </div>
                      <div className="mt-1 text-xs text-[var(--gray-500)]">
                        {item.qty}ш × {Number(item.unitPrice).toLocaleString()}₮
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      {Number(item.cargoFee || 0) > 0 && (
                        <div className="font-semibold text-amber-700">
                          Карго: {(Math.max(0, Number(item.cargoFee || 0)) * Math.max(1, Number(item.qty || 0))).toLocaleString()}₮
                        </div>
                      )}
                      <div className="mt-1 font-semibold">
                        {(Number(item.unitPrice || 0) * Math.max(1, Number(item.qty || 0))).toLocaleString()}₮
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border bg-[var(--sky-50)] p-4 text-sm">
                <div className="grid gap-2 text-xs">
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
                  {groupedCargoTotal > 0 && (
                    <div className="rounded-lg border bg-white px-3 py-2">
                      Нийт карго:{" "}
                      <span className="font-semibold text-amber-600">{groupedCargoTotal.toLocaleString()}₮</span>
                    </div>
                  )}
                  {groupedDeliveryTotalFee > 0 && (
                    <div className="rounded-lg border bg-white px-3 py-2">
                      Төлөх нийт дүн:{" "}
                      <span className="font-semibold text-red-600">
                        {groupedDeliveryTotalFee.toLocaleString()}₮
                      </span>
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

                  <div className="flex items-center justify-end">
                    <button
                      onClick={requestGroupedDelivery}
                      disabled={groupDeliverySaving}
                      className="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {groupDeliverySaving ? "Хадгалж байна..." : "Хүргэлт бүртгэх"}
                    </button>
                  </div>
                </div>

                {groupQpay && (
                  <div className="mt-3 rounded-xl border bg-white p-3">
                    <div className="text-xs font-semibold">Нэгтгэсэн хүргэлтийн төлбөр (QPay)</div>
                    <div className="mt-3 flex flex-col items-center gap-3">
                      <div className="w-full rounded-lg border bg-[var(--sky-50)] px-3 py-2 text-xs text-[var(--gray-700)]">
                        <div className="flex items-center justify-between gap-3">
                          <span>Хүргэлт</span>
                          <span className="font-semibold">{Number(groupQpay.delivery_fee || 0).toLocaleString()}₮</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <span>Нийт карго</span>
                          <span className="font-semibold">{Number(groupQpay.cargo_fee || 0).toLocaleString()}₮</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 border-t pt-2 text-sm font-bold text-red-600">
                          <span>Нийт төлөх</span>
                          <span>{Number(groupQpay.total_fee || 0).toLocaleString()}₮</span>
                        </div>
                      </div>
                      {groupQpay.qr_image ? (
                        <Image
                          src={`data:image/png;base64,${groupQpay.qr_image}`}
                          alt="QPay QR"
                          width={208}
                          height={208}
                          className="h-52 w-52 rounded-lg border"
                          unoptimized
                        />
                      ) : groupQpay.qr_text ? (
                        <div className="text-[10px] break-all">{groupQpay.qr_text}</div>
                      ) : null}
                      <button
                        onClick={refreshGroupedDelivery}
                        disabled={groupChecking}
                        className="rounded-full border px-4 py-2 text-xs font-semibold"
                      >
                        {groupChecking ? "Шинэчилж байна..." : "Төлөв шинэчлэх"}
                      </button>
                      <div className="text-[11px] text-[var(--gray-600)]">
                        Төлбөр төлөгдвөл сонгосон бүх бараа “Хүргэлтэнд бүртгэгдсэн” рүү шилжинэ.
                      </div>
                    </div>
                    {groupQpay.deeplinks && groupQpay.deeplinks.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <button
                          type="button"
                          onClick={() => setGroupShowBankApps((value) => !value)}
                          className="w-full rounded-full bg-black px-4 py-2 text-xs font-semibold text-white"
                        >
                          Банкны апп-аар төлөх
                        </button>
                        {groupShowBankApps && (
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {groupQpay.deeplinks.map((bank) => (
                              <a
                                key={bank.link}
                                href={bank.link}
                                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
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

                {!groupQpay && groupCheckMessage && (
                  <div className="mt-3 rounded-lg border bg-white px-3 py-2 text-[11px] text-[var(--gray-600)]">
                    {groupCheckMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b bg-white px-6 py-4">
              <div className="text-lg font-bold">Захиалга #{selected.id}</div>
              <button onClick={() => setSelected(null)} className="text-xl">&times;</button>
            </div>
            {detailLoading ? (
              <div className="px-6 py-4 text-sm text-[var(--gray-500)]">Уншиж байна...</div>
            ) : (
              <div className="overflow-y-auto px-6 py-4">
                <div className="text-xs text-[var(--gray-500)]">
                  {new Date(selected.createdAt).toLocaleString()}
                </div>
                <div className="mt-4 space-y-3">
                  {selected.items.map((it) => (
                    <div key={it.id} className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-[var(--sky-100)]">
                        {it.productImage ? (
                          <Image
                            src={resolveImageUrl(it.productImage)}
                            alt={it.productName}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{it.productName}</div>
                        <div className="text-xs text-[var(--gray-500)]">
                          {it.qty}ш × {Number(it.unitPrice).toLocaleString()}₮
                        </div>
                        {isSuperAdmin && it.variantLabel && (
                          <div className="mt-1 text-[10px] text-[var(--gray-500)]">
                            Төрөл: {it.variantLabel.label}
                            {!it.variantLabel.confirmed && it.variantLabel.inferredBy && (
                              <span className="ml-1 text-[10px] text-amber-600">
                                ({it.variantLabel.inferredBy === "image" ? "зураг" : "үнэ"}‑ээр таамагласан)
                              </span>
                            )}
                          </div>
                        )}
                        {it.status && (
                          <div className="mt-1 text-[10px] text-[var(--gray-500)]">
                            Төлөв: {getStatusLabel(it.status, statusOptions)}
                          </div>
                        )}
                        {Number(it.cargoFee || 0) > 0 && (
                          <div className="mt-1 text-[10px] font-medium text-amber-700">
                            Карго: {Number(it.cargoFee || 0).toLocaleString()}₮
                          </div>
                        )}
                        {it.return_note && (
                          <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                            Буцаалтын тайлбар: {it.return_note}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-semibold">
                        {(it.qty * it.unitPrice).toLocaleString()}₮
                      </div>
                    </div>
                  ))}
                </div>
                {currentSelectedDeliveryItem &&
                  canRequestDeliveryForStatus(
                    selected,
                    getEffectiveItemStatus(selected.status, currentSelectedDeliveryItem.status),
                  ) && (
                  <div className="mt-4 rounded-xl border bg-[var(--sky-50)] p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">
                        {currentSelectedDeliveryItem.productName}
                        {currentSelectedDeliveryItem.variantLabel?.label
                          ? ` • ${currentSelectedDeliveryItem.variantLabel.label}`
                          : ""}
                      </div>
                      <button
                        onClick={() => setDeliveryOpen((v) => !v)}
                        className="rounded-full border bg-white px-4 py-2 text-xs font-semibold"
                      >
                        {deliveryOpen ? "Болих" : deliveryActionLabel(currentSelectedDeliveryItem)}
                      </button>
                    </div>
                    {deliveryOpen && (
                      <div className="mt-3 grid gap-2 text-xs">
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
                        {currentCargoFee > 0 && (
                          <div className="rounded-lg border bg-white px-3 py-2">
                            Карго:{" "}
                            <span className="font-semibold text-amber-600">{currentCargoFee.toLocaleString()}₮</span>
                          </div>
                        )}
                        {currentDeliveryTotalFee > 0 && (
                          <div className="rounded-lg border bg-white px-3 py-2">
                            Төлөх нийт дүн:{" "}
                            <span className="font-semibold text-red-600">
                              {currentDeliveryTotalFee.toLocaleString()}₮
                            </span>
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

                        <div className="flex items-center justify-end">
                          <button
                            onClick={requestDelivery}
                            disabled={deliverySaving}
                            className="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {deliverySaving ? "Хадгалж байна..." : "Хүргэлт бүртгэх"}
                          </button>
                        </div>
                      </div>
                    )}

                    {qpay && (
                      <div className="mt-3 rounded-xl border bg-white p-3">
                        <div className="text-xs font-semibold">Хүргэлтийн төлбөр төлөх (QPay)</div>
                        <div className="mt-3 flex flex-col items-center gap-3">
                          <div className="w-full rounded-lg border bg-[var(--sky-50)] px-3 py-2 text-xs text-[var(--gray-700)]">
                            <div className="flex items-center justify-between gap-3">
                              <span>Хүргэлт</span>
                              <span className="font-semibold">{Number(qpay.delivery_fee || 0).toLocaleString()}₮</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-3">
                              <span>Карго</span>
                              <span className="font-semibold">{Number(qpay.cargo_fee || 0).toLocaleString()}₮</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3 border-t pt-2 text-sm font-bold text-red-600">
                              <span>Нийт төлөх</span>
                              <span>{Number(qpay.total_fee || 0).toLocaleString()}₮</span>
                            </div>
                          </div>
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
                            onClick={refreshSelected}
                            disabled={checking}
                            className="rounded-full border px-4 py-2 text-xs font-semibold"
                          >
                            {checking ? "Шинэчилж байна..." : "Төлөв шинэчлэх"}
                          </button>
                          <div className="text-[11px] text-[var(--gray-600)]">
                            Хүргэлтийн төлбөр төлөгдвөл автоматаар “Хүргэлтэнд бүртгэгдсэн” рүү шилжинэ.
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
                                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
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

                    {!qpay && checkMessage && (
                      <div className="mt-3 rounded-lg border bg-white px-3 py-2 text-[11px] text-[var(--gray-600)]">
                        {checkMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {selectedDeliveryOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b bg-white px-6 py-4">
              <div className="text-lg font-bold">Хүргэлтийн захиалга #{selectedDeliveryOrder.id}</div>
              <button onClick={() => setSelectedDeliveryOrder(null)} className="text-xl">&times;</button>
            </div>
            {detailLoading ? (
              <div className="px-6 py-4 text-sm text-[var(--gray-500)]">Уншиж байна...</div>
            ) : (
              <div className="overflow-y-auto px-6 py-4">
                <div className="text-xs text-[var(--gray-500)]">
                  {new Date(selectedDeliveryOrder.createdAt).toLocaleString()}
                </div>
                <div className="mt-4 rounded-xl border bg-[var(--sky-50)] p-4 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] text-[var(--gray-500)]">Хүлээн авагч</div>
                      <div className="font-semibold">{selectedDeliveryOrder.name}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[var(--gray-500)]">Утас</div>
                      <div className="font-semibold">{selectedDeliveryOrder.phone}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-[11px] text-[var(--gray-500)]">Хаяг</div>
                      <div className="font-semibold">
                        {[selectedDeliveryOrder.district_name, selectedDeliveryOrder.khoroo_name, selectedDeliveryOrder.address]
                          .filter(Boolean)
                          .join(" / ")}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-lg border bg-white px-3 py-2">
                      Карго: <span className="font-semibold text-amber-700">{Number(selectedDeliveryOrder.cargo_fee || 0).toLocaleString()}₮</span>
                    </div>
                    <div className="rounded-lg border bg-white px-3 py-2">
                      Хүргэлт: <span className="font-semibold text-red-600">{Number(selectedDeliveryOrder.delivery_fee || 0).toLocaleString()}₮</span>
                    </div>
                    <div className="rounded-lg border bg-white px-3 py-2">
                      Нийт: <span className="font-semibold">{Number(selectedDeliveryOrder.total || 0).toLocaleString()}₮</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedDeliveryOrder.items.map((it) => (
                    <div key={`delivery-item-${it.id}`} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-[var(--sky-100)]">
                        {it.productImage ? (
                          <Image
                            src={resolveImageUrl(it.productImage)}
                            alt={it.productName}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{it.productName}</div>
                        <div className="text-xs text-[var(--gray-500)]">
                          {it.qty}ш × {Number(it.unitPrice).toLocaleString()}₮
                        </div>
                        {it.variantLabel && (
                          <div className="mt-1 text-[11px] text-[var(--gray-500)]">Төрөл: {it.variantLabel}</div>
                        )}
                        {Number(it.cargoFee || 0) > 0 && (
                          <div className="mt-1 text-[11px] font-medium text-amber-700">
                            Карго: {Number(it.cargoFee || 0).toLocaleString()}₮
                          </div>
                        )}
                        {it.return_note && (
                          <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                            Буцаалтын тайлбар: {it.return_note}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          {(Math.max(1, Number(it.qty || 0)) * Number(it.unitPrice || 0)).toLocaleString()}₮
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--gray-500)]">Эх захиалга #{it.orderId}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function OrdersPageClient() {
  return (
    <Suspense fallback={<div className="container mx-auto flex-1 px-6 py-10" />}>
      <OrdersPageContent />
    </Suspense>
  );
}
