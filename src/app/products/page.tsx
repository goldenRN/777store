import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import AllProductsSection from "@/components/AllProductsSection";

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

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

const fetchProducts = async (params: Record<string, string | number | boolean | undefined>) => {
  const base = getBaseUrl();
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
  if (!res.ok) return [];
  const json = await res.json();
  return (json.items || []) as PublicProduct[];
};

const fetchCategories = async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/category`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()) as Category[];
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; discount?: string; category?: string; subcategory?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const type = params.type ?? "";
  const discount = params.discount ?? "";
  const category = params.category ?? "";
  const subcategory = params.subcategory ?? "";

  const [items, categories] = await Promise.all([
    fetchProducts({
      q: q || undefined,
      type: type || undefined,
      discount: discount === "true" ? true : undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
      limit: 40,
    }),
    fetchCategories(),
  ]);

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
          <div className="text-xs text-[var(--gray-500)]">Нийт: {items.length}</div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-[var(--gray-500)] shadow">
            Одоогоор бараа олдсонгүй.
          </div>
        ) : (
          <AllProductsSection
            products={items}
            categories={categories}
            initialCategoryId={category || "all"}
            initialSubcategoryId={subcategory || "all"}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
