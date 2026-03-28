"use client";
import React, { useEffect, useState } from "react";

export default function OrderDetailsModal({ id, onClose }: { id: number, onClose: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusOptions, setStatusOptions] = useState<{ id: number; name: string }[]>([]);
  const [invoiceInfo, setInvoiceInfo] = useState<any>(null);

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

  const markStatus = async (status: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchDetail();
  };

  const updateItemStatus = async (itemId: number, status: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/items/${itemId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchDetail();
  };

  const fallbackOptions = [
    { value: "pending", label: "Хүлээгдэж байгаа" },
    { value: "arrived", label: "Бараа ирсэн" },
    { value: "handed", label: "Хүлээлгэж өгсөн" },
    { value: "shipping", label: "Хүргэлтэнд бүртгүүлсэн" },
    { value: "delivered", label: "Хүргэгдсэн" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 z-10">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Захиалга #{id}</h3>
          <button onClick={onClose} className="text-gray-500">Хаах</button>
        </div>

        {loading ? <p className="mt-4">Уншиж байна...</p> : order && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Захиалагч</div>
                <div className="font-medium">{order.name}</div>
                <div className="text-xs text-gray-500">{order.email}</div>
              </div>
              <div>
                <div className="text-gray-600">Утас</div>
                <div className="font-medium">{order.phone1} {order.phone2 ? ` / ${order.phone2}` : ''}</div>
                <div className="text-gray-600">Төлөв</div>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${order.status === "pending" ? "bg-yellow-100 text-yellow-800" : order.status === "completed" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                    {order.status}
                  </span>
                </div>
                <div className="mt-2 text-gray-600">Төлбөрийн төлөв</div>
                <div className="mt-1">
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                    {order.payment_status || "UNPAID"}
                  </span>
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
              <div className="mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="py-2">#</th>
                      <th className="py-2">Бараа</th>
                      <th className="py-2">Тоо ширхэг</th>
                      <th className="py-2">Үнэ</th>
                      <th className="py-2">Нийт</th>
                      <th className="py-2">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={it.id} className="border-b">
                        <td className="py-2">{i + 1}</td>
                        <td className="py-2">{it.product_name}</td>
                        <td className="py-2">{it.quantity}</td>
                        <td className="py-2">{Number(it.price).toLocaleString()}₮</td>
                        <td className="py-2">{(it.quantity * Number(it.price)).toLocaleString()}₮</td>
                        <td className="py-2">
                          <select
                            value={it.status || (statusOptions[0]?.name ?? "pending")}
                            onChange={(e) => updateItemStatus(it.id, e.target.value)}
                            className="border rounded px-2 py-1 text-xs"
                          >
                            {statusOptions.length > 0
                              ? statusOptions.map((s) => (
                                  <option key={s.id} value={s.name}>
                                    {s.name}
                                  </option>
                                ))
                              : fallbackOptions.map((s) => (
                                  <option key={s.value} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end mt-3 items-center gap-3">
                  <div className="text-sm font-medium">Нийт: {Number(order.total || 0).toLocaleString()}₮</div>
                  <button onClick={() => markStatus("completed")} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Баталгаажуулах</button>
                  <button onClick={() => markStatus("cancelled")} className="px-3 py-1 bg-red-600 text-white rounded text-sm">Цуцлах</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
