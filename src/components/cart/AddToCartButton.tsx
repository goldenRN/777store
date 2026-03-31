"use client";

import type { ReactNode } from "react";
import { useCart } from "@/components/cart/CartProvider";

type AddToCartButtonProps = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  type_name?: string | null;
  qty?: number;
  className?: string;
  children?: ReactNode;
  onAdded?: () => void;
};

export default function AddToCartButton({
  id,
  name,
  price,
  image_url,
  type_name,
  qty,
  className,
  children,
  onAdded,
}: AddToCartButtonProps) {
  const { addItem } = useCart();

  return (
    <button
      onClick={() => {
        addItem({ id, name, price, image_url, type_name }, qty);
        onAdded?.();
      }}
      className={className || "rounded-full bg-black py-2 text-sm font-semibold text-white"}
    >
      {children ?? "Сагсанд хийх"}
    </button>
  );
}
