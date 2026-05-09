import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BannerSlider from "@/components/BannerSlider";
import ProductCard from "@/components/ProductCard";
import OrderProductsSlider from "@/components/OrderProductsSlider";
import HomeAllProducts from "@/components/HomeAllProducts";
import { headers } from "next/headers";
import HomeBrandsProducts from "@/components/HomeBrandsProducts";

type PublicProduct = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  discount_price: number | null;
  stock?: number | null;
  ordered_qty?: number | null;
  image_url: string | null;
  type_has_duration?: boolean;
  duration_hours?: number | null;
  type_name?: string | null;
  order_accept_status?: string | null;
  is_closed?: boolean;
  category_id?: number | null;
  created_at?: string | null;
};

type Banner = {
  id: number;
  description: string | null;
  image_url: string | null;
};

type Promo = {
  badge: string | null;
  title: string | null;
  subtitle: string | null;
};

type Category = {
  category_id: number;
  category_name: string;
  category_image: string | null;
};

type Brand = { id: number; name: string; image_url: string | null };

const getBaseUrl = async () => {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) {
    const normalized = raw.replace(/^https?:https?:\/\//, "https://");
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const h = (await headers()) as unknown as Headers;
  const host = h?.get?.("x-forwarded-host") ?? h?.get?.("host");
  const proto = h?.get?.("x-forwarded-proto") ?? (process.env.NODE_ENV === "development" ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
};

const fetchBanners = async () => {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/banner`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()) as Banner[];
};

const fetchCategories = async () => {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/category`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()) as Category[];
};

const fetchPromo = async () => {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/promo`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Promo;
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

export default async function Home() {
  const banners = await fetchBanners();
  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return url;
    return `/uploads/${url}`;
  };
  const [categories, promo, brands, readyRes, preorderRes, liveRes, discountRes, allRes] = await Promise.all([
    fetchCategories(),
    fetchPromo(),
    fetchBrands(),
    fetchProducts({ type: "ready", limit: 8 }),
    fetchProducts({ type: "preorder", limit: 200 }),
    fetchProducts({ type: "live", limit: 200 }),
    fetchProducts({ discount: true, limit: 8 }),
    fetchProducts({ limit: 8 }),
  ]);

  const readyProducts = readyRes.items;
  const readyTotal = readyRes.total;
  const preorderProducts = preorderRes.items.slice(0, 8);
  const preorderTotal = preorderRes.total;
  const liveProducts = liveRes.items.slice(0, 8);
  const liveTotal = liveRes.total;
  const discountProducts = discountRes.items;
  const discountTotal = discountRes.total;
  const allProducts = allRes.items.length > 0 ? allRes.items : readyRes.items;
  const allTotal = allRes.total || readyRes.total;
  const orderItems = Array.from(
    new Map([...preorderRes.items, ...liveRes.items].map((p) => [p.id, p])).values()
  )
    .sort((a, b) => (b.ordered_qty ?? 0) - (a.ordered_qty ?? 0))
    .slice(0, 10);
  const smallBanners = banners.slice(0, 2);

  return (
    <div className="min-h-screen bg-[var(--sky-50)]">
      <Header />
      <section >
        <BannerSlider banners={banners} />
      </section>
      <main className="container mx-auto px-6">


        {discountProducts.length > 0 && (
          <section className="py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Онцгой хямдрал</h2>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                  🔥 {discountTotal}
                </span>
              </div>
              <a href="/products?discount=true" className="text-xs font-semibold text-[var(--accent-2)]">
                Бүгдийг харах
              </a>
            </div>
            <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
              {discountProducts.map((item) => (
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
          </section>
        )}

        {brands.length > 0 ? <HomeBrandsProducts brands={brands} /> : null}

        {readyProducts.length > 0 && (
          <section className="py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Бэлэн бараа</h2>
                <span className="rounded-full bg-[var(--sky-100)] px-3 py-1 text-xs font-semibold text-[var(--navy-800)]">
                  Нийт: {readyTotal}
                </span>
              </div>
              <a href="/products?type=ready" className="text-xs font-semibold text-[var(--accent-2)]">
                Бүгдийг харах
              </a>
            </div>
            <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
              {readyProducts.map((item) => (
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
          </section>
        )}

        {preorderProducts.length > 0 && (
          <>
            <section className="grid gap-4 py-2 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="rounded-[28px] bg-[linear-gradient(160deg,#111111,#2a2a2a)] p-6 text-white shadow-xl">
                <span className="text-xs opacity-70">{promo?.badge || "Онцгой хямдрал"}</span>
                <h3 className="mt-2 text-xl font-semibold">{promo?.title || "LIVE бараа шинэчлэгдлээ"}</h3>
                <p className="mt-2 text-sm opacity-80">{promo?.subtitle || "24 цагийн дотор дуусах hot deal."}</p>
              </div>
              <OrderProductsSlider items={orderItems} />
            </section>
            <section className="py-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Захиалгын бараа</h2>
                <span className="rounded-full bg-[var(--sky-100)] px-3 py-1 text-xs font-semibold text-[var(--navy-800)]">
                  Нийт: {preorderTotal}
                </span>
              </div>
                <a
                  href="/products?type=preorder"
                  className="text-xs font-semibold text-[var(--accent-2)]"
                >
                  Бүгдийг харах
                </a>
              </div>
              <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
                {preorderProducts.map((item) => (
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
            </section>
          </>
        )}

        {liveProducts.length > 0 && (
          <section className="py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Live бараа</h2>
                <span className="rounded-full bg-[var(--sky-100)] px-3 py-1 text-xs font-semibold text-[var(--navy-800)]">
                  Нийт: {liveTotal}
                </span>
              </div>
              <a href="/live" className="text-xs font-semibold text-[var(--accent-2)]">
                Бүгдийг харах
              </a>
            </div>
            <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
              {liveProducts.map((item) => (
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
          </section>
        )}



        <HomeAllProducts products={allProducts} categories={categories} initialTotal={allTotal} />
      </main>

      <Footer />
    </div >
  );
}
