"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { useRouter } from "next/navigation";

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
  category_name: string | null;
  subcategory_name: string | null;
  type_name: string | null;
  type_has_duration?: boolean;
  duration_hours?: number | null;
  created_at?: string | null;
};

export default function ProductDetailClient({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const actionLabel = (() => {
    return "Сагсанд нэмэх";
  })();
  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return url;
    return `/uploads/${url}`;
  };

  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(product.image_url || product.images[0] || null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const endDate = useMemo(() => {
    if (!product.created_at || !product.duration_hours) return null;
    const endMs = new Date(product.created_at).getTime() + product.duration_hours * 60 * 60 * 1000;
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date(endMs));
  }, [product.created_at, product.duration_hours]);

  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.id === selectedVariantId) || null,
    [product.variants, selectedVariantId]
  );

  const finalPrice = useMemo(() => {
    if (selectedVariant && selectedVariant.price != null) return selectedVariant.price;
    return product.discount_price && product.discount_price > 0 ? product.discount_price : product.price;
  }, [selectedVariant, product.discount_price, product.price]);

  const displayStock = useMemo(() => {
    if (selectedVariant && selectedVariant.stock != null) return selectedVariant.stock;
    return product.stock;
  }, [selectedVariant, product.stock]);

  const isPreorderLive = useMemo(() => {
    const t = String(product.type_name || "").toLowerCase();
    return (
      t.includes("захиал") ||
      t.includes("preorder") ||
      t.includes("урьдчил") ||
      t.includes("лайв") ||
      t.includes("live")
    );
  }, [product.type_name]);

  const remainingQty = Math.max(0, Number(product.stock || 0) - Number(product.ordered_qty || 0));

  const baseImages = useMemo(() => {
    const list = [product.image_url, ...product.images].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [product.image_url, product.images]);

  const gallery = useMemo(() => {
    const all: { url: string; variantId: number | null }[] = [];
    baseImages.forEach((url) => {
      all.push({ url, variantId: null });
    });
    product.variants.forEach((v) => {
      (v.images || []).forEach((url) => {
        if (url) all.push({ url, variantId: v.id });
      });
    });
    // de-dup by url, prefer variant mapping if exists
    const map = new Map<string, { url: string; variantId: number | null }>();
    all.forEach((item) => {
      if (!map.has(item.url) || item.variantId) {
        map.set(item.url, item);
      }
    });
    return Array.from(map.values());
  }, [baseImages, product.variants]);

  const images = gallery;

  const variantLabel = (v: ProductDetail["variants"][number]) => {
    const attr = (v.attribute || {}) as Record<string, unknown>;
    const type = typeof attr.type === "string" ? attr.type : "";
    const color = typeof attr.color === "string" ? attr.color : "";
    const size = typeof attr.size === "string" ? attr.size : "";
    const merged = [type, color, size].filter(Boolean).join(" / ");
    return merged || v.sku || `Төрөл-${v.id}`;
  };

  const getVariantColor = (v: ProductDetail["variants"][number]) => {
    const attr = (v.attribute || {}) as Record<string, unknown>;
    const color = typeof attr.color === "string" ? attr.color.trim() : "";
    return color;
  };

  const getVariantSize = (v: ProductDetail["variants"][number]) => {
    const attr = (v.attribute || {}) as Record<string, unknown>;
    const size = typeof attr.size === "string" ? attr.size.trim() : "";
    return size;
  };

  const hasColor = useMemo(
    () => product.variants.some((v) => !!getVariantColor(v)),
    [product.variants]
  );
  const hasSize = useMemo(
    () => product.variants.some((v) => !!getVariantSize(v)),
    [product.variants]
  );

  const colorGroups = useMemo(() => {
    const map = new Map<string, ProductDetail["variants"]>();
    if (!hasColor && !hasSize) return map;
    product.variants.forEach((v) => {
      const c = getVariantColor(v) || "Бусад";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(v);
    });
    return map;
  }, [product.variants, hasColor, hasSize]);

  const colorList = useMemo(() => Array.from(colorGroups.keys()), [colorGroups]);

  const sizeOptions = useMemo(() => {
    if (!selectedColor) return [];
    const list: string[] = [];
    const seen = new Set<string>();
    const variants = colorGroups.get(selectedColor) || [];
    variants.forEach((v) => {
      const s = getVariantSize(v) || v.sku || `Төрөл-${v.id}`;
      if (!seen.has(s)) {
        seen.add(s);
        list.push(s);
      }
    });
    return list;
  }, [selectedColor, colorGroups]);

  const matchedVariant = useMemo(() => {
    if (!hasColor && !hasSize) return null;
    if (!selectedColor) return null;
    const variants = colorGroups.get(selectedColor) || [];
    if (variants.length === 0) return null;
    if (selectedSize) {
      const v = variants.find((it) => getVariantSize(it) === selectedSize);
      if (v) return v;
    }
    return variants[0];
  }, [selectedColor, selectedSize, colorGroups, hasColor, hasSize]);

  useEffect(() => {
    if (!hasColor && !hasSize) return;
    if (!selectedColor && colorList.length > 0) {
      setSelectedColor(colorList[0]);
    }
  }, [colorList, selectedColor, hasColor, hasSize]);

  useEffect(() => {
    if (!hasSize) return;
    if (!selectedColor) return;
    if (sizeOptions.length === 0) return;
    if (!selectedSize || !sizeOptions.includes(selectedSize)) {
      setSelectedSize(sizeOptions[0]);
    }
  }, [selectedColor, selectedSize, sizeOptions, hasSize]);

  useEffect(() => {
    if (!matchedVariant) return;
    if (matchedVariant.id !== selectedVariantId) {
      setSelectedVariantId(matchedVariant.id);
    }
    if (matchedVariant.images && matchedVariant.images.length > 0) {
      setActiveImage(matchedVariant.images[0]);
    }
  }, [matchedVariant, selectedVariantId]);

  useEffect(() => {
    if (!selectedVariant) return;
    const c = getVariantColor(selectedVariant) || null;
    const s = getVariantSize(selectedVariant) || null;
    if (hasColor) setSelectedColor(c || selectedColor);
    if (hasSize) setSelectedSize(s || selectedSize);
  }, [selectedVariant?.id, hasColor, hasSize]);

  // keep simple: use normal https link so mobile can open FB app via universal link

  const selectedVariantLabel = selectedVariant ? variantLabel(selectedVariant) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow">
        <div className="relative h-[420px] w-full overflow-hidden rounded-xl bg-[var(--sky-100)]">
          {activeImage ? (
            <Image
              src={resolveImageUrl(activeImage)}
              alt={product.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="grid h-full w-full place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain opacity-80" />
            </div>
          )}
          {activeImage && (
            <button
              onClick={() => setZoomOpen(true)}
              className="absolute inset-0"
              aria-label="Zoom image"
            />
          )}
        </div>
        {gallery.length > 1 && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {gallery.map((img, idx) => (
              <button
                key={`${img.url}-${idx}`}
                onClick={() => {
                  setActiveImage(img.url);
                  if (img.variantId) {
                    setSelectedVariantId(img.variantId);
                  } else {
                    setSelectedVariantId(null);
                  }
                }}
                className={`relative h-20 w-full overflow-hidden rounded-lg bg-[var(--sky-100)] ${
                  activeImage === img.url ? "ring-2 ring-red-500" : ""
                }`}
              >
                <Image
                  src={resolveImageUrl(img.url)}
                  alt={`${product.name}-${idx}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-[var(--navy-900)]">{product.name}</h1>
        <div className="mt-3">
          <span className="text-2xl font-bold text-red-500">
            {Number(finalPrice).toLocaleString()}₮
          </span>
          {(!selectedVariant || selectedVariant.price == null) &&
            product.discount_price != null &&
            product.discount_price > 0 &&
            product.discount_price < product.price && (
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
              data-fb-video="true"
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
              Ангилал: <span className="font-semibold text-[var(--navy-900)]">{product.category_name}</span>
              {product.subcategory_name ? ` / ${product.subcategory_name}` : ""}
            </div>
          )}
          {product.type_name && (
            <div>
              Төрөл: <span className="font-semibold text-[var(--navy-900)]">{product.type_name}</span>
            </div>
          )}
          {product.type_has_duration ? (
            <div>
              Дуусах огноо:{" "}
              <span className="font-semibold text-[var(--navy-900)]">
                {endDate || "тохируулгагүй"}
              </span>
            </div>
          ) : null}
          <div>
            Үлдэгдэл: <span className="font-semibold text-[var(--navy-900)]">{displayStock}</span>
          </div>
          {isPreorderLive && (!product.duration_hours || product.duration_hours === 0) && Number(product.stock || 0) > 0 && (
            remainingQty > 0 ? (
              <div>
                Захиалга авах тоо:{" "}
                <span className="font-semibold text-[var(--navy-900)]">{remainingQty}</span>
              </div>
            ) : (
              <div className="font-semibold text-red-600">Захиалга хаагдсан</div>
            )
          )}
          {product.material && (
            <div>
              Материал: <span className="font-semibold text-[var(--navy-900)]">{product.material}</span>
            </div>
          )}
        </div>

        {product.variants && product.variants.length > 0 && (
          <div className="mt-5 space-y-4">
            {hasColor && (
              <div>
                <div className="text-xs font-semibold text-[var(--navy-900)] mb-2">Өнгө</div>
                <div className="flex flex-wrap gap-2">
                  {colorList.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color);
                        setSelectedSize(null);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        selectedColor === color
                          ? "border-red-500 bg-red-50 text-red-600"
                          : "text-[var(--gray-700)] hover:bg-[var(--sky-100)]"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasSize && (
              <div>
                <div className="text-xs font-semibold text-[var(--navy-900)] mb-2">Размер</div>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        const next =
                          matchedVariant && matchedVariant.images && matchedVariant.images.length > 0
                            ? Array.from(new Set(matchedVariant.images.filter(Boolean) as string[]))
                            : baseImages;
                        if (next[0]) setActiveImage(next[0]);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        selectedSize === size
                          ? "border-red-500 bg-red-50 text-red-600"
                          : "text-[var(--gray-700)] hover:bg-[var(--sky-100)]"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!hasColor && !hasSize && (
              <div>
                <div className="text-xs font-semibold text-[var(--navy-900)] mb-2">Төрөл</div>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(v.id);
                        const nextImages =
                          v.images && v.images.length > 0
                            ? Array.from(new Set(v.images.filter(Boolean) as string[]))
                            : baseImages;
                        setActiveImage(nextImages[0] || null);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        selectedVariantId === v.id
                          ? "border-red-500 bg-red-50 text-red-600"
                          : "text-[var(--gray-700)] hover:bg-[var(--sky-100)]"
                      }`}
                    >
                      {v.sku || `Төрөл-${v.id}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedVariant?.attribute && (
              <div className="text-xs text-[var(--gray-700)]">
                {Object.entries(selectedVariant.attribute)
                  .filter(([k, v]) => k !== "color" && k !== "size" && k !== "type" && v != null && String(v).length > 0)
                  .map(([k, v]) => (
                    <div key={k}>
                      {k}: <span className="font-semibold text-[var(--navy-900)]">{String(v)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border px-3 py-2">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-8 w-8 rounded-full border text-sm"
            >
              -
            </button>
            <div className="w-8 text-center text-sm font-semibold">{qty}</div>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="h-8 w-8 rounded-full border text-sm"
            >
              +
            </button>
          </div>

          <AddToCartButton
            id={product.id}
            name={product.name}
            price={finalPrice}
            image_url={product.image_url}
            type_name={product.type_name}
            variant_id={selectedVariant?.id ?? null}
            variant_sku={selectedVariant?.sku ?? null}
            variant_label={selectedVariantLabel}
            qty={qty}
            onAdded={() => router.push("/cart")}
            className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            {actionLabel}
          </AddToCartButton>
        </div>
      </div>

      {zoomOpen && activeImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setZoomOpen(false)} />
          <div className="relative z-10 max-w-5xl w-full">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setZoomOpen(false)}
                className="px-3 py-1 rounded bg-white text-sm"
              >
                Хаах
              </button>
            </div>
            <div className="relative w-full h-[70vh] rounded-xl overflow-hidden bg-black">
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
