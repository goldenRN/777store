"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type LocalUser = {
  id?: string;
  name?: string;
  phone?: string;
  role?: string;
};

export default function ProfilePage() {
  const localUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      return JSON.parse(raw) as LocalUser;
    } catch {
      return null;
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!localUser?.id) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/users/${localUser.id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data?.message ?? "Мэдээлэл уншихад алдаа гарлаа");
          return;
        }
        const u = data?.user ?? {};
        setName(u.name ?? "");
        setEmail(u.email ?? "");
        setAddress(u.address ?? "");
        setPhone(u.phone ?? "");
        setAvatarUrl(u.avatarUrl ?? "");
      } catch {
        setError("Мэдээлэл уншихад алдаа гарлаа");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [localUser?.id]);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSave = async () => {
    if (!localUser?.id) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      let nextAvatarUrl = avatarUrl;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        const uploadRes = await fetch(`/api/users/${localUser.id}/avatar`, {
          method: "POST",
          body: form,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadData?.message ?? "Зураг хадгалахад алдаа гарлаа");
          setSaving(false);
          return;
        }
        nextAvatarUrl = uploadData?.url ?? nextAvatarUrl;
        setAvatarUrl(nextAvatarUrl);
      }

      const res = await fetch(`/api/users/${localUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          address,
          avatarUrl: nextAvatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? "Хадгалахад алдаа гарлаа");
        setSaving(false);
        return;
      }

      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        localStorage.setItem(
          "user",
          JSON.stringify({ ...parsed, name, phone, avatarUrl: nextAvatarUrl })
        );
      }

      setMessage("Мэдээлэл амжилттай хадгалагдлаа.");
      setFile(null);
    } catch {
      setError("Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sky-50)] flex flex-col">
      <Header />
      <main className="container mx-auto px-6 py-10 flex-1">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="text-lg font-bold">Хэрэглэгчийн мэдээлэл</div>
          {!localUser ? (
            <div className="mt-4 text-sm text-[var(--gray-500)]">
              Нэвтрээгүй байна.
            </div>
          ) : loading ? (
            <div className="mt-4 text-sm text-[var(--gray-500)]">
              Уншиж байна...
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[220px,1fr]">
              <div>
                <div className="h-40 w-40 overflow-hidden rounded-2xl border bg-[var(--sky-50)]">
                  {preview || avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview || avatarUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[var(--gray-500)]">
                      Зураггүй
                    </div>
                  )}
                </div>
                <label className="mt-3 block text-xs font-semibold text-[var(--gray-700)]">
                  Зураг оруулах
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full rounded-xl border border-[var(--gray-200)] px-3 py-2 text-xs"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--gray-700)]">
                    Нэр
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--gray-200)] px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Нэр"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--gray-700)]">
                    Утас
                  </label>
                  <input
                    value={phone}
                    readOnly
                    className="mt-2 w-full rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3 text-sm text-[var(--gray-600)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--gray-700)]">
                    И-мэйл
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--gray-200)] px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--gray-700)]">
                    Гэрийн хаяг
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-2 min-h-[120px] w-full rounded-xl border border-[var(--gray-200)] px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Хаяг оруулна уу"
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-black">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="rounded-xl bg-green-50 px-4 py-2 text-xs font-semibold text-black">
                    {message}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Хадгалж байна..." : "Хадгалах"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
