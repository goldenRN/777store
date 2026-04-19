"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { getVariantLabel } from "@/lib/variantLabel";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import DiscountBadge from "@/components/DiscountBadge";
import { isExternalMediaUrl, resolveMediaUrl } from "@/lib/media";

type ProductCardProps = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  discount_price: number | null;
  bulk_prices?: unknown | null;
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
  order_accept_status?: string | null;
  images?: { image_url: string }[];
};

const ProductCardVariantSheet = dynamic(() => import("@/components/ProductCardVariantSheet"));

export default function ProductCard({
  id,
  name,
  description,
  price,
  discount_price,
  bulk_prices,
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

  const resolvedImage = resolveMediaUrl(image_url);
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
        addItem({
          id,
          name,
          price: finalPrice,
          base_price: finalPrice,
          bulk_prices: bulk_prices ?? null,
          image_url,
          type_name,
        });
      } else {
        setVariantOpen(true);
      }
    } catch {
      setVariantError("Төрөл мэдээлэл уншиж чадсангүй");
      addItem({
        id,
        name,
        price: finalPrice,
        base_price: finalPrice,
        bulk_prices: bulk_prices ?? null,
        image_url,
        type_name,
      });
    } finally {
      setVariantLoading(false);
    }
  };

  const handleSelectVariant = (v: Variant) => {
    const vPrice = v.price != null ? Number(v.price) : finalPrice;
    const vImage = v.images?.[0]?.image_url || image_url;
    const applyBulk = !(v.price != null && Number(v.price) > 0);
    addItem({
      id,
      name,
      price: vPrice,
      base_price: vPrice,
      bulk_prices: applyBulk ? (bulk_prices ?? null) : null,
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
    <div className="flex flex-col rounded-3xl border border-[#e5e7eb] bg-slate-50 shadow-sm">
      <div className="relative">
        <DiscountBadge percent={discountPercent} />
        {/* <div className="absolute right-4 top-4 text-[10px] font-bold text-[var(--navy-900)]">
          VMLC
          "
        </div> */}
        <Link
          href={`/product/${id}`}
          className="relative flex h-[260px] w-full items-center justify-center overflow-hidden rounded-t-2xl rounded-b-none bg-white"
        >
          {resolvedImage && !imgError ? (
            <Image
              src={resolvedImage}
              alt={name}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized={isExternalMediaUrl(image_url)}
              quality={70}
              onError={() => setImgError(true)}
            />
          ) : (
            <Image
              src="/logo.png"
              alt="Logo"
              width={64}
              height={64}
              className="h-16 w-16 object-contain opacity-80"
            />
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
          </>
        ) : null}
      </div>

      {variantOpen ? (
        <ProductCardVariantSheet
          open={variantOpen}
          name={name}
          imageUrl={image_url}
          variants={variants}
          finalPrice={finalPrice}
          variantError={variantError}
          onClose={() => setVariantOpen(false)}
          onSelect={handleSelectVariant}
        />
      ) : null}
    </div>
  );
}
