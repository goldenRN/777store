"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";

type Brand = {
  id: number;
  name: string;
  image_url: string | null;
};

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  discount_price: number | null;
  stock?: number | null;
  ordered_qty?: number | null;
  image_url: string | null;
  type_name?: string | null;
  order_accept_status?: string | null;
  is_closed?: boolean;
  type_has_duration?: boolean;
  duration_hours?: number | null;
  created_at?: string | null;
};

const resolveImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;
  return `/uploads/${url}`;
};

export default function HomeBrandsProducts({ brands }: { brands: Brand[] }) {
  const firstId = brands[0]?.id ? String(brands[0].id) : "all";
  const [activeBrand, setActiveBrand] = useState<string>(firstId);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "8", page: "1" });
        if (activeBrand !== "all") {
          params.set("brand", activeBrand);
        } else {
          // Only show products that have a brand assigned.
          params.set("brandOnly", "true");
        }
        const res = await fetch(`/api/public/products?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setItems(Array.isArray(json.items) ? (json.items as Product[]) : []);
        setTotal(Number(json.total ?? 0));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeBrand]);

  const showItems = useMemo(() => items.slice(0, 8), [items]);

  return (
    <section className="py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Брэндүүд</h2>
          <span className="rounded-full bg-[var(--sky-100)] px-3 py-1 text-xs font-semibold text-[var(--navy-800)]">
            Нийт: {total}
          </span>
        </div>
        <a
          href={activeBrand === "all" ? "/products" : `/products?brand=${activeBrand}`}
          className="text-xs font-semibold text-[var(--accent-2)]"
        >
          Бүгдийг харах
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-8 sm:grid-cols-4 grid-cols-2">
        <button
          type="button"
          onClick={() => setActiveBrand("all")}
          className={`flex flex-col items-center text-center text-xs font-semibold ${
            activeBrand === "all" ? "opacity-100" : "opacity-80 hover:opacity-100"
          }`}
        >
          <span
            className={`grid h-20 w-20 place-items-center rounded-full border-2 border-white bg-[var(--sky-100)] shadow ${
              activeBrand === "all" ? "ring-2 ring-[var(--accent-2)]" : ""
            }`}
          >
            <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain opacity-80" />
          </span>
          <span className="mt-2">Бүгд</span>
        </button>

        {brands.map((b) => {
          const active = String(b.id) === activeBrand;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setActiveBrand(String(b.id))}
              className={`flex flex-col items-center text-center text-xs font-semibold ${
                active ? "opacity-100" : "opacity-80 hover:opacity-100"
              }`}
              title={b.name}
            >
              <span
                className={`relative h-20 w-20 overflow-hidden rounded-full border-2 border-white bg-[var(--sky-100)] shadow ${
                  active ? "ring-2 ring-[var(--accent-2)]" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.image_url ? resolveImageUrl(b.image_url) : "/logo.png"}
                  alt={b.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/logo.png";
                    e.currentTarget.onerror = null;
                  }}
                />
              </span>
              <span className="mt-2 line-clamp-2">{b.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {loading && showItems.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-[var(--gray-500)] shadow">
            Ачаалж байна...
          </div>
        ) : showItems.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-[var(--gray-500)] shadow">
            Одоогоор бараа олдсонгүй.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
            {showItems.map((item) => (
              <ProductCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                discount_price={item.discount_price}
                bulk_prices={(item as any).bulk_prices ?? null}
                stock={item.stock}
                ordered_qty={item.ordered_qty}
                image_url={item.image_url}
                type_name={item.type_name}
                order_accept_status={item.order_accept_status}
                is_closed={item.is_closed}
                type_has_duration={item.type_has_duration}
                duration_hours={item.duration_hours}
                created_at={item.created_at}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
