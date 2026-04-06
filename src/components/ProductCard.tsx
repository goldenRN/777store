"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBagIcon, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { getVariantLabel } from "@/lib/variantLabel";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/use-toast";

type ProductCardProps = {
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
};

type Variant = {
  id: number;
  sku?: string | null;
  attribute?: Record<string, unknown> | null;
  price?: number | null;
  stock?: number | null;
  ordered_qty?: number | null;
  images?: { image_url: string }[];
};

export default function ProductCard({
  id,
  name,
  description,
  price,
  discount_price,
  stock,
  ordered_qty,
  image_url,
  type_name,
  type_has_duration,
  duration_hours,
  created_at,
}: ProductCardProps) {
  const { addItem } = useCart();
  const [variantOpen, setVariantOpen] = useState(false);
  const [variantLoading, setVariantLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantError, setVariantError] = useState<string | null>(null);

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return url;
    return `/uploads/${url}`;
  };

  const resolvedImage = resolveImageUrl(image_url);
  const [imgError, setImgError] = useState(false);
  const priceNumber = Number(price) || 0;
  const discountNumber = Number(discount_price) || 0;
  const finalPrice = discountNumber > 0 ? discountNumber : priceNumber;
  const discountPercent =
    discountNumber > 0 && priceNumber > 0 && discountNumber < priceNumber
      ? Math.round(((priceNumber - discountNumber) / priceNumber) * 100)
      : null;
  const endDate = (() => {
    if (!created_at || !duration_hours) return null;
    const endMs = new Date(created_at).getTime() + duration_hours * 60 * 60 * 1000;
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date(endMs));
  })();
  const t = String(type_name || "").toLowerCase();
  const isPreorderLive =
    t.includes("захиал") || t.includes("preorder") || t.includes("урьдчил") || t.includes("лайв") || t.includes("live");
  const stockNumber = Number(stock || 0);
  const remaining = Math.max(0, stockNumber - Number(ordered_qty || 0));
  const canAddToCart = stockNumber > 0 ? remaining > 0 : true;

  const variantLabel = (v: Variant) => getVariantLabel(v.attribute, v.sku, v.id);

  const loadVariants = async () => {
    setVariantLoading(true);
    setVariantError(null);
    try {
      const res = await fetch(`/api/productvar/${id}`);
      const json = await res.json();
      const list = Array.isArray(json) ? (json as Variant[]) : [];
      setVariants(list);
      if (list.length === 0) {
        addItem({ id, name, price: finalPrice, image_url, type_name });
      } else {
        setVariantOpen(true);
      }
    } catch {
      setVariantError("Төрөл мэдээлэл уншиж чадсангүй");
      addItem({ id, name, price: finalPrice, image_url, type_name });
    } finally {
      setVariantLoading(false);
    }
  };

  const handleSelectVariant = (v: Variant) => {
    const vPrice = v.price != null ? Number(v.price) : finalPrice;
    const vImage = v.images?.[0]?.image_url || image_url;
    addItem({
      id,
      name,
      price: vPrice,
      image_url: vImage || null,
      type_name,
      variant_id: v.id,
      variant_sku: v.sku ?? null,
      variant_label: variantLabel(v),
    });
    setVariantOpen(false);
  };

  useEffect(() => {
    if (!variantOpen) {
      setVariants([]);
      setVariantError(null);
    }
  }, [variantOpen]);

  return (
    <div className="flex flex-col rounded-3xl border border-[#e5e7eb] bg-white shadow-sm">
      <div className="relative">
        {discountPercent !== null && (
          <div className="absolute right-4 top-4 rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white">
            -{discountPercent}%
          </div>
        )}
        {/* <div className="absolute right-4 top-4 text-[10px] font-bold text-[var(--navy-900)]">
          VMLC
        </div> */}
        <Link
          href={`/product/${id}`}
          className="relative flex h-[260px] w-full items-center justify-center overflow-hidden rounded-2xl bg-white"
        >
          {resolvedImage && !imgError ? (
            <Image
              src={resolvedImage}
              alt={name}
              fill
              className="object-contain"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain opacity-80" />
          )}
        </Link>
      </div>

      <div className="px-4 pb-4">


        {/* <div className="mt-4 text-center text-sm font-bold tracking-wide text-[var(--navy-900)]">
          ЗАХИАЛГА
        </div> */}
        <Link
          href={`/product/${id}`}
          className="mt-2 block text-center text-sm font-semibold text-[var(--gray-600)] hover:text-[var(--accent-2)]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {name}
        </Link>
        {description && (
          <div
            className="mt-1 text-center text-xs text-[var(--gray-500)]"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </div>
        )}
        <div className="flex items-center justify-between">

          {/* PRICE */}
          <div className="mt-3 text-left">
            <div className="text-xl font-bold text-red-500">
              {Number(finalPrice).toLocaleString()}₮
            </div>

            {discount_price != null && discount_price > 0 && discount_price < price && (
              <div className="text-sm text-[var(--gray-400)] line-through">
                {price.toLocaleString()}₮
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (!canAddToCart) {
                toast({ title: "Захиалах тоо дууссан байна" });
                return;
              }
              loadVariants();
            }}
            disabled={!canAddToCart}
            className={`flex h-10 w-10 mt-2 items-center justify-center rounded-xl bg-[#f6f6f6] text-[var(--navy-900)] ${
              !canAddToCart ? "cursor-not-allowed opacity-50" : ""
            }`}
            aria-label="Сагсанд нэмэх"
          >
            {variantLoading ? (
              <span className="text-xs">...</span>
            ) : (
              <ShoppingBagIcon size={18} />
            )}
          </button>

        </div>
        {type_has_duration && duration_hours ? (
          <>
            <div className="mt-3 text-center text-xs text-[var(--gray-500)]">
              Дуусах огноо: {endDate || "тохируулгагүй"}
            </div>
            <div className="mt-3">
              <div className="h-1 w-full rounded-full bg-[#e5e7eb]">
                <div className="h-1 w-[20%] rounded-full bg-red-500" />
              </div>
            </div>
          </>
        ) : null}
        {isPreorderLive && (!duration_hours || duration_hours === 0) && Number(stock || 0) > 0 && (
          remaining > 0 ? (
            <div className="mt-3 text-center text-xs text-[var(--gray-500)]">
              Захиалга авах тоо:{" "}
              <span className="font-semibold text-[var(--navy-900)]">{remaining}</span>
            </div>
          ) : (
            <div className="mt-3 text-center text-xs font-semibold text-red-600">
              Захиалга хаагдсан
            </div>
          )
        )}
      </div>

      {variantOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setVariantOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-[360px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="text-sm font-semibold">Төрөл сонгох</div>
                <div className="text-xs text-[var(--gray-500)]">{name}</div>
              </div>
              <button onClick={() => setVariantOpen(false)} className="rounded-full p-2 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-auto h-[calc(100%-64px)]">
              {variantError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {variantError}
                </div>
              )}
              {variants.length === 0 ? (
                <div className="text-xs text-[var(--gray-500)]">Төрөл олдсонгүй.</div>
              ) : (
                variants.map((v) => {
                  const vImage = v.images?.[0]?.image_url || image_url;
                  const vPrice = v.price != null ? Number(v.price) : finalPrice;
                  const vStock = Number(v.stock || 0);
                  const vRemaining = vStock > 0 ? Math.max(0, vStock - Number(v.ordered_qty || 0)) : null;
                  const vClosed = vStock > 0 && vRemaining != null && vRemaining <= 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        if (vClosed) {
                          toast({ title: "Захиалах тоо дууссан байна" });
                          return;
                        }
                        handleSelectVariant(v);
                      }}
                      className={`w-full rounded-xl border p-3 text-left hover:border-[var(--accent-2)] ${
                        vClosed ? "cursor-not-allowed opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg border bg-[var(--sky-100)] overflow-hidden">
                          {vImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveImageUrl(vImage)}
                              alt={v.sku || "Төрөл"}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-[var(--navy-900)]">
                            {v.sku || `Төрөл-${v.id}`}
                          </div>
                          <div className="text-[10px] text-[var(--gray-500)]">{variantLabel(v)}</div>
                          <div className="mt-1 text-xs font-semibold text-red-500">
                            {Number(vPrice).toLocaleString()}₮
                          </div>
                          {vClosed && (
                            <div className="mt-1 text-[10px] font-semibold text-red-600">
                              Захиалга хаагдсан
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
