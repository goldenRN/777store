"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import AddToCartButton from "@/components/cart/AddToCartButton";

type ProductDetail = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  stock: number;
  material: string | null;
  image_url: string | null;
  images: string[];
  category_name: string | null;
  subcategory_name: string | null;
  type_name: string | null;
  type_has_duration?: boolean;
  duration_hours?: number | null;
  created_at?: string | null;
};

export default function ProductDetailClient({ product }: { product: ProductDetail }) {
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(product.image_url || product.images[0] || null);
  const endDate = useMemo(() => {
    if (!product.created_at || !product.duration_hours) return null;
    const endMs = new Date(product.created_at).getTime() + product.duration_hours * 60 * 60 * 1000;
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date(endMs));
  }, [product.created_at, product.duration_hours]);

  const finalPrice = useMemo(
    () => (product.discount_price && product.discount_price > 0 ? product.discount_price : product.price),
    [product.discount_price, product.price]
  );

  const images = useMemo(() => {
    const list = [product.image_url, ...product.images].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [product.image_url, product.images]);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="relative h-[420px] w-full overflow-hidden rounded-xl bg-[var(--sky-100)]">
          {activeImage ? (
            <Image src={activeImage} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs font-semibold text-[var(--navy-800)]">
              Image
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {images.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                onClick={() => setActiveImage(img)}
                className={`relative h-20 w-full overflow-hidden rounded-lg bg-[var(--sky-100)] ${
                  activeImage === img ? "ring-2 ring-red-500" : ""
                }`}
              >
                <Image src={img} alt={`${product.name}-${idx}`} fill className="object-cover" />
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
          {product.discount_price && product.discount_price < product.price && (
            <span className="ml-3 text-sm text-[var(--gray-500)] line-through">
              {product.price.toLocaleString()}₮
            </span>
          )}
        </div>

        <div className="mt-4 text-sm text-[var(--gray-700)]">
          {product.description || "Тайлбар байхгүй."}
        </div>

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
          {product.type_has_duration && (
            <div>
              Дуусах огноо:{" "}
              <span className="font-semibold text-[var(--navy-900)]">
                {endDate || "тохируулгагүй"}
              </span>
            </div>
          )}
          <div>
            Үлдэгдэл: <span className="font-semibold text-[var(--navy-900)]">{product.stock}</span>
          </div>
          {product.material && (
            <div>
              Материал: <span className="font-semibold text-[var(--navy-900)]">{product.material}</span>
            </div>
          )}
        </div>

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
            qty={qty}
            className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          />
          <a href="/cart" className="rounded-full border border-black px-6 py-3 text-sm font-semibold">
            Сагс харах
          </a>
        </div>
      </div>
    </div>
  );
}
