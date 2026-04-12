"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getActorHeaders } from "@/lib/actorHeaders";
import AdminTableSearchBar from "@/components/admin/AdminTableSearchBar";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
};

type OrderItem = {
  id: number;
  product_name: string;
  quantity: number;
  price: number;
  image_url: string | null;
  status?: string | null;
};

type UserDetail = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
  orders: {
    id: number;
    status: string;
    total: number;
    created_at: string;
    items: OrderItem[];
  }[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>("");
  const [sortField, setSortField] = useState<keyof UserRow>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchUsers = async (nextPage = page, query = qApplied) => {
    setLoading(true);
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/users`, window.location.origin);
      const trimmed = String(query || "").trim();
      if (trimmed) url.searchParams.set("q", trimmed);
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("limit", String(limit));
      const res = await fetch(url.toString());
      const json = await res.json();
      setUsers(json.data || []);
      setPage(json?.meta?.page ?? nextPage);
      setPages(json?.meta?.pages ?? 1);
      setTotal(json?.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw) as { role?: string };
        setCurrentRole(String(parsed?.role ?? "").toUpperCase());
      }
    } catch {
      setCurrentRole("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/users/${id}`);
      const json = await res.json();
      setSelected(json);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSort = (field: keyof UserRow) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortOrder === "asc"
      ? String(aVal ?? "").localeCompare(String(bVal ?? ""))
      : String(bVal ?? "").localeCompare(String(aVal ?? ""));
  });

  const updateRole = async (id: string, role: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/users/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getActorHeaders() },
      body: JSON.stringify({ role }),
    });
    fetchUsers(page);
  };

  const updateStatus = async (id: string, isActive: boolean) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/users/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    fetchUsers(page);
  };

  return (
    <div className="w-full mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Хэрэглэгчдийн бүртгэл</h1>
        <AdminTableSearchBar
          value={qInput}
          onValueChange={setQInput}
          placeholder="Нэр / Имэйл / Утас хайх..."
          debounceMs={3000}
          loading={loading}
          onSearch={() => {
            setQApplied(qInput);
            fetchUsers(1, qInput);
          }}
          onRefresh={() => fetchUsers(page, qApplied)}
          showSearchButton
          searchButtonLabel="Хайх"
        />
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: "name", label: "Нэр" },
                { key: "email", label: "Имэйл" },
                { key: "phone", label: "Утас" },
                { key: "role", label: "Роль" },
                { key: "isActive", label: "Статус" },
                { key: "orderCount", label: "Захиалга" },
                { key: "totalSpent", label: "Нийт" },
                { key: "createdAt", label: "Бүртгүүлсэн" },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key as keyof UserRow)}
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
              <tr><td colSpan={8} className="p-4 text-center">Уншиж байна...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center">Мэдээлэл байхгүй</td></tr>
            ) : (
              sortedUsers.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{u.name || "-"}</td>
                  <td className="p-3">{u.email || "-"}</td>
                  <td className="p-3">{u.phone || "-"}</td>
                  <td className="p-3">
                    {currentRole === "SUPER_ADMIN" ? (
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="CUSTOMER">CUSTOMER</option>
                      </select>
                    ) : (
                      <span className="text-xs font-semibold">{u.role}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {currentRole === "SUPER_ADMIN" ? (
                      <select
                        value={u.isActive ? "active" : "blocked"}
                        onChange={(e) => updateStatus(u.id, e.target.value === "active")}
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="active">Идэвхтэй</option>
                        <option value="blocked">Блок</option>
                      </select>
                    ) : (
                      <span className="text-xs font-semibold">
                        {u.isActive ? "Идэвхтэй" : "Блок"}
                      </span>
                    )}
                  </td>
                  <td className="p-3">{u.orderCount}</td>
                  <td className="p-3">{Number(u.totalSpent).toLocaleString()}₮</td>
                  <td className="p-3">{new Date(u.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    <button onClick={() => openDetail(u.id)} className="text-sm px-2 py-1 bg-blue-600 text-white rounded">
                      Дэлгэрэнгүй
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="text-gray-600">
          Нийт {total} хэрэглэгчээс {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} харуулж байна
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={page <= 1}
            onClick={() => fetchUsers(page - 1)}
          >
            Өмнөх
          </Button>
          {pages <= 7 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchUsers(p)}
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
                onClick={() => fetchUsers(1)}
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
                    onClick={() => fetchUsers(p)}
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
                onClick={() => fetchUsers(pages)}
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
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={page >= pages}
            onClick={() => fetchUsers(page + 1)}
          >
            Дараах
          </Button>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 z-10 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">Хэрэглэгчийн мэдээлэл</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500">Хаах</button>
            </div>

            {detailLoading ? (
              <p className="mt-4">Уншиж байна...</p>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Нэр</div>
                    <div className="font-medium">{selected.user.name || "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Утас</div>
                    <div className="font-medium">{selected.user.phone || "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Имэйл</div>
                    <div className="font-medium">{selected.user.email || "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Бүртгүүлсэн</div>
                    <div className="font-medium">{new Date(selected.user.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Захиалгын түүх</h4>
                  {selected.orders.length === 0 ? (
                    <div className="text-sm text-gray-500">Захиалга байхгүй.</div>
                  ) : (
                    <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                      {selected.orders.map((o) => (
                        <div key={o.id} className="rounded border p-3">
                          <div className="flex items-center justify-between text-sm">
                            <div>Захиалга #{o.id}</div>
                            <div className="text-gray-500">{new Date(o.created_at).toLocaleString()}</div>
                          </div>
                          <div className="mt-1 text-xs">Төлөв: {o.status}</div>
                          <div className="mt-2 space-y-2">
                            {o.items.map((it) => (
                              <div key={it.id} className="flex items-center justify-between text-xs">
                                <div>{it.product_name}</div>
                                <div>{it.quantity}ш × {Number(it.price).toLocaleString()}₮</div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-right">
                            Нийт: {Number(o.total).toLocaleString()}₮
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
