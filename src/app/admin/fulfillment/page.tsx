"use client";

import React, { useState } from "react";
import { getActorHeaders } from "@/lib/actorHeaders";
import { Eye } from "lucide-react";
import OrderDetailsModal from "../order/OrderDetailsModal";

type ProductSummary = {
  product_id: number | null;
  product_name: string;
  product_description: string;
  image_url: string | null;
  total_qty: number;
  order_ids: number[];
  buyers: { order_id: number; name: string; phone: string; qty: number; order_status: string }[];
};

export default function FulfillmentPage() {
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const fetchOrders = async () => {
    const q = phone.trim();
    if (!q) return;
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = new URL(`${base}/api/orders/items/by-phone`, window.location.origin);
      url.searchParams.set("phone", q);
      url.searchParams.set("payment", "PAID");
      const res = await fetch(url.toString());
      const json = await res.json();
      setItems(json.items || []);
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
    fetchOrders();
  };

  return (
    <div className="w-full p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Бараа олгох</h1>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Утасны дугаар"
            className="border rounded px-3 py-2 text-sm w-full md:w-64"
          />
          <button
            onClick={fetchOrders}
            className="bg-black text-white px-4 py-2 rounded text-sm"
          >
            Хайх
          </button>
        </div>
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
              items.map((p) => (
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
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSelected(p.order_ids[0] ?? null)}
                        className="h-9 w-9 rounded border bg-white flex items-center justify-center"
                        title="Харах"
                        style={{ display: "none" }}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => updateStatus(p.order_ids, "Хүргэлтэнд бүртгэгдсэн")}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <OrderDetailsModal id={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
