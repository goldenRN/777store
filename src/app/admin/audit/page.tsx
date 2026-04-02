"use client";

import { useEffect, useState } from "react";
import { getActorHeaders } from "@/lib/actorHeaders";

type AuditItem = {
  id: number;
  actor_name: string | null;
  actor_phone: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
};

export default function AuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const limit = 20;

  useEffect(() => {
    const raw = localStorage.getItem("user");
    const role = raw ? JSON.parse(raw).role : null;
    if (role !== "SUPER_ADMIN") {
      setForbidden(true);
    }
  }, []);

  useEffect(() => {
    if (forbidden) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/audit?page=${page}&limit=${limit}`, {
          headers: getActorHeaders(),
        });
        if (res.status === 403) {
          setForbidden(true);
          return;
        }
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, forbidden]);

  if (forbidden) {
    return <div className="p-6 text-sm">Зөвхөн SUPER ADMIN харах эрхтэй.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-4 text-lg font-semibold">Аудит лог</div>
      {loading ? (
        <div>Ачааллаж байна...</div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Админ</th>
                <th className="px-3 py-2 text-left">Үйлдэл</th>
                <th className="px-3 py-2 text-left">Төрөл</th>
                <th className="px-3 py-2 text-left">Обьект ID</th>
                <th className="px-3 py-2 text-left">Огноо</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2">{it.id}</td>
                  <td className="px-3 py-2">
                    {it.actor_name || it.actor_phone || "Тодорхойгүй"}
                  </td>
                  <td className="px-3 py-2">{it.action}</td>
                  <td className="px-3 py-2">{it.entity_type}</td>
                  <td className="px-3 py-2">{it.entity_id ?? "-"}</td>
                  <td className="px-3 py-2">
                    {new Date(it.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center" colSpan={6}>
                    Лог алга байна.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        <button
          className="rounded border px-3 py-1 disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Өмнөх
        </button>
        <span className="text-sm">
          {page} / {Math.max(1, Math.ceil(total / limit))}
        </span>
        <button
          className="rounded border px-3 py-1 disabled:opacity-50"
          disabled={page >= Math.ceil(total / limit)}
          onClick={() => setPage((p) => p + 1)}
        >
          Дараах
        </button>
      </div>
    </div>
  );
}
