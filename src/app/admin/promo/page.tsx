"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Promo = {
  badge: string;
  title: string;
  subtitle: string;
};

const DEFAULT_PROMO: Promo = {
  badge: "Онцгой хямдрал",
  title: "LIVE бараа шинэчлэгдлээ",
  subtitle: "24 цагийн дотор дуусах hot deal.",
};

export default function PromoPage() {
  const [form, setForm] = useState<Promo>(DEFAULT_PROMO);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/promo`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          badge: data?.badge ?? DEFAULT_PROMO.badge,
          title: data?.title ?? DEFAULT_PROMO.title,
          subtitle: data?.subtitle ?? DEFAULT_PROMO.subtitle,
        });
      })
      .catch(() => setForm(DEFAULT_PROMO));
  }, []);

  const handleChange =
    (key: keyof Promo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/promo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      alert("Амжилттай хадгаллаа");
    } catch (err) {
      console.error(err);
      alert("Хадгалах үед алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[calc(100vw-300px)] p-4">
      <div className="mb-4 rounded-2xl bg-white p-4 shadow">
        <h2 className="text-xl font-bold">Онцгой хямдралын текст</h2>
        <p className="text-sm text-muted-foreground">Нүүр хуудсан дээрх хар блокийн текстүүд.</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow space-y-4 max-w-2xl">
        <div>
          <Label>Дээд жижиг гарчиг</Label>
          <Input value={form.badge} onChange={handleChange("badge")} className="h-11" />
        </div>
        <div>
          <Label>Гарчиг</Label>
          <Input value={form.title} onChange={handleChange("title")} className="h-11" />
        </div>
        <div>
          <Label>Тайлбар</Label>
          <Textarea value={form.subtitle} onChange={handleChange("subtitle")} rows={3} />
        </div>
        <Button onClick={handleSave} disabled={loading} className="h-11 px-6">
          {loading ? "Хадгалж байна..." : "Хадгалах"}
        </Button>
      </div>
    </div>
  );
}
