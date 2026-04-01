import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BannerSlider from "@/components/BannerSlider";
import ProductCard from "@/components/ProductCard";
import OrderProductsSlider from "@/components/OrderProductsSlider";
import HomeAllProducts from "@/components/HomeAllProducts";

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

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

const fetchBanners = async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/banner`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()) as Banner[];
};

const fetchCategories = async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/category`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()) as Category[];
};

const fetchPromo = async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/promo`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Promo;
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
  const [categories, promo, readyRes, preorderRes, liveRes, discountRes, allRes] = await Promise.all([
    fetchCategories(),
    fetchPromo(),
    fetchProducts({ type: "ready", limit: 8 }),
    fetchProducts({ type: "preorder", limit: 200 }),
    fetchProducts({ type: "live", limit: 200 }),
    fetchProducts({ discount: true, limit: 8 }),
    fetchProducts({ limit: 8 }),
  ]);

  const readyProducts = readyRes.items;
  const preorderProducts = preorderRes.items.slice(0, 8);
  const liveProducts = liveRes.items.slice(0, 8);
  const discountProducts = discountRes.items;
  const allProducts = allRes.items;
  const orderItems = Array.from(
    new Map([...preorderRes.items, ...liveRes.items].map((p) => [p.id, p])).values()
  );
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
                  🔥 {discountProducts.length}
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
          </section>
        )}

        {readyProducts.length > 0 && (
          <section className="py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Бэлэн бараа</h2>
                <span className="rounded-full bg-[var(--sky-100)] px-3 py-1 text-xs font-semibold text-[var(--navy-800)]">
                  Нийт: {readyProducts.length}
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
                    Нийт: {preorderProducts.length}
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
            </section>
          </>
        )}

        {liveProducts.length > 0 && (
          <section className="py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Live бараа</h2>
                <span className="rounded-full bg-[var(--sky-100)] px-3 py-1 text-xs font-semibold text-[var(--navy-800)]">
                  Нийт: {liveProducts.length}
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
          </section>
        )}



        <HomeAllProducts products={allProducts} categories={categories} />
      </main>

      <Footer />
    </div >
  );
}
