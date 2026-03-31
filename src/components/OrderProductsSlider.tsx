"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type SliderItem = {
  id: number;
  name: string;
  image_url: string | null;
};

type OrderProductsSliderProps = {
  items: SliderItem[];
  intervalMs?: number;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60";

export default function OrderProductsSlider({ items, intervalMs = 4000 }: OrderProductsSliderProps) {
  const safeItems = useMemo(
    () =>
      items.length > 0
        ? items
        : [{ id: 0, name: "Захиалгатай бараанууд", image_url: FALLBACK_IMAGE }],
    [items]
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (safeItems.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % safeItems.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [safeItems.length, intervalMs]);

  const current = safeItems[index];

  return (
    <div className="rounded-[24px] bg-white p-3 shadow">
      <div className="relative h-[220px] w-full overflow-hidden rounded-[18px]">
        <Image
          src={current.image_url || FALLBACK_IMAGE}
          alt={current.name || "Product"}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white drop-shadow">
          {current.name}
        </div>
      </div>
      {safeItems.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {safeItems.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full ${i === index ? "bg-[var(--navy-900)]" : "bg-[var(--gray-300)]"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
