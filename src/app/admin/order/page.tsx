"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import OrderDetailsModal from "./OrderDetailsModal";
import { getActorHeaders } from "@/lib/actorHeaders";
import { Modal } from "@/components/ui/modal";
import { Eye, Tag } from "lucide-react";

type Order = {
  id: number;
  name: string;
  email: string | null;
  phone1: string;
  phone2: string | null;
  status: string;
  created_at: string;
  total: number;
  payment_status?: string | null;
  qpay_qr_image?: string | null;
  qpay_qr_text?: string | null;
  qpay_short_url?: string | null;
  payment_expires_at?: string | null;
};

type ProductSummary = {
  product_id: number | null;
  product_name: string;
  product_description: string;
  image_url: string | null;
  total_qty: number;
  order_count: number;
  item_ids: number[];
  buyers: { order_id: number; name: string; phone: string; qty: number }[];
};

type PaymentMethod = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
};

type AdminProductOption = {
  id: number;
  name: string;
  price: number;
  discount_price: number | null;
  images?: { image_url: string }[];
};

export default function AdminOrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [statusOptions, setStatusOptions] = useState<{ id: number; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<"order" | "product">("order");
  const [productItems, setProductItems] = useState<ProductSummary[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productDetail, setProductDetail] = useState<ProductSummary | null>(null);
  const [sortField, setSortField] = useState<keyof Order>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createPhone, setCreatePhone] = useState("");
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createUserId, setCreateUserId] = useState<string | null>(null);
  const [createItems, setCreateItems] = useState<{ product_id: number | ""; qty: number }[]>([
    { product_id: "", qty: 1 },
  ]);
  const [productOptions, setProductOptions] = useState<AdminProductOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState<number | "">("");
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const isPending = statusFilter.toLowerCase() === "pending";
  const isProductOnly = Boolean(statusFilter);
  const orderStatusLabels: Record<string, string> = {
    "Бараа олгосон": "Бараа олгосон",
    "Хүргэлтэнд бүртгэгдсэн": "Хүргэлтэнд бүртгэгдсэн",
    "Буцаагдсан": "Буцаагдсан",
    "Цуцлагдсан": "Цуцлагдсан",
  };
  const titleLabel = (() => {
    if (!statusFilter) return "Захиалгын жагсаалт";
    const hit = statusOptions.find((s) => s.name === statusFilter);
    if (hit) return hit.name;
    const key = statusFilter.toLowerCase();
    if (key === "pending") return "Хүлээгдэж буй";
    if (key === "confirmed") return "Баталгаажсан";
    if (key === "shipping" || key === "shipped") return "Хүргэлтэнд";
    if (key === "delivered" || key === "completed") return "Хүргэгдсэн";
    if (key === "cancelled" || key === "canceled") return "Цуцлагдсан";
    return statusFilter;
  })();

  const fetchOrders = async (p = page) => {
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = new URL(`${base}/api/orders`, window.location.origin);
      url.searchParams.set("page", String(p));
      url.searchParams.set("limit", String(limit));
      if (q) url.searchParams.set("q", q);
      if (statusFilter) url.searchParams.set("status", statusFilter);

      const res = await fetch(url.toString());
      const json = await res.json();
      setOrders(json.data || []);
      setPages(json.meta?.pages || 1);
      setPage(json.meta?.page || 1);
      setTotal(json.meta?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isProductOnly) {
      setViewMode("product");
    }
    if (viewMode === "order") {
      fetchOrders(1);
    } else {
      fetchProductSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, viewMode]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/status`)
      .then((r) => r.json())
      .then((data) => setStatusOptions(Array.isArray(data) ? data : []))
      .catch(() => setStatusOptions([]));
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    if (productOptions.length === 0) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/product`)
        .then((r) => r.json())
        .then((data) => setProductOptions(Array.isArray(data) ? data : []))
        .catch(() => setProductOptions([]));
    }
    if (paymentMethods.length === 0) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/payment-methods`)
        .then((r) => r.json())
        .then((data) => setPaymentMethods(Array.isArray(data) ? data : []))
        .catch(() => setPaymentMethods([]));
    }
  }, [createOpen, paymentMethods.length, productOptions.length]);

  useEffect(() => {
    if (!createOpen) return;
    const phone = createPhone.trim();
    if (phone.length < 4) {
      setCreateName("");
      setCreateEmail("");
      setCreateUserId(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/users`, window.location.origin);
        url.searchParams.set("q", phone);
        const res = await fetch(url.toString());
        const json = await res.json();
        const user = Array.isArray(json?.data) ? json.data[0] : null;
        if (user) {
          setCreateName(user.name || "");
          setCreateEmail(user.email || "");
          setCreateUserId(user.id || null);
        }
      } catch {
        // ignore
      }
    }, 450);
    return () => clearTimeout(t);
  }, [createOpen, createPhone]);

  const orderItemTotal = useMemo(() => {
    const map = new Map(productOptions.map((p) => [p.id, p]));
    return createItems.reduce((sum, it) => {
      if (!it.product_id) return sum;
      const p = map.get(Number(it.product_id));
      if (!p) return sum;
      const unit = p.discount_price && p.discount_price > 0 ? p.discount_price : p.price;
      return sum + Math.max(1, Number(it.qty || 1)) * unit;
    }, 0);
  }, [createItems, productOptions]);

  const onSearch = () => fetchOrders(1);

  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const fetchProductSummary = async () => {
    setProductLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = new URL(`${base}/api/orders/items/summary`, window.location.origin);
      if (statusFilter) url.searchParams.set("status", statusFilter);
      url.searchParams.set("payment", "PAID");
      if (isPending) url.searchParams.set("excludeArrived", "true");
      const res = await fetch(url.toString(), { headers: getActorHeaders() });
      const json = await res.json();
      setProductItems(json.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setProductLoading(false);
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortOrder === "asc"
      ? String(aVal ?? "").localeCompare(String(bVal ?? ""))
      : String(bVal ?? "").localeCompare(String(aVal ?? ""));
  });

  return (
    <div className="w-full mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">{titleLabel}</h1>

        <div className="flex flex-wrap items-center gap-2">
          {statusFilter && statusFilter.toLowerCase() === "pending" && false && (
            <div className="flex items-center rounded-md border bg-white">
              <button
                className={`px-3 py-1 text-xs ${viewMode === "order" ? "bg-[var(--accent-2)] text-white" : "text-gray-700"}`}
                onClick={() => setViewMode("order")}
              >
                Захиалгаар
              </button>
              <button
                className={`px-3 py-1 text-xs ${viewMode === "product" ? "bg-[var(--accent-2)] text-white" : "text-gray-700"}`}
                onClick={() => setViewMode("product")}
              >
                Бараагаар
              </button>
            </div>
          )}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Нэр / Имэйл / ID хайх..."
            className="border rounded px-3 py-1 text-sm w-full sm:w-64"
          />
          {viewMode === "order" && !isProductOnly && (
            <button onClick={onSearch} className="bg-blue-600 text-white px-3 py-1 rounded">Хайх</button>
          )}
          {/* <button onClick={exportCSV} className="bg-gray-700 text-white px-3 py-1 rounded">Export CSV</button> */}
          <button
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/export/excel`, "_blank")}
            className="bg-green-700 text-white px-3 py-1 rounded"
          >
            Excel татах
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-black text-white px-3 py-1 rounded"
            style={{ display: statusFilter ? "none" : "inline-flex" }}
          >
            Захиалга үүсгэх
          </button>
        </div>
      </div>

      {viewMode === "product" ? (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Зураг</th>
                <th className="p-3 text-left">Барааны нэр</th>
                <th className="p-3 text-left">Тайлбар</th>
                <th className="p-3 text-left">Захиалсан тоо</th>
                <th className="p-3 text-left">
                  <Tag size={14} className="text-gray-600" />
                </th>
                <th className="p-3 text-left">Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {productLoading ? (
                <tr><td colSpan={6} className="p-4 text-center">Уншиж байна...</td></tr>
              ) : productItems.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center">Мэдээлэл алга</td></tr>
              ) : (
                productItems.map((p) => (
                  <tr key={`${p.product_id ?? "x"}-${p.product_name}`} className="border-t">
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
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                        {titleLabel}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setProductDetail(p)}
                          className="text-sm px-2 py-1 bg-blue-600 text-white rounded"
                        >
                          Дэлгэрэнгүй
                        </button>
                        <button
                          onClick={async () => {
                            await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/items/bulk-status`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json", ...getActorHeaders() },
                              body: JSON.stringify({ itemIds: p.item_ids, status: "Бараа ирсэн" })
                            });
                            fetchProductSummary();
                          }}
                          className="text-sm px-2 py-1 bg-green-600 text-white rounded"
                        >
                          Бараа ирсэн
                        </button>
                        <button
                          onClick={async () => {
                            await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/items/bulk-status`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json", ...getActorHeaders() },
                              body: JSON.stringify({ itemIds: p.item_ids, status: "Буцаагдсан" })
                            });
                            fetchProductSummary();
                          }}
                          className="text-sm px-2 py-1 bg-red-600 text-white rounded"
                        >
                          Буцаагдсан
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: "id", label: "Дугаар" },
                { key: "name", label: "Захиалагч" },
                { key: "phone1", label: "Утас" },
                { key: "total", label: "Нийт" },
                { key: "payment_status", label: "Төлбөр" },
                { key: "created_at", label: "Огноо" },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key as keyof Order)}
                  className="p-3 text-left cursor-pointer hover:bg-gray-100"
                >
                  {col.label}{" "}
                  {sortField === col.key && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
              ))}
              <th className="p-3 text-left">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-4 text-center">Уншиж байна...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center">Захиалга хоосон байна</td></tr>
            ) : (
              sortedOrders.map(o => (
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{o.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-gray-500">{o.email}</div>
                  </td>
                  <td className="p-3">{o.phone1}</td>
                  <td className="p-3">{Number(o.total || 0).toLocaleString()}₮</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          o.payment_status === "PAID"
                            ? "bg-green-100 text-green-700"
                            : o.payment_status === "CANCELLED"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {o.payment_status || "UNPAID"}
                      </span>
                      {o.qpay_qr_image && (
                        <img
                          src={`data:image/png;base64,${o.qpay_qr_image}`}
                          alt="QPay QR"
                          className="h-10 w-10 rounded border"
                        />
                      )}
                    </div>
                  </td>
                  <td className="p-3">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelected(o)}
                        className="h-9 w-9 rounded border bg-white flex items-center justify-center"
                        title="Харах"
                      >
                        <Eye size={16} />
                      </button>
                      {isPending ? (
                        <button className="relative text-sm px-2 py-1 border rounded bg-white">
                          Төлөв солих
                          <select
                            value={o.status}
                            onChange={(e) => {
                              fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/${o.id}/status`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json", ...getActorHeaders() },
                                body: JSON.stringify({ status: e.target.value })
                              }).then(() => fetchOrders(page));
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          >
                            {statusOptions.length > 0 ? (
                              statusOptions.map((s) => (
                                <option key={s.id} value={s.name}>
                                  {s.name}
                                </option>
                              ))
                            ) : (
                              <option value={o.status}>{o.status}</option>
                            )}
                          </select>
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {viewMode === "order" && !isProductOnly && (
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="text-gray-600">
          Нийт {total} захиалгаас {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} харуулж байна
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => fetchOrders(page - 1)}
            className="h-8 px-3 text-xs border rounded disabled:opacity-50"
          >
            Өмнөх
          </button>
          {pages <= 7 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchOrders(p)}
                  className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                    p === page
                      ? "bg-[var(--accent-2)] text-white"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          {pages > 7 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchOrders(1)}
                className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                  page === 1
                    ? "bg-[var(--accent-2)] text-white"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                1
              </button>
              {page > 3 && <span className="px-1 text-gray-400">…</span>}
              {Array.from({ length: 3 }, (_, i) => page - 1 + i)
                .filter((p) => p > 1 && p < pages)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchOrders(p)}
                    className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                      p === page
                        ? "bg-[var(--accent-2)] text-white"
                        : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              {page < pages - 2 && <span className="px-1 text-gray-400">…</span>}
              <button
                onClick={() => fetchOrders(pages)}
                className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                  page === pages
                    ? "bg-[var(--accent-2)] text-white"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {pages}
              </button>
            </div>
          )}
          <button
            disabled={page >= pages}
            onClick={() => fetchOrders(page + 1)}
            className="h-8 px-3 text-xs border rounded disabled:opacity-50"
          >
            Дараах
          </button>
        </div>
      </div>
      )}

      {/* details modal */}
      {selected && (
        <OrderDetailsModal id={selected.id} onClose={() => { setSelected(null); fetchOrders(page); }} />
      )}
      {productDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setProductDetail(null)}></div>
          <div className="relative z-10 w-full max-w-2xl rounded-lg bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{productDetail.product_name}</h3>
              <button onClick={() => setProductDetail(null)} className="text-sm">Хаах</button>
            </div>
            <div className="mt-3 text-sm">Нийт: {productDetail.total_qty}</div>
            <div className="mt-4 overflow-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Захиалга</th>
                    <th className="px-3 py-2 text-left">Хэрэглэгч</th>
                    <th className="px-3 py-2 text-left">Утас</th>
                    <th className="px-3 py-2 text-left">Тоо</th>
                  </tr>
                </thead>
                <tbody>
                  {productDetail.buyers.map((b, idx) => (
                    <tr key={`${b.order_id}-${idx}`} className="border-t">
                      <td className="px-3 py-2">#{b.order_id}</td>
                      <td className="px-3 py-2">{b.name}</td>
                      <td className="px-3 py-2">{b.phone}</td>
                      <td className="px-3 py-2">{b.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Захиалга үүсгэх">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Захиалга үүсгэх</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-600">Утас</label>
              <input
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2"
                placeholder="Ж: 99xxxxxx"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Нэр</label>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2"
                placeholder="Нэр"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Имэйл</label>
              <input
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2"
                placeholder="Имэйл"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Захиалгын бараа</h3>
              <button
                onClick={() => setCreateItems((prev) => [...prev, { product_id: "", qty: 1 }])}
                className="text-sm px-2 py-1 border rounded"
              >
                Бараа нэмэх
              </button>
            </div>
            {createItems.map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <select
                  value={it.product_id === "" ? "" : String(it.product_id)}
                  onChange={(e) =>
                    setCreateItems((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, product_id: e.target.value ? Number(e.target.value) : "" } : row
                      )
                    )
                  }
                  className="border rounded px-3 py-2 md:col-span-2"
                >
                  <option value="">Бараа сонгох</option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={it.qty}
                  onChange={(e) =>
                    setCreateItems((prev) =>
                      prev.map((row, i) => (i === idx ? { ...row, qty: Number(e.target.value) } : row))
                    )
                  }
                  className="border rounded px-3 py-2"
                />
                <button
                  onClick={() => setCreateItems((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-sm px-2 py-1 border rounded"
                >
                  Устгах
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Төлбөрийн төрөл</label>
              <select
                value={paymentMethodId === "" ? "" : String(paymentMethodId)}
                onChange={(e) => setPaymentMethodId(e.target.value ? Number(e.target.value) : "")}
                className="mt-1 w-full border rounded px-3 py-2"
              >
                <option value="">Сонгох...</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Нийт: <span className="font-semibold">{orderItemTotal.toLocaleString()}₮</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded border">
              Хаах
            </button>
            <button
              onClick={async () => {
                if (!createPhone.trim()) {
                  alert("Утас оруулна уу");
                  return;
                }
                const filteredItems = createItems.filter((it) => it.product_id);
                if (filteredItems.length === 0) {
                  alert("Бараа сонгоно уу");
                  return;
                }
                setCreateLoading(true);
                try {
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/admin-create`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...getActorHeaders(),
                    },
                    body: JSON.stringify({
                      phone: createPhone.trim(),
                      name: createName.trim(),
                      email: createEmail.trim(),
                      user_id: createUserId,
                      payment_method_id: paymentMethodId || null,
                      items: filteredItems.map((it) => ({ product_id: it.product_id, qty: it.qty })),
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err?.message || "Алдаа гарлаа");
                  }
                  setCreateOpen(false);
                  setCreateItems([{ product_id: "", qty: 1 }]);
                  setCreatePhone("");
                  setCreateName("");
                  setCreateEmail("");
                  setCreateUserId(null);
                  setPaymentMethodId("");
                  fetchOrders(1);
                } catch (err: any) {
                  alert(err?.message || "Алдаа гарлаа");
                } finally {
                  setCreateLoading(false);
                }
              }}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
              disabled={createLoading}
            >
              Хадгалах
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
