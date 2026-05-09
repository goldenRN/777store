import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AllProductsSection from "@/components/AllProductsSection";
import ProductsCategoryPicker from "@/components/ProductsCategoryPicker";
import { headers } from "next/headers";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type PublicProduct = {
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
  category_id?: number | null;
  subcategory_id?: number | null;
  brand_id?: number | null;
  brand_name?: string | null;
};

type Category = {
  category_id: number;
  category_name: string;
  subcategories?: { id: number; name: string }[];
};

type Brand = { id: number; name: string; image_url: string | null };

const getBaseUrl = async () => {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
  const h = (await headers()) as unknown as Headers;
  const host = h?.get?.("x-forwarded-host") ?? h?.get?.("host");
  const proto = h?.get?.("x-forwarded-proto") ?? (process.env.NODE_ENV === "development" ? "http" : "https");
  if (host) return `${proto}://${host}`.replace(/\/+$/, "");
  return "http://localhost:3000";
};

const fetchProducts = async (params: Record<string, string | number | boolean | undefined>) => {
  const base = await getBaseUrl();
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  const res = await fetch(`${base}/api/public/products${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) return { items: [] as PublicProduct[], total: 0 };
  const json = await res.json();
  return { items: (json.items || []) as PublicProduct[], total: Number(json.total ?? 0) };
};

const fetchCategories = async () => {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/category`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()) as Category[];
};

const fetchBrands = async () => {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/brand?withProducts=true`, { cache: "no-store" });
  if (!res.ok) return [] as Brand[];
  const data = (await res.json()) as unknown[];
  if (!Array.isArray(data)) return [] as Brand[];
  return data
    .map((item) => {
      const b = item as Record<string, unknown>;
      return {
        id: Number(b.id),
        name: String(b.name ?? ""),
        image_url: b.image_url ? String(b.image_url) : null,
      };
    })
    .filter((b) => Number.isFinite(b.id) && b.name.trim().length > 0);
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    discount?: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const type = params.type ?? "";
  const discount = params.discount ?? "";
  const category = params.category ?? "";
  const subcategory = params.subcategory ?? "";
  const brand = params.brand ?? "";
  const page = Math.max(Number(params.page ?? 1), 1);
  const limit = 15;

  const [productsRes, categories, brands] = await Promise.all([
    fetchProducts({
      q: q || undefined,
      type: type || undefined,
      discount: discount === "true" ? true : undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
      brand: brand || undefined,
      limit,
      page,
    }),
    fetchCategories(),
    fetchBrands(),
  ]);
  const items = productsRes.items;
  const total = productsRes.total;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const title =
    type === "ready"
      ? "Бэлэн бараа"
      : type === "preorder"
        ? "Захиалгын бараа"
        : type === "live"
          ? "Live бараа"
          : discount === "true"
            ? "Хямдралтай бараа"
            : "Бүх бараа";

  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <main className="container mx-auto px-6 py-10 flex-1">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {q && <div className="mt-1 text-xs text-[var(--gray-500)]">Хайлт: “{q}”</div>}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-xs text-[var(--gray-500)]">
              Нийт {total}‑аас {total === 0 ? 0 : (page - 1) * limit + 1}‑{Math.min(page * limit, total)} харуулж байна
            </div>
            <ProductsCategoryPicker
              categories={categories}
              q={q}
              type={type}
              discount={discount}
              category={category}
              subcategory={subcategory}
              brand={brand}
            />
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-[var(--gray-500)] shadow">
            Одоогоор бараа олдсонгүй.
          </div>
        ) : (
          <AllProductsSection
            products={items}
            categories={categories}
            brands={brands}
            initialCategoryId={category || "all"}
            initialSubcategoryId={subcategory || "all"}
            initialBrandId={brand || "all"}
          />
        )}
        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious href={`/products?${new URLSearchParams({
                      q,
                      type,
                      discount,
                      category,
                      subcategory,
                      brand,
                      page: String(page - 1),
                    }).toString()}`} />
                  </PaginationItem>
                )}
                {Array.from({ length: totalPages }).slice(0, 5).map((_, idx) => {
                  const p = idx + 1;
                  return (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href={`/products?${new URLSearchParams({
                          q,
                          type,
                          discount,
                          category,
                          subcategory,
                          brand,
                          page: String(p),
                        }).toString()}`}
                        isActive={p === page}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {page < totalPages && (
                  <PaginationItem>
                    <PaginationNext href={`/products?${new URLSearchParams({
                      q,
                      type,
                      discount,
                      category,
                      subcategory,
                      brand,
                      page: String(page + 1),
                    }).toString()}`} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {brands.length > 0 && (
          <section className="mt-10 rounded-[28px] border border-[var(--gray-200)] bg-white px-5 py-6 shadow-sm sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--navy-900)]">Брэндүүд</h2>
                <p className="mt-1 text-xs text-[var(--gray-500)]">
                  Брэндээр нь шүүж бараануудаа хурдан хараарай.
                </p>
              </div>
              <a
                href="/products"
                className="shrink-0 text-xs font-semibold text-[var(--accent-2)] hover:underline"
              >
                Бүгдийг харах
              </a>
            </div>

            <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
              {brands.map((b) => (
                <a
                  key={b.id}
                  href={`/products?${new URLSearchParams({
                    ...(category ? { category } : {}),
                    ...(subcategory ? { subcategory } : {}),
                    brand: String(b.id),
                    page: "1",
                  }).toString()}`}
                  className={`flex min-w-[200px] items-center gap-3 rounded-2xl border px-4 py-3 transition hover:bg-[var(--sky-100)] ${
                    String(b.id) === brand
                      ? "border-[var(--accent-2)] bg-[var(--sky-100)]"
                      : "border-[var(--gray-200)] bg-white"
                  }`}
                  title={b.name}
                >
                  <div className="h-12 w-12 overflow-hidden rounded-xl border bg-[var(--sky-50)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.image_url || "/logo.png"}
                        alt={b.name}
                        className="h-full w-full object-cover"
                      />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--navy-900)]">
                      {b.name}
                    </div>
                    <div className="text-[11px] text-[var(--gray-500)]">Брэнд</div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

      </main>
      <Footer />
    </div>
  );
}
