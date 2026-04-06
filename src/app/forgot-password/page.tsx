"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      setMessage(json?.message || "Хүсэлт амжилттай");
      if (json?.resetUrl) {
        setMessage(`SMTP тохируулаагүй байна. Линк: ${json.resetUrl}`);
      }
    } catch {
      setMessage("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-xl font-bold">Нууц үг сэргээх</h1>
        <p className="mt-2 text-sm text-[var(--gray-500)]">
          Бүртгэлтэй имэйлээ оруулна уу. Сэргээх холбоос илгээгдэнэ.
        </p>
        <div className="mt-4">
          <label className="text-sm text-gray-600">Имэйл</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="name@example.com"
            type="email"
            required
          />
        </div>
        {message && <div className="mt-3 text-sm text-[var(--gray-600)]">{message}</div>}
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="px-4 py-2 rounded border"
          >
            Буцах
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            Илгээх
          </button>
        </div>
      </form>
    </div>
  );
}
