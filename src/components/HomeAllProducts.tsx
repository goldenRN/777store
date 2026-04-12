"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";

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
  type_has_duration?: boolean;
  duration_hours?: number | null;
  created_at?: string | null;
  category_id?: number | null;
};

type Category = {
  category_id: number;
  category_name: string;
  category_image: string | null;
};

export default function HomeAllProducts({
  products,
  categories,
  initialTotal,
}: {
  products: Product[];
  categories: Category[];
  initialTotal: number;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [items, setItems] = useState<Product[]>(products);
  const [total, setTotal] = useState<number>(Number(initialTotal ?? products.length));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({ limit: "8" });
      if (activeCategory !== "all") {
        params.set("category", activeCategory);
      } else {
        // Use the same server-side random selection as the mobile app.
        params.set("random", "true");
      }
      const res = await fetch(`/api/public/products?${params.toString()}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (cancelled) return;
      const list = (json.items || []) as Product[];
      setItems(list);
      // The API's `total` is not meaningful for random queries; keep the real total from SSR for "all".
      if (activeCategory !== "all") setTotal(Number(json.total ?? 0));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const showItems = useMemo(() => items.slice(0, 8), [items]);

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return url;
    return `/uploads/${url}`;
  };

  return (
    <>
      <section className="py-6">
        <h2 className="mb-4 text-xl font-bold"> Ангилалууд</h2>
        <div className="grid gap-4 lg:grid-cols-8 sm:grid-cols-4 grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`flex flex-col items-center text-center text-xs font-semibold ${
              activeCategory === "all" ? "opacity-100" : "opacity-80 hover:opacity-100"
            }`}
          >
            <span
              className={`grid h-20 w-20 place-items-center rounded-full border-2 border-white bg-[var(--sky-100)] shadow ${
                activeCategory === "all" ? "ring-2 ring-[var(--accent-2)]" : ""
              }`}
            >
              <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain opacity-80" />
            </span>
            <span className="mt-2">Бүгд</span>
          </button>
          {categories.map((cat) => {
            const active = String(cat.category_id) === activeCategory;
            return (
              <button
                key={cat.category_id}
                type="button"
                onClick={() => setActiveCategory(String(cat.category_id))}
                className={`flex flex-col items-center text-center text-xs font-semibold ${
                  active ? "opacity-100" : "opacity-80 hover:opacity-100"
                }`}
              >
                {cat.category_image ? (
                  <span
                    className={`relative h-20 w-20 overflow-hidden rounded-full border-2 border-white bg-[var(--sky-100)] shadow ${
                      active ? "ring-2 ring-[var(--accent-2)]" : ""
                    }`}
                  >
                    <img
                      src={resolveImageUrl(cat.category_image)}
                      alt={cat.category_name}
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : (
                  <span
                    className={`grid h-20 w-20 place-items-center rounded-full border-2 border-white bg-[var(--sky-100)] shadow ${
                      active ? "ring-2 ring-[var(--accent-2)]" : ""
                    }`}
                  >
                    <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain opacity-80" />
                  </span>
                )}
                <span className="mt-2">{cat.category_name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Бүх бараа</h2>
            <span className="rounded-full bg-[var(--sky-100)] px-3 py-1 text-xs font-semibold text-[var(--navy-800)]">
              Нийт: {total}
            </span>
          </div>
          <a
            href={activeCategory === "all" ? "/products" : `/products?category=${activeCategory}`}
            className="text-xs font-semibold text-[var(--accent-2)]"
          >
            Бүгдийг харах
          </a>
        </div>
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
                stock={item.stock}
                ordered_qty={item.ordered_qty}
                image_url={item.image_url}
                type_name={item.type_name}
                type_has_duration={item.type_has_duration}
                duration_hours={item.duration_hours}
                created_at={item.created_at}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
