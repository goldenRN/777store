"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import OrderDetailsModal from "./OrderDetailsModal";

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

export default function AdminOrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [statusOptions, setStatusOptions] = useState<{ id: number; name: string }[]>([]);
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/status`)
      .then((r) => r.json())
      .then((data) => setStatusOptions(Array.isArray(data) ? data : []))
      .catch(() => setStatusOptions([]));
  }, []);

  const onSearch = () => fetchOrders(1);

  return (
    <div className="w-full mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{titleLabel}</h1>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Нэр / Имэйл / ID хайх..."
            className="border rounded px-3 py-1 text-sm"
          />
          <button onClick={onSearch} className="bg-blue-600 text-white px-3 py-1 rounded">Хайх</button>
          {/* <button onClick={exportCSV} className="bg-gray-700 text-white px-3 py-1 rounded">Export CSV</button> */}
          <button
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/export/excel`, "_blank")}
            className="bg-green-700 text-white px-3 py-1 rounded"
          >
            Excel татах
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Дугаар</th>
              <th className="p-3 text-left">Захиалагч</th>
              <th className="p-3 text-left">Утас</th>
              <th className="p-3 text-left">Нийт</th>
              <th className="p-3 text-left">Төлөв</th>
              <th className="p-3 text-left">Төлбөр</th>
              <th className="p-3 text-left">Огноо</th>
              <th className="p-3 text-left">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-4 text-center">Уншиж байна...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center">Захиалга хоосон байна</td></tr>
            ) : (
              orders.map(o => (
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{o.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-gray-500">{o.email}</div>
                  </td>
                  <td className="p-3">{o.phone1}</td>
                  <td className="p-3">{Number(o.total || 0).toLocaleString()}₮</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {o.status}
                    </span>
                  </td>
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
                      <button onClick={() => setSelected(o)} className="text-sm px-2 py-1 bg-blue-600 text-white rounded">Харах</button>
                      <select
                        value={o.status}
                        onChange={(e) => {
                          fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/${o.id}/status`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: e.target.value })
                          }).then(() => fetchOrders(page));
                        }}
                        className="text-sm px-2 py-1 border rounded"
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
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">Хуудас {page}/{pages}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => fetchOrders(page - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Өмнөх</button>
          <button disabled={page >= pages} onClick={() => fetchOrders(page + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Дараах</button>
        </div>
      </div>

      {/* details modal */}
      {selected && (
        <OrderDetailsModal id={selected.id} onClose={() => { setSelected(null); fetchOrders(page); }} />
      )}
    </div>
  );
}
