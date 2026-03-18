"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data?.error ?? "Нэвтрэхэд алдаа гарлаа");
      setLoading(false);
      return;
    }

    localStorage.setItem(
      "user",
      JSON.stringify({
        id: data.id,
        name: data.name ?? null,
        username: data.name ?? data.phone ?? phone,
        phone: data.phone ?? phone,
        role: data.role ?? "user",
        token: data.token ?? "local",
      })
    );

    const nextUrl = searchParams.get("next") || "/admin/dashboard";
    router.push(nextUrl);
  };

  return (
    <div className="min-h-screen bg-[var(--sky-50)]">
      <Header />
      <main className="container mx-auto px-6 py-10">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold">Нэвтрэх</h1>
          <p className="mt-2 text-sm text-[var(--gray-700)]">
            Бүртгэлтэй утасны дугаараараа нэвтэрнэ үү.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--gray-700)]">Утасны дугаар</label>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--gray-200)] px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="9598 1441"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--gray-700)]">Нууц үг</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--gray-200)] px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-[var(--accent)]">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-black py-3 text-sm font-semibold text-white"
            >
              {loading ? "Түр хүлээнэ үү..." : "Нэвтрэх"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[var(--gray-700)]">
            Бүртгэлгүй юу?{" "}
            <Link href="/register" className="font-semibold text-black">
              Бүртгүүлэх
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
