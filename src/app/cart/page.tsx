"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CartPage() {
  const { items, total, updateQty, removeItem, clear } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const user = (() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      return JSON.parse(raw) as { id?: string; name?: string; phone?: string };
    } catch {
      return null;
    }
  })();

  const handleCheckout = async () => {
    if (!user?.id) {
      router.push("/login?next=/cart");
      return;
    }
    if (items.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: user.name || user.phone || "Хэрэглэгч",
          phone: user.phone || "0000-0000",
          items: items.map((it) => ({
            name: it.name,
            price: it.price,
            qty: it.qty,
            image_url: it.image_url,
          })),
        }),
      });
      if (!res.ok) {
        return;
      }
      clear();
      router.push("/orders?status=ALL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <main className="container mx-auto px-6 py-10 flex-1">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Сагс</h1>
            {items.length > 0 && (
              <button onClick={clear} className="text-xs text-red-600">
                Сагс хоослох
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="mt-6 text-sm text-[var(--gray-500)]">Сагс хоосон байна.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-xl border p-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-[var(--sky-100)]">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="text-xs text-[var(--gray-500)]">
                      {Number(item.price).toLocaleString()}₮
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="h-8 w-8 rounded-full border text-sm"
                    >
                      -
                    </button>
                    <div className="w-8 text-center text-sm">{item.qty}</div>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="h-8 w-8 rounded-full border text-sm"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-24 text-right text-sm font-semibold">
                    {(item.price * item.qty).toLocaleString()}₮
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-xs text-red-600">
                    Устгах
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between border-t pt-4 text-sm font-semibold">
                <div>Нийт дүн</div>
                <div>{total.toLocaleString()}₮</div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? "Захиалга үүсгэж байна..." : "Захиалга үүсгэх"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
