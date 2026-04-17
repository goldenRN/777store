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
      order_accept_status?: string | null;
      ordered_qty?: number | null;
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

  const pendingStatus = await prisma.adminStatus.findFirst({ orderBy: { id: "asc" } });
  const orderItems = await prisma.adminOrderItem.findMany({
    where: {
      product_id: productId,
      order: {
        payment_status: "PAID",
        ...(pendingStatus?.name ? { status: pendingStatus.name } : {}),
      },
    },
    select: {
      quantity: true,
      variant_id: true,
      image_url: true,
      price: true,
    },
  });

  const normalizeImage = (url?: string | null) => {
    const raw = String(url || "").trim();
    if (!raw) return "";
    let cleaned = raw.split("#")[0].split("?")[0];
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
      try {
        const parsed = new URL(cleaned);
        if (parsed.pathname && parsed.pathname.includes("/uploads/")) {
          return parsed.pathname;
        }
        return cleaned;
      } catch {
        return cleaned;
      }
    }
    if (cleaned.startsWith("uploads/")) return `/${cleaned}`;
    if (cleaned.startsWith("/uploads/")) return cleaned;
    if (cleaned.startsWith("/")) return cleaned;
    return `/uploads/${cleaned}`;
  };

  const variantImageIndex = new Map<string, number[]>();
  const variantPriceIndex = new Map<number, number[]>();
  product.variants.forEach((v) => {
    v.images?.forEach((img) => {
      const norm = normalizeImage(img.image_url ?? null);
      if (!norm) return;
      const list = variantImageIndex.get(norm) ?? [];
      list.push(v.id);
      variantImageIndex.set(norm, list);
    });
    if (v.price != null) {
      const price = Number(v.price);
      const list = variantPriceIndex.get(price) ?? [];
      list.push(v.id);
      variantPriceIndex.set(price, list);
    }
  });

  const confirmedMap = new Map<number, number>();
  const inferredMap = new Map<number, number>();
  let totalOrdered = 0;
  for (const it of orderItems) {
    const qty = Number(it.quantity || 0);
    totalOrdered += qty;
    const confirmedVariantId = it.variant_id ? Number(it.variant_id) : null;
    if (confirmedVariantId) {
      confirmedMap.set(confirmedVariantId, (confirmedMap.get(confirmedVariantId) ?? 0) + qty);
      continue;
    }
    let inferredVariantId: number | null = null;
    const normImage = normalizeImage(it.image_url ?? null);
    if (normImage) {
      const candidates = variantImageIndex.get(normImage) ?? [];
      if (candidates.length === 1) {
        inferredVariantId = candidates[0];
      }
    }
    if (!inferredVariantId && it.price != null) {
      const candidates = variantPriceIndex.get(Number(it.price)) ?? [];
      if (candidates.length === 1) {
        inferredVariantId = candidates[0];
      }
    }
    if (inferredVariantId) {
      inferredMap.set(inferredVariantId, (inferredMap.get(inferredVariantId) ?? 0) + qty);
    }
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    video_url: product.video_url ?? null,
    price: product.price,
    discount_price: product.discount_price,
    stock: product.stock,
    ordered_qty: totalOrdered,
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
        order_accept_status: (v as any).order_accept_status ?? null,
        ordered_qty: (confirmedMap.get(v.id) ?? 0) + (inferredMap.get(v.id) ?? 0),
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
