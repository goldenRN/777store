"use client";
import React, { useEffect, useState } from "react";
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
};

export default function AdminOrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  const fetchOrders = async (p = page) => {
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = new URL(`${base}/api/orders`, window.location.origin);
      url.searchParams.set("page", String(p));
      url.searchParams.set("limit", String(limit));
      if (q) url.searchParams.set("q", q);

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
  }, []);

  const onSearch = () => fetchOrders(1);

  return (
    <div className="w-full mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Захиалгын жагсаалт</h1>

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
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/export`, "_blank")}
            className="bg-blue-700 text-white px-3 py-1 rounded"
          >
            CSV татах
          </button>

          <button
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/export/excel`, "_blank")}
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
              <th className="p-3 text-left">Огноо</th>
              <th className="p-3 text-left">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-4 text-center">Уншиж байна...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center">Захиалга хоосон байна</td></tr>
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
                    <span className={`px-2 py-0.5 rounded text-xs ${o.status === "pending" ? "bg-yellow-100 text-yellow-800" : o.status === "completed" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-3">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelected(o)} className="text-sm px-2 py-1 bg-blue-600 text-white rounded">Харах</button>
                      <button onClick={() => {
                        // quick mark complete
                        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${o.id}/status`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: o.status === "completed" ? "Хүлээгдэж байгаа" : "Баталгаажсан" })
                        }).then(() => fetchOrders(page));
                      }} className="text-sm px-2 py-1 bg-green-600 text-white rounded">
                        Статус солих
                      </button>
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
