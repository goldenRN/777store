import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import ProductCard from "@/components/ProductCard";
import { headers } from "next/headers";

type ProductDetail = {
  id: number;
  name: string;
  description: string | null;
  video_url?: string | null;
  price: number;
  discount_price: number | null;
  stock: number;
  ordered_qty?: number | null;
  material: string | null;
  image_url: string | null;
  images: string[];
  variants: {
    id: number;
    sku: string | null;
    attribute: Record<string, unknown> | null;
    images: string[];
    price: number | null;
    stock: number | null;
  }[];
  category_id: number | null;
  subcategory_id?: number | null;
  category_name: string | null;
  subcategory_name: string | null;
  type_name: string | null;
  type_has_duration?: boolean;
  duration_hours?: number | null;
  created_at?: string | null;
};

type RelatedProduct = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  stock?: number | null;
  ordered_qty?: number | null;
  image_url: string | null;
  type_name?: string | null;
  type_has_duration?: boolean;
  duration_hours?: number | null;
  created_at?: string | null;
};

const getBaseUrl = async () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  return host ? `${protocol}://${host}` : "";
};

const resolveImageUrl = (base: string, url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${base}${url}`;
  return `${base}/uploads/${url}`;
};

const fetchProduct = async (id: string): Promise<ProductDetail | null> => {
  const productId = Number(id);
  if (!productId) return null;

  const product = await prisma.adminProduct.findUnique({
    where: { id: productId },
    include: {
      category: true,
      subcategory: true,
      type: true,
      images: {
        where: { product_variant_id: null },
        orderBy: { id: "asc" },
      },
      variants: {
        orderBy: { id: "desc" },
        include: { images: true },
      },
    },
  });

  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    video_url: product.video_url ?? null,
    price: product.price,
    discount_price: product.discount_price,
    stock: product.stock,
    ordered_qty: product.ordered_qty,
    material: product.material,
    image_url: product.images?.[0]?.image_url ?? null,
    images: product.images?.map((img) => img.image_url) ?? [],
    variants:
      product.variants?.map((v) => ({
        id: v.id,
        sku: v.sku ?? null,
        attribute: (v.attribute ?? null) as Record<string, unknown> | null,
        images: v.images?.map((img) => img.image_url) ?? [],
        price: v.price ?? null,
        stock: v.stock ?? null,
      })) ?? [],
    category_id: product.category_id ?? null,
    subcategory_id: (product as any).subcategory_id ?? null,
    category_name: product.category?.category_name ?? null,
    subcategory_name: product.subcategory?.name ?? null,
    type_name: product.type?.name ?? null,
    type_has_duration: product.type?.has_duration ?? false,
    duration_hours: product.duration_hours ?? null,
    created_at: product.created_at?.toISOString() ?? null,
  };
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const product = await fetchProduct(resolved.id);
  if (!product) {
    return {
      title: "Бараа олдсонгүй",
    };
  }

  const base = await getBaseUrl();
  const imageUrl = resolveImageUrl(base, product.image_url || product.images?.[0]);
  const title = product.name || "Бараа";
  const description =
    product.description?.trim() ||
    `${title} - ${Number(product.discount_price ?? product.price).toLocaleString()}₮`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const product = await fetchProduct(resolved.id);

  if (!product) {
    return (
      <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
        <Header />
        <main className="container mx-auto px-6 py-10 flex-1">
          <div className="rounded-2xl bg-white p-6 shadow">
            Бараа олдсонгүй.
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const relatedRaw = product?.category_id
    ? await prisma.adminProduct.findMany({
        where: { category_id: product.category_id, NOT: { id: product.id } },
        orderBy: { created_at: "desc" },
        take: 4,
        include: {
          type: true,
          images: { where: { product_variant_id: null }, orderBy: { id: "asc" } },
        },
      })
    : product?.subcategory_id
      ? await prisma.adminProduct.findMany({
          where: { subcategory_id: product.subcategory_id, NOT: { id: product.id } },
          orderBy: { created_at: "desc" },
          take: 4,
          include: {
            type: true,
            images: { where: { product_variant_id: null }, orderBy: { id: "asc" } },
          },
        })
      : await prisma.adminProduct.findMany({
          where: { NOT: { id: product.id } },
          orderBy: { created_at: "desc" },
          take: 4,
          include: {
            type: true,
            images: { where: { product_variant_id: null }, orderBy: { id: "asc" } },
          },
        });

  const related: RelatedProduct[] = relatedRaw.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    discount_price: p.discount_price,
    stock: p.stock,
    ordered_qty: p.ordered_qty,
    image_url: p.images?.[0]?.image_url ?? null,
    type_name: p.type?.name ?? null,
    type_has_duration: p.type?.has_duration ?? false,
    duration_hours: p.duration_hours ?? null,
    created_at: p.created_at?.toISOString() ?? null,
  }));

  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <main className="container mx-auto px-6 py-10 flex-1">
        <ProductDetailClient product={product} />
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-bold">Ижил төстэй бараа</h2>
            <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
              {related.map((item) => (
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
      </main>
      <Footer />
    </div>
  );
}
