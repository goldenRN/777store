"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Нууц үг таарахгүй байна");
      setLoading(false);
      return;
    }

    if (!acceptedTerms) {
      setError("Үйлчилгээний нөхцөлийг зөвшөөрнө үү");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error ?? "Бүртгэл үүсгэхэд алдаа гарлаа");
      setLoading(false);
      return;
    }

    router.push("/login");
  };

  return (
    <main className="container mx-auto px-6 py-10">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold">Бүртгүүлэх</h1>
          <p className="mt-2 text-sm text-[var(--gray-700)]">
            Шинэ хэрэглэгчийн бүртгэл үүсгэнэ үү.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--gray-700)]">Нэр</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--gray-200)] px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="Нэр"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--gray-700)]">Имэйл</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--gray-200)] px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="name@example.com"
              />
            </div>
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
            <div>
              <label className="text-xs font-semibold text-[var(--gray-700)]">Нууц үг давтах</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--gray-200)] px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="••••••••"
                required
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--gray-700)]">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="h-4 w-4 rounded border border-[var(--gray-300)]"
              />
              <span>
                <Link href="/terms" className="font-semibold text-black">
                  Үйлчилгээний нөхцөл
                </Link>
                -ийг зөвшөөрч байна.
              </span>
            </label>
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
              {loading ? "Түр хүлээнэ үү..." : "Бүртгүүлэх"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[var(--gray-700)]">
            Аль хэдийн бүртгэлтэй юу?{" "}
            <Link href="/login" className="font-semibold text-black">
              Нэвтрэх
            </Link>
          </p>
      </div>
    </main>
  );
}
