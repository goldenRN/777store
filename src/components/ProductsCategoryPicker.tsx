"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";

type Category = {
  category_id: number;
  category_name: string;
  subcategories?: { id: number; name: string }[];
};

function buildHref({
  q,
  type,
  discount,
  category,
  subcategory,
  brand,
}: {
  q?: string;
  type?: string;
  discount?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (discount) params.set("discount", discount);
  if (category) params.set("category", category);
  if (subcategory) params.set("subcategory", subcategory);
  if (brand) params.set("brand", brand);
  params.set("page", "1");
  const qs = params.toString();
  return `/products${qs ? `?${qs}` : ""}`;
}

export default function ProductsCategoryPicker({
  categories,
  q = "",
  type = "",
  discount = "",
  category = "",
  subcategory = "",
  brand = "",
}: {
  categories: Category[];
  q?: string;
  type?: string;
  discount?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(category || "all");

  const activeCategory = useMemo(() => {
    if (!activeCategoryId || activeCategoryId === "all") return null;
    return categories.find((c) => String(c.category_id) === activeCategoryId) || null;
  }, [categories, activeCategoryId]);

  const openPicker = () => {
    setActiveCategoryId(category || "all");
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  const apply = (nextCategory: string, nextSubcategory: string) => {
    const href = buildHref({
      q: q || undefined,
      type: type || undefined,
      discount: discount || undefined,
      category: nextCategory !== "all" ? nextCategory : undefined,
      subcategory: nextSubcategory !== "all" ? nextSubcategory : undefined,
      brand: brand || undefined,
    });
    closePicker();
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--gray-200)] bg-white px-3 py-2 text-xs font-semibold text-[var(--navy-900)] shadow-sm hover:bg-[var(--sky-100)]"
        aria-label="Ангилал сонгох"
        title="Ангилал сонгох"
      >
        <Layers size={16} />
        <span className="hidden sm:inline">Ангилал</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={closePicker} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:inset-auto sm:right-6 sm:top-28 sm:max-h-[70vh] sm:w-[780px] sm:rounded-3xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="text-sm font-extrabold text-[var(--navy-900)]">Ангилал сонгох</div>
              <button
                type="button"
                onClick={closePicker}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--gray-600)] hover:bg-[var(--sky-100)]"
              >
                Хаах
              </button>
            </div>

            <div className="grid gap-0 sm:grid-cols-[280px_1fr]">
              <div className="max-h-[55vh] overflow-auto border-b p-4 sm:max-h-[70vh] sm:border-b-0 sm:border-r">
                <button
                  type="button"
                  onClick={() => apply("all", "all")}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                    (category || "all") === "all"
                      ? "bg-[var(--accent-2)]/15 text-[var(--accent-2)]"
                      : "hover:bg-[var(--sky-100)]"
                  }`}
                >
                  <span>Бүх ангилал</span>
                  <span className="text-xs opacity-60">›</span>
                </button>

                <div className="mt-2 space-y-2">
                  {categories.map((cat) => {
                    const id = String(cat.category_id);
                    const selected = id === activeCategoryId;
                    return (
                      <button
                        key={cat.category_id}
                        type="button"
                        onClick={() => setActiveCategoryId(id)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                          selected
                            ? "bg-[var(--sky-100)] text-[var(--navy-900)]"
                            : "hover:bg-[var(--sky-100)]"
                        }`}
                      >
                        <span>{cat.category_name}</span>
                        <span className="text-xs opacity-60">›</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="max-h-[55vh] overflow-auto p-4 sm:max-h-[70vh]">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-[var(--navy-900)]">
                    {activeCategory?.category_name || "Ангилал"}
                  </div>
                  {activeCategory ? (
                    <button
                      type="button"
                      onClick={() => apply(String(activeCategory.category_id), "all")}
                      className="rounded-full bg-[var(--navy-900)] px-4 py-2 text-xs font-semibold text-white"
                    >
                      Бүгдийг харах
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {!activeCategory ? (
                    <div className="text-sm text-[var(--gray-500)]">
                      Зүүн талаас ангилал сонгоорой.
                    </div>
                  ) : activeCategory.subcategories?.length ? (
                    activeCategory.subcategories.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => apply(String(activeCategory.category_id), String(s.id))}
                        className={`rounded-xl border px-3 py-2 text-left text-sm hover:bg-[var(--sky-100)] ${
                          String(activeCategory.category_id) === String(category) &&
                          String(s.id) === String(subcategory)
                            ? "border-[var(--accent-2)] text-[var(--accent-2)]"
                            : "border-[var(--gray-200)] text-[var(--gray-700)]"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-[var(--gray-400)]">Дэд ангилал байхгүй</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
