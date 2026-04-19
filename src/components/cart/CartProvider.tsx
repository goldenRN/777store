"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getBulkUnitPrice } from "@/lib/bulkPricing";

export type CartItem = {
  id: number;
  name: string;
  // current unit price (can change when qty changes if bulk pricing is enabled)
  price: number;
  // base unit price before bulk tiers are applied
  base_price?: number;
  image_url: string | null;
  qty: number;
  type_name?: string | null;
  variant_id?: number | null;
  variant_sku?: string | null;
  variant_label?: string | null;
  bulk_prices?: unknown | null;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (id: number, variantId?: number | null) => void;
  updateQty: (id: number, qty: number, variantId?: number | null) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "cart_items";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) {
          // back-compat: older carts may not have base_price/bulk_prices
          setItems(
            parsed.map((it) => ({
              ...it,
              base_price: Number((it as any).base_price ?? it.price ?? 0) || 0,
              bulk_prices: (it as any).bulk_prices ?? null,
              price: Number(it.price ?? 0) || 0,
              qty: Math.max(1, Math.floor(Number(it.qty ?? 1))),
            }))
          );
        }
      }
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    fetch("/api/public/products/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: items.map((i) => i.id) }),
    })
      .then((r) => r.json())
      .then((data) => {
        const closedIds = new Set(
          Array.isArray(data?.items)
            ? data.items.filter((it: any) => it.closed).map((it: any) => it.id)
            : []
        );
        if (closedIds.size > 0) {
          setItems((prev) => prev.filter((p) => !closedIds.has(p.id)));
        }
      })
      .catch(() => null);
  }, [items.length]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items]);

  const addItem = (item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find(
        (p) => p.id === item.id && (p.variant_id ?? null) === (item.variant_id ?? null)
      );
      const addQty = Math.max(1, Math.floor(Number(qty || 1)));
      if (existing) {
        const nextQty = Math.max(1, existing.qty + addQty);
        const basePrice = Number((existing as any).base_price ?? existing.price ?? 0) || 0;
        const tiers = (existing as any).bulk_prices ?? null;
        const nextUnit = tiers ? getBulkUnitPrice(basePrice, nextQty, tiers) : existing.price;
        return prev.map((p) =>
          p.id === item.id && (p.variant_id ?? null) === (item.variant_id ?? null)
            ? { ...p, qty: nextQty, price: nextUnit, base_price: basePrice, bulk_prices: tiers }
            : p
        );
      }
      const basePrice = Number((item as any).base_price ?? item.price ?? 0) || 0;
      const tiers = (item as any).bulk_prices ?? null;
      const unit = tiers ? getBulkUnitPrice(basePrice, addQty, tiers) : Number(item.price ?? 0) || 0;
      return [
        ...prev,
        {
          ...item,
          qty: addQty,
          base_price: basePrice,
          bulk_prices: tiers,
          price: unit,
        },
      ];
    });
  };

  const removeItem = (id: number, variantId: number | null = null) => {
    setItems((prev) =>
      prev.filter((p) => !(p.id === id && (p.variant_id ?? null) === variantId))
    );
  };

  const updateQty = (id: number, qty: number, variantId: number | null = null) => {
    const safeQty = Math.max(1, Math.floor(qty));
    setItems((prev) =>
      prev.map((p) =>
        p.id === id && (p.variant_id ?? null) === variantId
          ? (() => {
              const basePrice = Number((p as any).base_price ?? p.price ?? 0) || 0;
              const tiers = (p as any).bulk_prices ?? null;
              const nextUnit = tiers ? getBulkUnitPrice(basePrice, safeQty, tiers) : p.price;
              return { ...p, qty: safeQty, price: nextUnit, base_price: basePrice, bulk_prices: tiers };
            })()
          : p
      )
    );
  };

  const clear = () => setItems([]);

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const total = useMemo(() => items.reduce((sum, i) => sum + i.price * i.qty, 0), [items]);

  const value: CartContextValue = {
    items,
    count,
    total,
    addItem,
    removeItem,
    updateQty,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
