"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

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

      <div className="absolute inset-0 flex items-end p-10">
        <h1 className="max-w-2xl text-4xl font-bold text-[var(--gray-900)] drop-shadow">
          {current.description || "Та чанарыг мэдэр..."}
        </h1>
      </div>
    </div>
  );
}
