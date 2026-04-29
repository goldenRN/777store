"use client";

import { useEffect, useState } from "react";
import { getActorHeaders } from "@/lib/actorHeaders";
import {
  getAuditActionLabel,
  getAuditActionTone,
  getAuditEntityLabel,
  summarizeAuditDetails,
} from "@/lib/auditLabels";

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
    const role = raw ? String(JSON.parse(raw)?.role ?? "") : "";
    const norm = role.toUpperCase().replace(/\s+/g, "_");
    if (norm !== "SUPER_ADMIN") {
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
      <div className="mb-5">
        <div className="text-2xl font-semibold">Аудит лог</div>
        <div className="mt-1 text-sm text-gray-500">
          Админ хэрэглэгчид ямар үйлдэл, ямар объект дээр хийснийг Монгол тайлбартай харуулна.
        </div>
      </div>
      {loading ? (
        <div>Ачааллаж байна...</div>
      ) : (
        <div className="overflow-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Админ</th>
                <th className="px-3 py-2 text-left">Үйлдэл</th>
                <th className="px-3 py-2 text-left">Төрөл</th>
                <th className="px-3 py-2 text-left">Дэлгэрэнгүй</th>
                <th className="px-3 py-2 text-left">Объект ID</th>
                <th className="px-3 py-2 text-left">Огноо</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t align-top hover:bg-gray-50/80">
                  <td className="px-3 py-3 font-medium text-gray-700">{it.id}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">
                      {it.actor_name || it.actor_phone || "Тодорхойгүй"}
                    </div>
                    {it.actor_phone ? (
                      <div className="text-xs text-gray-500">{it.actor_phone}</div>
                    ) : null}
                    {it.actor_role ? (
                      <div className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                        {it.actor_role}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getAuditActionTone(
                        it.action
                      )}`}
                    >
                      {getAuditActionLabel(it.action)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{getAuditEntityLabel(it.entity_type)}</td>
                  <td className="max-w-[380px] px-3 py-3 text-sm text-gray-600">
                    <div className="line-clamp-3">{summarizeAuditDetails(it.details)}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{it.entity_id ?? "-"}</td>
                  <td className="px-3 py-2">
                    {new Date(it.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center" colSpan={7}>
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
