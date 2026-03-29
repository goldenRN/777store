import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";

type PublicProduct = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  discount_price: number | null;
  image_url: string | null;
  type_name?: string | null;
  type_has_duration?: boolean;
  duration_hours?: number | null;
  created_at?: string | null;
};

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

const fetchProducts = async () => {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/public/products?type=live&limit=40`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.items || []) as PublicProduct[];
};

export default async function LivePage() {
  const items = await fetchProducts();

  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <main className="container mx-auto px-6 py-10 flex-1">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Live бараа</h1>
          <div className="mt-1 text-xs text-[var(--gray-500)]">
            Шууд худалдааны бараанууд
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-[var(--gray-500)] shadow">
            Одоогоор live бараа байхгүй.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
            {items.map((item) => (
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
        )}
      </main>
      <Footer />
    </div>
  );
}
