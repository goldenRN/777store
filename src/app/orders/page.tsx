"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

type OrderItem = {
  id: string;
  qty: number;
  unitPrice: number;
  productId: string;
  productName: string;
  productImage: string | null;
  status?: string | null;
};

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

const getStatusLabel = (status: string, statuses: { name: string }[]) => {
  const hit = statuses.find((s) => s.name === status);
  return hit?.name ?? status;
};

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("status") || "ALL";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusOptions, setStatusOptions] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/status`)
      .then((r) => r.json())
      .then((data) => setStatusOptions(Array.isArray(data) ? data : []))
      .catch(() => setStatusOptions([]));
  }, []);

  const userId = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { id?: string };
      return parsed?.id ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      router.push("/login");
      return;
    }
    const url = new URL(`/api/public/orders`, window.location.origin);
    url.searchParams.set("userId", userId);
    if (active) url.searchParams.set("status", active);
    fetch(url.toString())
      .then((r) => r.json())
      .then((json) => setOrders(json.items || []))
      .finally(() => setLoading(false));
  }, [userId, active, router]);

  const loadDetail = async (id: string) => {
    if (!userId) return;
    setDetailLoading(true);
    try {
      const url = new URL(`/api/public/orders/${id}`, window.location.origin);
      url.searchParams.set("userId", userId);
      const res = await fetch(url.toString());
      const json = await res.json();
      setSelected(json);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <main className="container mx-auto px-6 py-10 flex-1">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="text-lg font-bold">Захиалгууд</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[{ key: "ALL", label: "Бүгд" }, ...statusOptions.map((s) => ({ key: s.name, label: s.name }))].map(
              (tab) => (
              <button
                key={tab.key}
                onClick={() => router.push(`/orders?status=${tab.key}`)}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  active === tab.key
                    ? "bg-[var(--accent-2)] text-white"
                    : "bg-[var(--sky-100)] text-[var(--gray-700)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-[var(--gray-500)]">Уншиж байна...</div>
          ) : orders.length === 0 ? (
            <div className="mt-6 text-sm text-[var(--gray-500)]">Одоогоор захиалга байхгүй.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {orders.map((o) => (
                <div key={o.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold">Захиалга #{o.id}</div>
                    <div className="text-xs text-[var(--gray-500)]">
                      {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </div>
                    <div className="mt-2 text-xs">
                      Төлөв:{" "}
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                      {getStatusLabel(o.status, statusOptions)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {o.items.map((it) => (
                      <div key={it.id} className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-[var(--sky-100)]">
                          {it.productImage ? (
                            <Image src={it.productImage} alt={it.productName} fill className="object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{it.productName}</div>
                          <div className="text-xs text-[var(--gray-500)]">
                            {it.qty}ш × {Number(it.unitPrice).toLocaleString()}₮
                          </div>
                        </div>
                        <div className="text-sm font-semibold">
                          {(it.qty * it.unitPrice).toLocaleString()}₮
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm font-semibold">
                    <div>Нийт дүн</div>
                    <div>{Number(o.total).toLocaleString()}₮</div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => loadDetail(o.id)}
                      className="rounded-full border px-4 py-2 text-xs font-semibold"
                    >
                      Дэлгэрэнгүй
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">Захиалга #{selected.id}</div>
              <button onClick={() => setSelected(null)} className="text-xl">&times;</button>
            </div>
            {detailLoading ? (
              <div className="mt-4 text-sm text-[var(--gray-500)]">Уншиж байна...</div>
            ) : (
              <>
                <div className="mt-2 text-xs text-[var(--gray-500)]">
                  {new Date(selected.createdAt).toLocaleString()}
                </div>
                <div className="mt-4 space-y-3">
                  {selected.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-[var(--sky-100)]">
                        {it.productImage ? (
                          <Image src={it.productImage} alt={it.productName} fill className="object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{it.productName}</div>
                        <div className="text-xs text-[var(--gray-500)]">
                          {it.qty}ш × {Number(it.unitPrice).toLocaleString()}₮
                        </div>
                        {it.status && (
                          <div className="mt-1 text-[10px] text-[var(--gray-500)]">
                            Төлөв: {getStatusLabel(it.status, statusOptions)}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-semibold">
                        {(it.qty * it.unitPrice).toLocaleString()}₮
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm font-semibold">
                  <div>Нийт дүн</div>
                  <div>{Number(selected.total).toLocaleString()}₮</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
