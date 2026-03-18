"use client";
import React, { useEffect, useState } from "react";

export default function OrderDetailsModal({ id, onClose }: { id: number, onClose: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${id}`);
      const json = await res.json();
      setOrder(json.order);
      setItems(json.items);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const markStatus = async (status: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchDetail();
  };

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
              </div>
            </div>

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
