"use client";
import React, { useEffect, useState } from "react";
import { getActorHeaders } from "@/lib/actorHeaders";
import { getVariantLabel } from "@/lib/variantLabel";
import { X } from "lucide-react";

export default function OrderDetailsModal({ id, onClose }: { id: number, onClose: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusOptions, setStatusOptions] = useState<{ id: number; name: string }[]>([]);
  const [invoiceInfo, setInvoiceInfo] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [variantOptionsByProduct, setVariantOptionsByProduct] = useState<Record<number, any[]>>({});
  const [selectedVariantByItem, setSelectedVariantByItem] = useState<Record<number, number | "">>({});

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/${id}`);
      const json = await res.json();
      setOrder(json.order);
      setItems(json.items);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchDetail(); }, [id]);
  useEffect(() => {
    if (!order?.qpay_invoice_id) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/payments/qpay/invoice?orderId=${order.id}`)
      .then((r) => r.json())
      .then((data) => setInvoiceInfo(data?.invoice || null))
      .catch(() => setInvoiceInfo(null));
  }, [order?.qpay_invoice_id, order?.id]);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/status`)
      .then((r) => r.json())
      .then((data) => setStatusOptions(Array.isArray(data) ? data : []))
      .catch(() => setStatusOptions([]));
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const role = raw ? String(JSON.parse(raw)?.role ?? "") : "";
      const norm = role.toUpperCase().replace(/\s+/g, "_");
      setIsSuperAdmin(norm === "SUPER_ADMIN");
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);

  const markStatus = async (status: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getActorHeaders() },
      body: JSON.stringify({ status }),
    });
    await fetchDetail();
  };

  const updateItemStatus = async (itemId: number, status: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/items/${itemId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getActorHeaders() },
      body: JSON.stringify({ status }),
    });
    await fetchDetail();
  };

  const orderStatusLabels: Record<string, string> = {
    "Бараа олгосон": "Бараа олгосон",
    "Хүргэлтэнд бүртгэгдсэн": "Хүргэлтэнд бүртгэгдсэн",
    "Буцаагдсан": "Буцаагдсан",
    "Цуцлагдсан": "Цуцлагдсан",
    shipping: "Хүргэлтэнд бүртгэгдсэн",
    handed: "Бараа олгосон",
    returned: "Буцаагдсан",
    cancelled: "Цуцлагдсан",
    completed: "Бараа олгосон",
    confirmed: "Бараа олгосон",
  };

  const itemStatusLabels: Record<string, string> = {
    "Бараа ирсэн": "Бараа ирсэн",
    "Хүлээгдэж байгаа": "Хүлээгдэж байгаа",
    "Захиалга авч байгаа": "Захиалга авч байгаа",
    "Захиалга хаагдсан": "Захиалга хаагдсан",
    pending: "Хүлээгдэж байгаа",
    arrived: "Бараа ирсэн",
    open: "Захиалга авч байгаа",
    closed: "Захиалга хаагдсан",
  };

  const fallbackOptions = [
    { value: "Хүлээгдэж байгаа", label: "Хүлээгдэж байгаа" },
    { value: "Бараа ирсэн", label: "Бараа ирсэн" },
    { value: "Захиалга авч байгаа", label: "Захиалга авч байгаа" },
    { value: "Захиалга хаагдсан", label: "Захиалга хаагдсан" },
  ];

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "/logo-777.png";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/")) return url;
    return `/${url}`;
  };

  const variantsForProduct = (productId?: number | null) =>
    productId ? variantOptionsByProduct[productId] || [] : [];

  const openVariantEditor = async (item: any) => {
    if (!item?.product_id) return;
    setEditingItemId(item.id);
    setSelectedVariantByItem((prev) => ({
      ...prev,
      [item.id]: item.variant_id ?? "",
    }));
    if (!variantOptionsByProduct[item.product_id]) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/productvar/${item.product_id}`
        );
        const json = await res.json();
        setVariantOptionsByProduct((prev) => ({
          ...prev,
          [item.product_id]: Array.isArray(json) ? json : [],
        }));
      } catch {
        setVariantOptionsByProduct((prev) => ({ ...prev, [item.product_id]: [] }));
      }
    }
  };

  const saveVariant = async (item: any) => {
    if (!item?.id) return;
    setSavingItemId(item.id);
    const variant_id = selectedVariantByItem[item.id] || null;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/items/${item.id}/variant`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getActorHeaders() },
        body: JSON.stringify({ variant_id }),
      });
      await fetchDetail();
      setEditingItemId(null);
    } finally {
      setSavingItemId(null);
    }
  };

  const variantLabel = (variant: any) =>
    getVariantLabel(variant?.attribute, variant?.sku, variant?.id) || "";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-start md:items-center justify-center p-2 md:p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
        <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl max-h-[calc(100vh-1rem)] md:max-h-[calc(100vh-2rem)] flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b px-4 py-3 md:px-6 md:py-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold">Захиалга #{id}</h3>
              <div className="text-xs text-gray-500">
                Дэлгэрэнгүй
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-gray-600 hover:bg-gray-50"
              aria-label="Хаах"
              title="Хаах"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 md:px-6 md:pb-6">
            {loading ? <p className="mt-2 text-sm">Уншиж байна...</p> : order && (
              <>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-gray-600">Захиалагч</div>
                    <div className="mt-1 font-medium">{order.name}</div>
                    <div className="mt-0.5 text-xs text-gray-500">{order.email}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-gray-600">Утас</div>
                    <div className="mt-1 font-medium">{order.phone1} {order.phone2 ? ` / ${order.phone2}` : ''}</div>
                    {order.delivery_method && (
                      <div className="mt-2 text-xs text-gray-600">
                        Хүргэлтийн хэлбэр:{" "}
                        <span className="font-semibold">
                          {order.delivery_method === "delivery" ? "Хүргэлт" : "Дэлгүүрээс авах"}
                        </span>
                        {order.delivery_method === "delivery" && (
                          <div className="mt-1 text-[11px] text-gray-500">
                            Нэр: {order.delivery_name || "-"}, Утас: {order.delivery_phone || "-"}
                            <div>Хаяг: {order.delivery_address || "-"}</div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-3 text-gray-600">Төлөв</div>
                    <div className="mt-1 text-sm text-gray-800">
                      {orderStatusLabels[order.status] || order.status}
                    </div>
                    <div className="mt-2 text-gray-600">Төлбөрийн төлөв</div>
                    <div className="mt-1 text-sm text-gray-800">
                      {order.payment_status || "UNPAID"}
                    </div>
                  </div>
                </div>

                {(order.qpay_qr_image || order.qpay_qr_text || order.qpay_short_url) && (
                  <div className="mt-4 rounded-lg border p-3">
                    <div className="text-sm font-semibold mb-2">QPay төлбөр</div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center justify-center">
                        {order.qpay_qr_image ? (
                          <img
                            src={`data:image/png;base64,${order.qpay_qr_image}`}
                            alt="QPay QR"
                            className="h-40 w-40 rounded border"
                          />
                        ) : order.qpay_qr_text ? (
                          <div className="text-xs break-all">{order.qpay_qr_text}</div>
                        ) : null}
                      </div>
                      <div className="text-xs">
                        {order.qpay_short_url && (
                          <div>
                            Богино холбоос:{" "}
                            <a className="text-blue-600 underline" href={order.qpay_short_url} target="_blank">
                              {order.qpay_short_url}
                            </a>
                          </div>
                        )}
                        {invoiceInfo?.expiry_date ? (
                          <div className="mt-2 text-gray-600">
                            Дуусах огноо: {new Date(invoiceInfo.expiry_date).toLocaleString()}
                          </div>
                        ) : order.payment_expires_at ? (
                          <div className="mt-2 text-gray-600">
                            Дуусах огноо: {new Date(order.payment_expires_at).toLocaleString()}
                          </div>
                        ) : null}
                        {invoiceInfo?.expiry_date && (
                          <div className="mt-1 text-[11px] font-semibold text-gray-700">
                            {new Date(invoiceInfo.expiry_date).getTime() > Date.now()
                              ? "QR хүчинтэй байна"
                              : "Хугацаа дууссан"}
                          </div>
                        )}
                        {invoiceInfo?.invoice_status && (
                          <div className="mt-1 text-[11px] text-gray-500">
                            QPay төлөв: {invoiceInfo.invoice_status}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <h4 className="font-semibold">Захиалга</h4>
                  <div className="mt-2 overflow-x-auto rounded-lg border">
                    <table className="min-w-[720px] w-full text-sm bg-white">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Бараа</th>
                          <th className="py-2 px-3">Тоо ширхэг</th>
                          <th className="py-2 px-3">Үнэ</th>
                          <th className="py-2 px-3">Нийт</th>
                          <th className="py-2 px-3">Төлөв</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, i) => (
                          <tr key={it.id} className="border-b last:border-b-0">
                            <td className="py-2 px-3">{i + 1}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-start gap-2">
                                <img
                                  src={resolveImageUrl(it.image_url)}
                                  alt={it.product_name || "Бараа"}
                                  className="h-10 w-10 rounded border object-cover"
                                  loading="lazy"
                                />
                                <div className="leading-snug">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium">{it.product_name}</div>
                                    {isSuperAdmin && it.product_id ? (
                                      <button
                                        type="button"
                                        onClick={() => openVariantEditor(it)}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded border text-gray-600 hover:bg-gray-50"
                                        title="Төрөл засах"
                                      >
                                        <svg
                                          viewBox="0 0 24 24"
                                          className="h-4 w-4"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M12 20h9" />
                                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                        </svg>
                                      </button>
                                    ) : null}
                                  </div>
                                  {it.variant ? (
                                    <div className="text-xs text-gray-500">
                                      {variantLabel(it.variant)}
                                    </div>
                                  ) : null}
                                  {editingItemId === it.id && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <select
                                        className="h-9 rounded border px-2 text-xs"
                                        value={selectedVariantByItem[it.id] ?? ""}
                                        onChange={(e) =>
                                          setSelectedVariantByItem((prev) => ({
                                            ...prev,
                                            [it.id]: e.target.value ? Number(e.target.value) : "",
                                          }))
                                        }
                                      >
                                        <option value="">Төрөл сонгох...</option>
                                        {variantsForProduct(it.product_id).map((v: any) => (
                                          <option key={v.id} value={v.id}>
                                            {variantLabel(v)}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => saveVariant(it)}
                                        className="h-9 rounded bg-black px-3 text-xs text-white"
                                        disabled={savingItemId === it.id}
                                      >
                                        {savingItemId === it.id ? "Хадгалж байна" : "Хадгалах"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingItemId(null)}
                                        className="h-9 rounded border px-3 text-xs text-gray-700"
                                      >
                                        Болих
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3">{it.quantity}</td>
                            <td className="py-2 px-3">{Number(it.price).toLocaleString()}₮</td>
                            <td className="py-2 px-3">{(it.quantity * Number(it.price)).toLocaleString()}₮</td>
                            <td className="py-2 px-3 text-sm text-gray-800">
                              {orderStatusLabels[order.status] ||
                                itemStatusLabels[it.status] ||
                                it.status ||
                                order.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end mt-3 items-center gap-3">
                    <div className="text-sm font-medium">Нийт: {Number(order.total || 0).toLocaleString()}₮</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
