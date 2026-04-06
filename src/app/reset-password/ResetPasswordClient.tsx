"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirm) {
      setMessage("Нууц үг таарахгүй байна");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json?.message || "Алдаа гарлаа");
        return;
      }
      setMessage("Нууц үг амжилттай шинэчлэгдлээ. Нэвтрэх хуудас руу шилжинэ...");
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setMessage("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-xl font-bold">Шинэ нууц үг</h1>
        <p className="mt-2 text-sm text-[var(--gray-500)]">Шинэ нууц үгээ оруулна уу.</p>
        <div className="mt-4">
          <label className="text-sm text-gray-600">Шинэ нууц үг</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            type="password"
            required
          />
        </div>
        <div className="mt-4">
          <label className="text-sm text-gray-600">Дахин бичих</label>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            type="password"
            required
          />
        </div>
        {message && <div className="mt-3 text-sm text-[var(--gray-600)]">{message}</div>}
        <div className="mt-6">
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            Шинэчлэх
          </button>
        </div>
      </form>
    </div>
  );
}
