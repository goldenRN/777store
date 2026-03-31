"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  qty: number;
  type_name?: string | null;
  variant_id?: number | null;
  variant_sku?: string | null;
  variant_label?: string | null;
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
        if (Array.isArray(parsed)) setItems(parsed);
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
      if (existing) {
        return prev.map((p) =>
          p.id === item.id && (p.variant_id ?? null) === (item.variant_id ?? null)
            ? { ...p, qty: p.qty + qty }
            : p
        );
      }
      return [...prev, { ...item, qty }];
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
        p.id === id && (p.variant_id ?? null) === variantId ? { ...p, qty: safeQty } : p
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
