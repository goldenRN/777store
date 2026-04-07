"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { getVariantLabel } from "@/lib/variantLabel";
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
    ordered_qty?: number | null;
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
  const isExternalUrl = (url?: string | null) => {
    if (!url) return false;
    return url.startsWith("http://") || url.startsWith("https://");
  };
  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return url;
    return `/uploads/${url}`;
  };
  const [thumbFallback, setThumbFallback] = useState<Record<string, boolean>>({});

  const getTypeName = (v: ProductDetail["variants"][number]) => {
    const attr = (v.attribute || {}) as Record<string, unknown>;
    const type = typeof attr.type === "string" ? attr.type.trim() : "";
    return type;
  };

  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [mainImageError, setMainImageError] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(() => {
    if (!product.variants.length) return null;
    const first = product.variants[0];
    const t = getTypeName(first);
    const v = product.variants.find((it) => getTypeName(it) === t) || first;
    return v.id;
  });
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [selectedTypeGroup, setSelectedTypeGroup] = useState<string | null>(() => {
    if (!product.variants.length) return null;
    const first = product.variants[0];
    const t = getTypeName(first);
    return t || null;
  });
  const prevVariantIdRef = useRef<number | null>(null);
  const endDate = useMemo(() => {
    if (!product.created_at || !product.duration_hours) return null;
    const endMs = new Date(product.created_at).getTime() + product.duration_hours * 60 * 60 * 1000;
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date(endMs));
  }, [product.created_at, product.duration_hours]);

  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.id === selectedVariantId) || null,
    [product.variants, selectedVariantId]
  );
  const variantById = useMemo(() => {
    const map = new Map<number, ProductDetail["variants"][number]>();
    product.variants.forEach((v) => map.set(v.id, v));
    return map;
  }, [product.variants]);

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

  const variantStockNumber = selectedVariant?.stock != null ? Number(selectedVariant.stock) : null;
  const stockNumber = variantStockNumber != null ? variantStockNumber : Number(displayStock || 0);
  const orderedNumber = selectedVariant
    ? Number(selectedVariant.ordered_qty || 0)
    : Number(product.ordered_qty || 0);
  const remainingQty = stockNumber > 0 ? Math.max(0, stockNumber - orderedNumber) : null;
  const remainingLabel = remainingQty != null ? remainingQty : null;
  const hasDuration = Number(product.duration_hours || 0) > 0;
  const isClosed = stockNumber > 0 && remainingQty != null && remainingQty <= 0;
  const canAddToCart = stockNumber > 0 ? !isClosed : true;

  const normalizeImage = (url?: string | null) => {
    const raw = String(url || "").trim();
    if (!raw) return "";
    let cleaned = raw.split("#")[0].split("?")[0];
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
      try {
        const parsed = new URL(cleaned);
        if (parsed.pathname && parsed.pathname.includes("/uploads/")) {
          cleaned = parsed.pathname;
        } else {
          return cleaned;
        }
      } catch {
        return cleaned;
      }
    }
    if (cleaned.startsWith("uploads/")) return `/${cleaned}`;
    if (cleaned.startsWith("/")) return cleaned;
    if (cleaned.startsWith("/uploads/")) return cleaned;
    return `/uploads/${cleaned}`;
  };

  const baseImages = useMemo(() => {
    const list = [product.image_url, ...product.images]
      .map((url) => normalizeImage(url))
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [product.image_url, product.images]);

  useEffect(() => {
    if (!activeImage) {
      setActiveImage(baseImages[0] || null);
    }
  }, [activeImage, baseImages]);

  useEffect(() => {
    setMainImageError(false);
  }, [activeImage]);

  const imageKey = (url: string) => {
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
    if (!/^[a-f0-9]{64}$/i.test(base)) return url;
    const thumbName = `${base}_sm.jpg`;
    return `${parts.slice(0, -1).join("/")}/${thumbName}`;
  };

  const gallery = useMemo(() => {
    const all: { url: string; variantId: number | null }[] = [];
    baseImages.forEach((url) => {
      if (url) all.push({ url, variantId: null });
    });
    product.variants.forEach((v) => {
      (v.images || []).forEach((url) => {
        const normalized = normalizeImage(url);
        if (normalized) all.push({ url: normalized, variantId: v.id });
      });
    });
    // de-dup by filename (same named image => show once)
    const map = new Map<string, { url: string; variantId: number | null }>();
    all.forEach((item) => {
      const key = imageKey(item.url);
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }, [baseImages, product.variants]);

  const images = gallery;

  const variantLabel = (v: ProductDetail["variants"][number]) =>
    getVariantLabel(v.attribute, v.sku, v.id);

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

  const enableColorSize = false;
  const hasColor = useMemo(
    () => enableColorSize && product.variants.some((v) => !!getVariantColor(v)),
    [enableColorSize, product.variants]
  );
  const hasSize = useMemo(
    () => enableColorSize && product.variants.some((v) => !!getVariantSize(v)),
    [enableColorSize, product.variants]
  );
  const hasType = useMemo(() => {
    return product.variants.some((v) => {
      const attr = (v.attribute || {}) as Record<string, unknown>;
      return typeof attr.type === "string" && attr.type.trim().length > 0;
    });
  }, [product.variants]);

  const selectedType = useMemo(() => {
    if (selectedVariant?.attribute && typeof selectedVariant.attribute.type === "string") {
      const t = selectedVariant.attribute.type.trim();
      if (t) return t;
    }
    return "";
  }, [selectedVariant]);

  const getVariantTypeName = (v: ProductDetail["variants"][number]) => getTypeName(v);

  const typeGroups = useMemo(() => {
    const map = new Map<string, ProductDetail["variants"]>();
    product.variants.forEach((v) => {
      const t = getVariantTypeName(v);
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(v);
    });
    return map;
  }, [product.variants]);

  const typeGroupList = useMemo(() => Array.from(typeGroups.keys()), [typeGroups]);

  const handleTypeClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const t = e.currentTarget.dataset.value || "";
      startTransition(() => {
        setSelectedTypeGroup(t);
        const v = typeGroups.get(t)?.[0] || null;
        setSelectedVariantId(v ? v.id : null);
        if (enableColorSize) setSelectedColor(null);
      });
    },
    [typeGroups, enableColorSize]
  );

  useEffect(() => {
    if (typeGroupList.length === 0) return;
    if (!selectedTypeGroup || !typeGroups.has(selectedTypeGroup)) {
      setSelectedTypeGroup(typeGroupList[0]);
    }
  }, [typeGroupList, typeGroups, selectedTypeGroup]);

  // no separate reset effect; selection is updated in the click handler to reduce rerenders

  const typeVariants = useMemo(() => {
    return typeGroups.get(selectedTypeGroup || "") || [];
  }, [typeGroups, selectedTypeGroup]);

  const filteredOptions = useMemo(() => {
    if (!enableColorSize) return typeVariants;
    return typeVariants
      .filter((v) => (selectedColor ? getVariantColor(v) === selectedColor : true))
      .filter((v) => {
        if (!selectedColor) return true;
        const optionLabel = variantLabel(v).trim().toLowerCase();
        const colorOnly = selectedColor.trim().toLowerCase();
        return optionLabel !== colorOnly;
      });
  }, [typeVariants, selectedColor, enableColorSize]);


  const colorOptionsForType = useMemo(() => {
    if (!enableColorSize) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    typeVariants.forEach((v) => {
      const c = getVariantColor(v);
      if (c && !seen.has(c)) {
        seen.add(c);
        list.push(c);
      }
    });
    return list;
  }, [typeVariants]);

  useEffect(() => {
    if (!enableColorSize) return;
    if (colorOptionsForType.length === 0) {
      setSelectedColor(null);
      return;
    }
    if (!selectedColor || !colorOptionsForType.includes(selectedColor)) {
      setSelectedColor(colorOptionsForType[0]);
    }
  }, [colorOptionsForType, selectedColor, enableColorSize]);

  const handleColorClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const c = e.currentTarget.dataset.value || "";
    startTransition(() => setSelectedColor(c));
  }, []);

  useEffect(() => {
    if (filteredOptions.length === 0) return;
    if (selectedVariantId == null) {
      setSelectedVariantId(filteredOptions[0].id);
      return;
    }
    const exists = filteredOptions.some((v) => v.id === selectedVariantId);
    if (!exists) {
      setSelectedVariantId(filteredOptions[0].id);
    }
  }, [filteredOptions, selectedVariantId]);


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
    if (selectedVariantId == null || matchedVariant.id !== selectedVariantId) {
      setSelectedVariantId(matchedVariant.id);
    }
  }, [matchedVariant, selectedVariantId]);

  useEffect(() => {
    if (!selectedVariant) return;
    const prevId = prevVariantIdRef.current;
    if (prevId !== selectedVariant.id) {
      const imgs = (selectedVariant.images || [])
        .map((url) => normalizeImage(url))
        .filter(Boolean);
      if (imgs.length > 0) {
        setActiveImage(imgs[0]);
      } else if (baseImages[0]) {
        setActiveImage(baseImages[0]);
      }
      prevVariantIdRef.current = selectedVariant.id;
    }
  }, [selectedVariant?.id, baseImages]);

  useEffect(() => {
    if (!selectedVariant) return;
    const c = getVariantColor(selectedVariant) || null;
    const s = getVariantSize(selectedVariant) || null;
    if (hasColor) setSelectedColor(c || selectedColor);
    if (hasSize) setSelectedSize(s || selectedSize);
  }, [selectedVariant?.id, hasColor, hasSize]);

  // keep simple: use normal https link so mobile can open FB app via universal link

  const selectedVariantLabel = selectedVariant ? variantLabel(selectedVariant) : null;
  const selectedVariantImage = selectedVariant?.images?.[0] || null;
  const cartImageUrl = selectedVariantImage || product.image_url || null;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow">
        <div className="relative h-[420px] w-full overflow-hidden rounded-xl bg-[var(--sky-100)]">
          {activeImage && !mainImageError ? (
            <Image
              src={resolveImageUrl(activeImage)}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              quality={70}
              className="object-cover"
              unoptimized={isExternalUrl(activeImage)}
              onError={() => setMainImageError(true)}
            />
          ) : activeImage ? (
            // fallback to plain img if Next/Image fails
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveImageUrl(activeImage)}
              alt={product.name}
              className="h-full w-full object-cover"
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
                }}
                className={`relative h-20 w-full overflow-hidden rounded-lg bg-[var(--sky-100)] ${
                  activeImage === img.url ? "ring-2 ring-red-500" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveImageUrl(thumbFallback[img.url] ? img.url : getThumbUrl(img.url))}
                  alt={`${product.name}-${idx}`}
                  className="h-full w-full object-cover"
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                  onError={() => {
                    if (!thumbFallback[img.url]) {
                      setThumbFallback((prev) => ({ ...prev, [img.url]: true }));
                    }
                  }}
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
          {(!isPreorderLive || stockNumber <= 0) && (
            <div>
              Үлдэгдэл:{" "}
              <span className="font-semibold text-[var(--navy-900)]">
                {remainingLabel != null ? remainingLabel : "-"}
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
              Материал: <span className="font-semibold text-[var(--navy-900)]">{product.material}</span>
            </div>
          )}
        </div>

        {product.variants && product.variants.length > 0 && (
          <div className="mt-5 space-y-4">
            {/* Type + Color + Options */}
            <div>
              {typeGroupList.some((t) => t.trim().length > 0) && (
                <>
                  <div className="text-xs font-semibold text-[var(--navy-900)] mb-2">Төрлүүд</div>
                  <div className="flex flex-wrap gap-2">
                    {typeGroupList
                      .filter((t) => t.trim().length > 0)
                      .map((t) => (
                        <button
                          key={t}
                          type="button"
                          data-value={t}
                          onClick={handleTypeClick}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            selectedTypeGroup === t
                              ? "border-red-500 bg-red-50 text-red-600"
                              : "text-[var(--gray-700)] hover:bg-[var(--sky-100)]"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                  </div>
                </>
              )}

              {colorOptionsForType.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-[var(--navy-900)] mb-2">Өнгө</div>
                  <div className="flex flex-wrap gap-2">
                    {colorOptionsForType.map((c) => (
                      <button
                        key={c}
                        type="button"
                        data-value={c}
                        onClick={handleColorClick}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          selectedColor === c
                            ? "border-red-500 bg-red-50 text-red-600"
                            : "text-[var(--gray-700)] hover:bg-[var(--sky-100)]"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredOptions.length > 1 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-[var(--navy-900)] mb-2">Хэмжээ</div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        new Map(
                          filteredOptions.map((v) => [getVariantSize(v) || v.sku || `Төрөл-${v.id}`, v])
                        ).values()
                      ).map((v) => {
                        const optionLabel = getVariantSize(v) || v.sku || `Төрөл-${v.id}`;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            data-id={v.id}
                            onClick={(e) => {
                              const id = Number((e.currentTarget as HTMLButtonElement).dataset.id || 0);
                              const next = variantById.get(id);
                              if (!next) return;
                              const nextImages =
                                next.images && next.images.length > 0
                                  ? Array.from(new Set(next.images.filter(Boolean) as string[]))
                                  : baseImages;
                              setActiveImage(nextImages[0] || null);
                              startTransition(() => setSelectedVariantId(id));
                            }}
                            className={`rounded-full border px-3 py-1 text-xs transition ${
                              selectedVariantId === v.id
                                ? "border-red-500 bg-red-50 text-red-600"
                                : "text-[var(--gray-700)] hover:bg-[var(--sky-100)]"
                            }`}
                          >
                            {optionLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
              )}


              {selectedVariant && (
                <div className="mt-4 text-xs text-[var(--gray-700)]">
                  <div>
                    Сонгосон:{" "}
                    <span className="font-semibold text-[var(--navy-900)]">{variantLabel(selectedVariant)}</span>
                  </div>
                </div>
              )}
            </div>
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
            image_url={cartImageUrl}
            type_name={product.type_name}
            variant_id={selectedVariant?.id ?? null}
            variant_sku={selectedVariant?.sku ?? null}
            variant_label={selectedVariantLabel}
            qty={qty}
            disabled={!canAddToCart}
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
