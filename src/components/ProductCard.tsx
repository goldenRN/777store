"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import AddToCartButton from "@/components/cart/AddToCartButton";

type ProductCardProps = {
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

export default function ProductCard({
  id,
  name,
  description,
  price,
  discount_price,
  image_url,
  type_name,
  type_has_duration,
  duration_hours,
  created_at,
}: ProductCardProps) {
  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return url;
    return `/uploads/${url}`;
  };

  const resolvedImage = resolveImageUrl(image_url);
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
          {resolvedImage ? (
            <Image src={resolvedImage} alt={name} fill className="object-contain" />
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

            {discount_price && discount_price < price && (
              <div className="text-sm text-[var(--gray-400)] line-through">
                {price.toLocaleString()}₮
              </div>
            )}
          </div>

          {/* ADD TO CART */}
          <AddToCartButton
            id={id}
            name={name}
            price={finalPrice}
            image_url={image_url}
            type_name={type_name}
            className="flex h-10 w-10 mt-2 items-center justify-center rounded-xl bg-[#f6f6f6] text-[var(--navy-900)]"
          >
            <ShoppingBagIcon size={18} />
          </AddToCartButton>

        </div>
        {type_has_duration && (
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
        )}
      </div>
    </div>
  );
}
