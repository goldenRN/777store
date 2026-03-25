"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Banner = {
  id: number;
  description: string | null;
  image_url: string | null;
};

type BannerSliderProps = {
  banners: Banner[];
  intervalMs?: number;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=60";

export default function BannerSlider({ banners, intervalMs = 5000 }: BannerSliderProps) {
  const safeBanners = useMemo(
    () =>
      banners.length > 0
        ? banners
        : [{ id: 0, description: "Шинэ бараануудтай танилцаарай", image_url: FALLBACK_IMAGE }],
    [banners]
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (safeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % safeBanners.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [safeBanners.length, intervalMs]);

  const current = safeBanners[index];

  const goPrev = () => {
    setIndex((prev) => (prev - 1 + safeBanners.length) % safeBanners.length);
  };

  const goNext = () => {
    setIndex((prev) => (prev + 1) % safeBanners.length);
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-white shadow-2xl">
      <div className="relative h-[360px] w-full">
        <Image
          src={current.image_url || FALLBACK_IMAGE}
          alt={current.description || "Banner"}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffe1b3]/70 via-white/40 to-white/80" />
      </div>

      <div className="absolute inset-0 flex flex-col justify-between p-10">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-xs font-semibold text-[var(--navy-800)] shadow">
          🛵 Мото бараа
        </div>

        <div>
          <h1 className="text-3xl font-bold text-[var(--gray-900)]">
            {current.description || "Та чанарыг мэдэр..."}
          </h1>
          <p className="mt-3 max-w-sm text-sm text-[var(--gray-700)]">
            100% оригинал бараа, бодит зураг, шуурхай хүргэлттэй.
          </p>
          <button className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--navy-900)] shadow">
            Цааш үзэх →
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={goPrev}
            className="rounded-full bg-white/90 p-2 text-[var(--navy-900)] shadow hover:bg-white"
            aria-label="Өмнөх баннер"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            {safeBanners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setIndex(i)}
                className={`h-2 w-2 rounded-full ${i === index ? "bg-[var(--navy-900)]" : "bg-white/70"}`}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={goNext}
            className="rounded-full bg-white/90 p-2 text-[var(--navy-900)] shadow hover:bg-white"
            aria-label="Дараах баннер"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
