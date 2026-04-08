
"use client";

import Image from "next/image";
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { toast } from "@/components/ui/use-toast";
import { getVariantLabel } from "@/lib/variantLabel";

type Variant = {
  id: number;
  sku: string | null;
  attribute: Record<string, unknown> | null;
  images: string[];
  price: number | null;
  stock: number | null;
  ordered_qty?: number | null;
};

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
  variants: Variant[];
  category_name: string | null;
  subcategory_name: string | null;
  type_name: string | null;
  type_has_duration?: boolean;
  duration_hours?: number | null;
  created_at?: string | null;
};

type GalleryItem = {
  url: string;
  variantId: number | null;
};

const ACTION_LABEL = "Сагсанд нэмэх";

const isExternalUrl = (url?: string | null) => !!url && /^https?:\/\//i.test(url);

const resolveImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (isExternalUrl(url) || url.startsWith("/")) return url;
  return `/uploads/${url}`;
};

const normalizeImage = (url?: string | null) => {
  if (!url) return "";

  let clean = url.split("?")[0].split("#")[0];

  if (isExternalUrl(clean)) {
    try {
      const parsed = new URL(clean);
      if (parsed.pathname.includes("/uploads/")) return parsed.pathname;
      return clean;
    } catch {
      return clean;
    }
  }

  if (clean.startsWith("/uploads/")) return clean;
  if (clean.startsWith("uploads/")) return `/${clean}`;
  if (clean.startsWith("/")) return clean;

  return `/uploads/${clean}`;
};

const getImageKey = (url: string) => {
  const clean = url.split("?")[0].split("#")[0];
  const parts = clean.split("/");
  return parts[parts.length - 1] || clean;
};

const getThumbUrl = (url: string) => {
  if (!url || isExternalUrl(url)) return url;

  const clean = url.split("?")[0].split("#")[0];
  const parts = clean.split("/");
  const filename = parts[parts.length - 1] || "";
  if (!filename) return url;

  const dot = filename.lastIndexOf(".");
  const base = dot >= 0 ? filename.slice(0, dot) : filename;

  if (base.endsWith("_sm")) return url;

  const thumbName = `${base}_sm.jpg`;
  return `${parts.slice(0, -1).join("/")}/${thumbName}`;
};

const getAttrString = (attribute: Record<string, unknown> | null | undefined, key: string) => {
  const value = attribute?.[key];
  return typeof value === "string" ? value.trim() : "";
};
const getVariantDisplayLabel = (variant: Variant) =>
  getVariantLabel(variant.attribute, variant.sku, variant.id);

const buildGallery = (product: ProductDetail): GalleryItem[] => {
  const map = new Map<string, GalleryItem>();

  const productImages = [product.image_url, ...product.images]
    .map(normalizeImage)
    .filter(Boolean)
    .map((url) => ({ url, variantId: null as number | null }));
  productImages.forEach((item) => {
    const key = getImageKey(item.url);
    if (!map.has(key)) map.set(key, item);
  });

  return Array.from(map.values());
};

const ThumbnailGrid = memo(function ThumbnailGrid({
  items,
  activeImage,
  onSelect,
}: {
  items: GalleryItem[];
  activeImage: string | null;
  onSelect: (url: string) => void;
}) {
  const [thumbFallback, setThumbFallback] = useState<Record<string, boolean>>({});

  return (
    <div className="mt-4 grid grid-cols-4 gap-3">
      {items.map((item, index) => (
        <button
          key={`${item.url}-${index}`}
          type="button"
          onClick={() => onSelect(item.url)}
          className={`relative h-20 w-full overflow-hidden rounded-lg bg-[var(--sky-100)] ${
            activeImage === item.url ? "ring-2 ring-red-500" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveImageUrl(thumbFallback[item.url] ? item.url : getThumbUrl(item.url))}
            alt={`thumb-${index}`}
            className="h-full w-full object-cover"
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
            onError={() => {
              if (!thumbFallback[item.url]) {
                setThumbFallback((prev) => ({ ...prev, [item.url]: true }));
              }
            }}
          />
        </button>
      ))}
    </div>
  );
});

const ProductImageGallery = memo(function ProductImageGallery({
  productName,
  activeImage,
  mainImageError,
  onMainImageError,
  onSelectImage,
  onOpenZoom,
  gallery,
}: {
  productName: string;
  activeImage: string | null;
  mainImageError: boolean;
  onMainImageError: () => void;
  onSelectImage: (url: string) => void;
  onOpenZoom: () => void;
  gallery: GalleryItem[];
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <div className="relative h-[420px] w-full overflow-hidden rounded-xl bg-[var(--sky-100)]">
        {activeImage && !mainImageError ? (
            <Image
              src={resolveImageUrl(activeImage)}
              alt={productName}
              fill
              priority
              loading="eager"
              sizes="(min-width: 1024px) 50vw, 100vw"
              quality={70}
              className="object-cover"
            unoptimized={isExternalUrl(activeImage)}
            onError={onMainImageError}
          />
        ) : activeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveImageUrl(activeImage)} alt={productName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain opacity-80" />
          </div>
        )}

        {activeImage && (
          <button
            type="button"
            onClick={onOpenZoom}
            className="absolute inset-0"
            aria-label="Zoom image"
          />
        )}
      </div>

      {gallery.length > 1 && (
        <ThumbnailGrid items={gallery} activeImage={activeImage} onSelect={onSelectImage} />
      )}
    </div>
  );
});

const VariantSelector = memo(function VariantSelector({
  variants,
  selectedVariantId,
  onSelect,
  baseImageUrl,
}: {
  variants: Variant[];
  selectedVariantId: number | null;
  onSelect: (id: number) => void;
  baseImageUrl: string | null;
}) {
  return (
    <div className="space-y-3 max-h-[340px] overflow-auto pr-1">
      {variants.map((v) => {
        const vImage = v.images?.[0] || baseImageUrl || null;
        const vPrice = v.price ?? null;
        const label = getVariantDisplayLabel(v);
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v.id)}
            className={`w-full rounded-xl border p-3 text-left ${
              selectedVariantId === v.id ? "border-red-500" : "hover:border-[var(--accent-2)]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg border bg-[var(--sky-100)] overflow-hidden">
                {vImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(vImage)}
                    alt={label}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-[var(--navy-900)]">
                  {v.sku || label}
                </div>
                <div className="text-[10px] text-[var(--gray-500)]">{label}</div>
                <div className="mt-1 text-xs font-semibold text-red-500">
                  {Number(vPrice ?? 0).toLocaleString()}₮
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
});

export default function ProductDetailClient({ product }: { product: ProductDetail }) {
  const router = useRouter();

  const gallery = useMemo(() => buildGallery(product), [product]);

  const variantMap = useMemo(() => {
    const map = new Map<number, Variant>();
    product.variants.forEach((variant) => map.set(variant.id, variant));
    return map;
  }, [product.variants]);

  const initialVariantId = product.variants[0]?.id ?? null;
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(initialVariantId);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(gallery[0]?.url ?? null);
  const [mainImageError, setMainImageError] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const prevVariantIdRef = useRef<number | null>(null);

  const selectedVariant = useMemo(
    () => (selectedVariantId != null ? variantMap.get(selectedVariantId) ?? null : null),
    [selectedVariantId, variantMap]
  );

  const sizeVariants = useMemo(() => product.variants, [product.variants]);

  useEffect(() => {
    if (!activeImage && gallery.length > 0) {
      setActiveImage(gallery[0].url);
    }
  }, [activeImage, gallery]);

  useEffect(() => {
    setMainImageError(false);
  }, [activeImage]);

  useEffect(() => {
    if (!selectedVariant) return;

    const prevId = prevVariantIdRef.current;
    if (prevId === selectedVariant.id) return;

    const variantImages = (selectedVariant.images || []).map(normalizeImage).filter(Boolean);
    setActiveImage(variantImages[0] || gallery[0]?.url || null);
    prevVariantIdRef.current = selectedVariant.id;
  }, [selectedVariant, gallery]);

  const finalPrice = useMemo(() => {
    return (
      selectedVariant?.price ??
      (product.discount_price && product.discount_price > 0
        ? product.discount_price
        : product.price)
    );
  }, [selectedVariant, product.discount_price, product.price]);

  const stockNumber = Number(selectedVariant?.stock ?? product.stock ?? 0);
  const orderedNumber = Number(selectedVariant?.ordered_qty ?? product.ordered_qty ?? 0);
  const remainingQty = stockNumber > 0 ? Math.max(0, stockNumber - orderedNumber) : null;

  const isPreorderLive = useMemo(() => {
    const type = String(product.type_name || "").toLowerCase();
    return (
      type.includes("захиал") ||
      type.includes("preorder") ||
      type.includes("урьдчил") ||
      type.includes("лайв") ||
      type.includes("live")
    );
  }, [product.type_name]);

  const isClosed = stockNumber > 0 && remainingQty !== null && remainingQty <= 0;
  const canAddToCart = stockNumber > 0 ? !isClosed : true;

  useEffect(() => {
    if (remainingQty !== null && qty > remainingQty && remainingQty > 0) {
      setQty(remainingQty);
    }
  }, [remainingQty, qty]);

  const endDate = useMemo(() => {
    if (!product.created_at || !product.duration_hours) return null;

    const endMs =
      new Date(product.created_at).getTime() + product.duration_hours * 60 * 60 * 1000;

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ulaanbaatar",
    }).format(new Date(endMs));
  }, [product.created_at, product.duration_hours]);

  const cartImageUrl = selectedVariant?.images?.[0] || product.image_url || null;
  const selectedVariantLabel = selectedVariant ? getVariantDisplayLabel(selectedVariant) : null;

  const showDiscountBasePrice =
    (!selectedVariant || selectedVariant.price == null) &&
    product.discount_price != null &&
    product.discount_price > 0 &&
    product.discount_price < product.price;

  const handleVariantSelect = useCallback((id: number) => {
    startTransition(() => setSelectedVariantId(id));
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ProductImageGallery
        productName={product.name}
        activeImage={activeImage}
        mainImageError={mainImageError}
        onMainImageError={() => setMainImageError(true)}
        onSelectImage={setActiveImage}
        onOpenZoom={() => setZoomOpen(true)}
        gallery={gallery}
      />

      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-[var(--navy-900)]">{product.name}</h1>

        <div className="mt-3">
          <span className="text-2xl font-bold text-red-500">
            {Number(finalPrice).toLocaleString()}₮
          </span>

          {showDiscountBasePrice && (
            <span className="ml-3 text-sm text-[var(--gray-500)] line-through">
              {product.price.toLocaleString()}₮
            </span>
          )}
        </div>

        <div className="mt-4 text-sm text-[var(--gray-700)]">
          {product.description || "Тайлбар байхгүй."}
        </div>

        {product.video_url && (
          <div className="mt-4">
            <a
              href={product.video_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              Видео үзэх
            </a>
          </div>
        )}

        <div className="mt-4 grid gap-2 text-xs text-[var(--gray-600)]">
          {product.category_name && (
            <div>
              Ангилал:{" "}
              <span className="font-semibold text-[var(--navy-900)]">
                {product.category_name}
              </span>
              {product.subcategory_name ? ` / ${product.subcategory_name}` : ""}
            </div>
          )}

          {product.type_name && (
            <div>
              Төрөл:{" "}
              <span className="font-semibold text-[var(--navy-900)]">{product.type_name}</span>
            </div>
          )}

          {product.type_has_duration && (
            <div>
              Дуусах огноо:{" "}
              <span className="font-semibold text-[var(--navy-900)]">
                {endDate || "тохируулгагүй"}
              </span>
            </div>
          )}

          {(!isPreorderLive || stockNumber <= 0) && (
            <div>
              Үлдэгдэл:{" "}
              <span className="font-semibold text-[var(--navy-900)]">
                {remainingQty ?? "-"}
              </span>
            </div>
          )}

          {isPreorderLive && stockNumber > 0 && (
            remainingQty && remainingQty > 0 ? (
              <>
                <div>
                  Захиалга авах тоо:{" "}
                  <span className="font-semibold text-[var(--navy-900)]">{stockNumber}</span>
                </div>
                <div>
                  Захиалсан:{" "}
                  <span className="font-semibold text-[var(--navy-900)]">{orderedNumber}</span>
                </div>
                <div>
                  Үлдэгдэл:{" "}
                  <span className="font-semibold text-[var(--navy-900)]">{remainingQty}</span>
                </div>
              </>
            ) : (
              <div className="font-semibold text-red-600">Захиалга хаагдсан</div>
            )
          )}

          {product.material && (
            <div>
              Материал:{" "}
              <span className="font-semibold text-[var(--navy-900)]">{product.material}</span>
            </div>
          )}
        </div>

        {product.variants.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="text-xs font-semibold text-[var(--navy-900)]">Төрөл сонгох</div>
            <VariantSelector
              variants={product.variants}
              selectedVariantId={selectedVariantId}
              onSelect={handleVariantSelect}
              baseImageUrl={product.image_url}
            />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-full border px-3 py-2">
            <button
              type="button"
              onClick={() => setQty((current) => Math.max(1, current - 1))}
              className="h-8 w-8 rounded-full border text-sm"
            >
              -
            </button>

            <div className="w-8 text-center text-sm font-semibold">{qty}</div>

            <button
              type="button"
              onClick={() =>
                setQty((current) => {
                  if (remainingQty !== null) {
                    return Math.min(current + 1, Math.max(1, remainingQty));
                  }
                  return current + 1;
                })
              }
              className="h-8 w-8 rounded-full border text-sm"
            >
              +
            </button>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <AddToCartButton
              id={product.id}
              name={product.name}
              price={finalPrice}
              image_url={cartImageUrl}
              type_name={product.type_name}
              variant_id={selectedVariant?.id ?? null}
              variant_sku={selectedVariant?.sku ?? null}
              variant_label={selectedVariantLabel}
              qty={qty}
              disabled={!canAddToCart}
              onAdded={() => toast({ title: "Сагсанд нэмэгдлээ" })}
              className="w-full rounded-full border border-black bg-white px-6 py-3 text-sm font-semibold text-black sm:w-auto"
            >
              {ACTION_LABEL}
            </AddToCartButton>
            <AddToCartButton
              id={product.id}
              name={product.name}
              price={finalPrice}
              image_url={cartImageUrl}
              type_name={product.type_name}
              variant_id={selectedVariant?.id ?? null}
              variant_sku={selectedVariant?.sku ?? null}
              variant_label={selectedVariantLabel}
              qty={qty}
              disabled={!canAddToCart}
              onAdded={() => router.push("/cart")}
              className="w-full rounded-full bg-black px-6 py-3 text-sm font-semibold text-white sm:w-auto"
            >
              Худалдаж авах
            </AddToCartButton>
          </div>
        </div>
      </div>

      {zoomOpen && activeImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setZoomOpen(false)} />
          <div className="relative z-10 w-full max-w-5xl">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setZoomOpen(false)}
                className="rounded bg-white px-3 py-1 text-sm"
              >
                Хаах
              </button>
            </div>
            <div className="relative h-[70vh] w-full overflow-hidden rounded-xl bg-black">
              <Image
                src={resolveImageUrl(activeImage)}
                alt={product.name}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
