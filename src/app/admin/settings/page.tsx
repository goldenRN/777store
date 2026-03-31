
"use client";

import { useEffect, useState } from "react";
import BackButton from "@/components/BackButton";
import ChangePassword from "@/components/settings/changePassword";

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    working_hours: "",
    phone: "",
    email: "",
    facebook_url: "",
    address: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/store-info");
        const data = await res.json();
        setForm({
          working_hours: data?.working_hours ?? "",
          phone: data?.phone ?? "",
          email: data?.email ?? "",
          facebook_url: data?.facebook_url ?? "",
          address: data?.address ?? "",
        });
      } catch {
        setError("Мэдээлэл уншихад алдаа гарлаа");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/store-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.message ?? "Хадгалахад алдаа гарлаа");
        setSaving(false);
        return;
      }
      setMessage("Амжилттай хадгалагдлаа.");
    } catch {
      setError("Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-[calc(100vw-300px)]">
      <div className="flex justify-between items-center px-4 py-2 bg-white sticky top-0 z-10">
        <BackButton text="Буцах" link="/admin/dashboard" />
      </div>

      <div className="overflow-x-auto px-4 pb-10">
        <div className="mt-4 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold">Дэлгүүрийн мэдээлэл</h2>
          {loading ? (
            <div className="mt-4 text-sm text-[var(--gray-500)]">Уншиж байна...</div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-[var(--gray-700)]">Ажлын цаг</label>
                <input
                  value={form.working_hours}
                  onChange={(e) => setForm({ ...form, working_hours: e.target.value })}
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="09:00 - 21:00"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--gray-700)]">Утас</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="7777-7777"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--gray-700)]">И-мэйл</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="info@777.mn"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--gray-700)]">Facebook холбоос</label>
                <input
                  value={form.facebook_url}
                  onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-[var(--gray-700)]">Хаяг</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-2 min-h-[120px] w-full rounded-xl border px-4 py-3 text-sm"
                  placeholder="Улаанбаатар хот, ..."
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-black md:col-span-2">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-xl bg-green-50 px-4 py-2 text-xs font-semibold text-black md:col-span-2">
                  {message}
                </div>
              )}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-black px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <ChangePassword />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
