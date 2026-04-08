"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  subcategory_id?: number | null;
};

type Category = {
  category_id: number;
  category_name: string;
  subcategories?: { id: number; name: string }[];
};

export default function AllProductsSection({
  products,
  categories,
  initialCategoryId = "all",
  initialSubcategoryId = "all",
}: {
  products: Product[];
  categories: Category[];
  initialCategoryId?: string;
  initialSubcategoryId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categoryId, setCategoryId] = useState<string>(initialCategoryId);
  const [subcategoryId, setSubcategoryId] = useState<string>(initialSubcategoryId);
  const [sort, setSort] = useState<string>("newest");
  const [discountOnly, setDiscountOnly] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setCategoryId(initialCategoryId);
    setSubcategoryId(initialSubcategoryId);
  }, [initialCategoryId, initialSubcategoryId]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const updateQuery = (nextCategory: string, nextSubcategory: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCategory && nextCategory !== "all") {
      params.set("category", nextCategory);
    } else {
      params.delete("category");
    }
    if (nextSubcategory && nextSubcategory !== "all") {
      params.set("subcategory", nextSubcategory);
    } else {
      params.delete("subcategory");
    }
    params.set("page", "1");
    const qs = params.toString();
    router.push(`/products${qs ? `?${qs}` : ""}`);
  };

  const filtered = useMemo(() => {
    let data = [...products];
    if (categoryId !== "all") {
      data = data.filter((p) => String(p.category_id ?? "") === categoryId);
    }
    if (subcategoryId !== "all") {
      data = data.filter((p) => String(p.subcategory_id ?? "") === subcategoryId);
    }
    if (discountOnly) {
      data = data.filter((p) => (p.discount_price ?? 0) > 0);
    }
    if (sort === "price_asc") {
      data.sort((a, b) => (a.discount_price ?? a.price) - (b.discount_price ?? b.price));
    } else if (sort === "price_desc") {
      data.sort((a, b) => (b.discount_price ?? b.price) - (a.discount_price ?? a.price));
    }
    // shuffle only on client to avoid hydration mismatch
    if (isClient && categoryId === "all" && subcategoryId === "all" && sort === "newest") {
      const shuffled = [...data];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return data;
  }, [products, categoryId, subcategoryId, discountOnly, sort, isClient]);

  const activeCategory = categories.find((c) => String(c.category_id) === categoryId) || null;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl bg-white p-4 shadow">
        <div className="text-sm font-bold">Ангилал</div>
        <div className="mt-3 space-y-2">
          <button
            onClick={() => {
              setCategoryId("all");
              setSubcategoryId("all");
              updateQuery("all", "all");
            }}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
              categoryId === "all" ? "bg-[var(--sky-100)]" : "hover:bg-[var(--sky-100)]"
            }`}
          >
            Бүх ангилал
          </button>
          {categories.map((c) => (
            <button
              key={c.category_id}
              onClick={() => {
                setCategoryId(String(c.category_id));
                setSubcategoryId("all");
                updateQuery(String(c.category_id), "all");
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                String(c.category_id) === categoryId ? "bg-[var(--sky-100)]" : "hover:bg-[var(--sky-100)]"
              }`}
            >
              {c.category_name}
            </button>
          ))}
        </div>

        {activeCategory?.subcategories?.length ? (
          <div className="mt-4">
            <div className="text-xs font-semibold text-[var(--gray-500)]">Дэд ангилал</div>
            <div className="mt-2 space-y-2">
              <button
                onClick={() => setSubcategoryId("all")}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs ${
                  subcategoryId === "all" ? "bg-[var(--sky-100)]" : "hover:bg-[var(--sky-100)]"
                }`}
              >
                Бүгд
              </button>
              {activeCategory.subcategories.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSubcategoryId(String(s.id));
                    updateQuery(categoryId, String(s.id));
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs ${
                    String(s.id) === subcategoryId ? "bg-[var(--sky-100)]" : "hover:bg-[var(--sky-100)]"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </aside>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs text-[var(--gray-600)]">
            {categoryId === "all"
              ? "Бүх ангилал"
              : `${activeCategory?.category_name || ""}${
                  subcategoryId !== "all"
                    ? ` / ${
                        activeCategory?.subcategories?.find((s) => String(s.id) === subcategoryId)?.name || ""
                      }`
                    : ""
                }`}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-full border px-4 py-2 text-xs"
            >
              <option value="newest">Шинэ нь эхэнд</option>
              <option value="price_asc">Үнэ өсөхөөр</option>
              <option value="price_desc">Үнэ буурахаар</option>
            </select>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={discountOnly}
                onChange={(e) => setDiscountOnly(e.target.checked)}
              />
              Хямдралтай
            </label>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-[var(--gray-500)] shadow">
            Одоогоор бараа олдсонгүй.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3 sm:grid-cols-2">
            {filtered.map((item) => (
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
      </div>
    </div>
  );
}
