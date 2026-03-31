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
  const resolveImageUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return url;
    return `/uploads/${url}`;
  };

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

  const bannerImage = resolveImageUrl(current.image_url || FALLBACK_IMAGE);

  return (
    <div className="relative w-full overflow-hidden bg-white shadow-2xl">
      <div className="relative h-[220px] sm:h-[320px] lg:h-[400px] w-full">
        <Image
          src={bannerImage}
          alt={current.description || "Banner"}
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent" />
      </div>

      {safeBanners.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Өмнөх"
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-[var(--navy-900)] shadow hover:bg-white"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="Дараах"
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-[var(--navy-900)] shadow hover:bg-white"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  );
}
