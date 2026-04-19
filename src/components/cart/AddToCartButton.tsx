"use client";

import { startTransition, type ReactNode } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { toast } from "@/components/ui/use-toast";

type AddToCartButtonProps = {
  id: number;
  name: string;
  price: number;
  base_price?: number;
  bulk_prices?: unknown | null;
  image_url: string | null;
  type_name?: string | null;
  variant_id?: number | null;
  variant_sku?: string | null;
  variant_label?: string | null;
  qty?: number;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  onAdded?: () => void;
};

export default function AddToCartButton({
  id,
  name,
  price,
  base_price,
  bulk_prices,
  image_url,
  type_name,
  variant_id,
  variant_sku,
  variant_label,
  qty,
  disabled,
  className,
  children,
  onAdded,
}: AddToCartButtonProps) {
  const { addItem } = useCart();

  return (
    <button
      onClick={() => {
        if (disabled) {
          toast({ title: "Захиалах тоо дууссан байна" });
          return;
        }
        // Mark cart updates as non-urgent to keep INP low on slower devices.
        startTransition(() => {
          addItem(
            {
              id,
              name,
              price,
              base_price,
              bulk_prices,
              image_url,
              type_name,
              variant_id,
              variant_sku,
              variant_label,
            },
            qty
          );
          onAdded?.();
        });
      }}
      aria-disabled={disabled}
      className={
        className ||
        `rounded-full bg-black py-2 text-sm font-semibold text-white ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`
      }
    >
      {children ?? "Сагсанд хийх"}
    </button>
  );
}
