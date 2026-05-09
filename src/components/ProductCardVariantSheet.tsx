"use client";

import { X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { getVariantLabel } from "@/lib/variantLabel";
import { getMediaThumbUrl, resolveMediaUrl } from "@/lib/media";

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

export default function ProductCardVariantSheet({
  open,
  name,
  imageUrl,
  variants,
  finalPrice,
  variantError,
  onClose,
  onSelect,
}: {
  open: boolean;
  name: string;
  imageUrl: string | null;
  variants: Variant[];
  finalPrice: number;
  variantError: string | null;
  onClose: () => void;
  onSelect: (variant: Variant) => void;
}) {
  if (!open) return null;

  const variantLabel = (variant: Variant) => getVariantLabel(variant.attribute, variant.sku, variant.id);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-[360px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <div className="text-sm font-semibold">Төрөл сонгох</div>
            <div className="text-xs text-[var(--gray-500)]">{name}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="h-[calc(100%-64px)] space-y-3 overflow-auto p-4">
          {variantError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {variantError}
            </div>
          )}
          {variants.length === 0 ? (
            <div className="text-xs text-[var(--gray-500)]">Төрөл олдсонгүй.</div>
          ) : (
            variants.map((variant) => {
              const variantImage = variant.images?.[0]?.image_url || imageUrl;
              const variantPrice = variant.price != null ? Number(variant.price) : finalPrice;
              const stockNumber = Number(variant.stock || 0);
              const remaining =
                stockNumber > 0 ? Math.max(0, stockNumber - Number(variant.ordered_qty || 0)) : null;
              const statusClosed = variant.order_accept_status === "CLOSED";
              const closed = statusClosed || (stockNumber > 0 && remaining != null && remaining <= 0);

              return (
                <button
                  key={variant.id}
                  onClick={() => {
                    if (closed) {
                      toast({
                        title: statusClosed ? "Захиалга хаагдсан байна" : "Захиалах тоо дууссан байна",
                      });
                      return;
                    }
                    onSelect(variant);
                  }}
                  className={`w-full rounded-xl border p-3 text-left hover:border-[var(--accent-2)] ${
                    closed ? "cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg border bg-[var(--sky-100)]">
                      {variantImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(getMediaThumbUrl(variantImage))}
                          alt={variant.sku || "Төрөл"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            const fallback = resolveMediaUrl(variantImage);
                            if (img.src !== fallback) img.src = fallback;
                            else img.src = "/logo.png";
                            img.onerror = null;
                          }}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src="/logo.png" alt="Logo" className="h-full w-full object-contain p-2 opacity-80" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-[var(--navy-900)]">
                        {variant.sku || `Төрөл-${variant.id}`}
                      </div>
                      <div className="text-[10px] text-[var(--gray-500)]">{variantLabel(variant)}</div>
                      <div className="mt-1 text-xs font-semibold text-red-500">
                        {variantPrice.toLocaleString()}₮
                      </div>
                      {closed && (
                        <div className="mt-1 inline-flex rounded-full bg-white/65 px-2 py-0.5 text-[10px] font-semibold text-red-600 backdrop-blur-[2px]">
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
  );
}
