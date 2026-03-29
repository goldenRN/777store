import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BannerSlider from "@/components/BannerSlider";
import ProductCard from "@/components/ProductCard";
import OrderProductsSlider from "@/components/OrderProductsSlider";

type PublicProduct = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  discount_price: number | null;
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

  return (
    <div className="min-h-screen bg-[var(--sky-50)]">
      <Header />

      <main className="container mx-auto px-6">
        <section className="grid gap-6 py-5 lg:grid-cols-[1.4fr_0.6fr]">
          <BannerSlider banners={banners} />
          <div className="grid gap-4">
            <div className="rounded-[28px] bg-[linear-gradient(160deg,#111111,#2a2a2a)] p-6 text-white shadow-xl">
              <span className="text-xs opacity-70">{promo?.badge || "Онцгой хямдрал"}</span>
              <h3 className="mt-2 text-xl font-semibold">{promo?.title || "LIVE бараа шинэчлэгдлээ"}</h3>
              <p className="mt-2 text-sm opacity-80">{promo?.subtitle || "24 цагийн дотор дуусах hot deal."}</p>
            </div>
            <OrderProductsSlider items={orderItems} />
          </div>
        </section>
        {discountProducts.length > 0 && (
          <section className="py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Онцгой хямдрал</h2>
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

        {[
          { title: "Бэлэн бараа", items: readyProducts, href: "/products?type=ready" },
          { title: "Захиалгын бараа", items: preorderProducts, href: "/products?type=preorder" },
          { title: "Live бараа", items: liveProducts, href: "/live" },
        ]
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <section key={section.title} className="py-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                  <span className="rounded-full bg-[var(--sky-100)] px-3 py-1 text-xs font-semibold text-[var(--navy-800)]">
                    Нийт: {section.items.length}
                  </span>
                </div>
                <a href={section.href} className="text-xs font-semibold text-[var(--accent-2)]">
                  Бүгдийг харах
                </a>
              </div>
              <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
                {section.items.map((item) => (
                  <ProductCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    description={item.description}
                    price={item.price}
                    discount_price={item.discount_price}
                    image_url={item.image_url}
                    type_name={item.type_name}
                    type_has_duration={item.type_has_duration}
                    duration_hours={item.duration_hours}
                    created_at={item.created_at}
                  />
                ))}
              </div>
            </section>
          ))}



        <section className="py-6">
          <h2 className="mb-4 text-2xl font-bold"> Ангилалууд</h2>
          <div className="grid gap-3 lg:grid-cols-8 sm:grid-cols-4 grid-cols-2">
            {categories.map((cat) => (
              <div
                key={cat.category_id}
                className="flex flex-col items-center gap-2 rounded-full bg-white px-4 py-3 text-center text-xs font-semibold shadow"
              >
                {cat.category_image ? (
                  <span className="relative h-6 w-6 overflow-hidden rounded-full bg-[var(--sky-100)]">
                    <img src={cat.category_image} alt={cat.category_name} className="h-full w-full object-cover" />
                  </span>
                ) : null}
                <span>{cat.category_name}</span>
              </div>
            ))}
          </div>
        </section>

        {allProducts.length > 0 && (
          <section className="py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Бүх бараа</h2>
                <span className="rounded-full bg-[var(--sky-100)] px-3 py-1 text-xs font-semibold text-[var(--navy-800)]">
                  Нийт: {allProducts.length}
                </span>
              </div>
              <a href="/products" className="text-xs font-semibold text-[var(--accent-2)]">
                Бүгдийг харах
              </a>
            </div>
            <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
              {allProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  description={item.description}
                  price={item.price}
                  discount_price={item.discount_price}
                  image_url={item.image_url}
                  type_has_duration={item.type_has_duration}
                  duration_hours={item.duration_hours}
                  created_at={item.created_at}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div >
  );
}
