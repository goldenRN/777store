"use client";

import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import BackButton from "@/components/BackButton";
import { getActorHeaders } from "@/lib/actorHeaders";

type PaymentMethod = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
};

const emptyForm = { name: "", description: "", is_active: true };

export default function PaymentMethodsPage() {
  const [list, setList] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/payment-methods`);
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openAdd = () => {
    setEdit(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (item: PaymentMethod) => {
    setEdit(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      is_active: item.is_active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      is_active: Boolean(form.is_active),
    };
    if (!payload.name) {
      alert("Нэр шаардлагатай");
      return;
    }

    try {
      const base = `${process.env.NEXT_PUBLIC_API_URL || ""}/api/payment-methods`;
      const url = edit ? `${base}/${edit.id}` : base;
      const method = edit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getActorHeaders(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Алдаа гарлаа");
      }
      setOpen(false);
      await fetchList();
    } catch (err: any) {
      alert(err?.message || "Алдаа гарлаа");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Устгах уу?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/payment-methods/${id}`, {
        method: "DELETE",
        headers: getActorHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Алдаа гарлаа");
      }
      await fetchList();
    } catch (err: any) {
      alert(err?.message || "Алдаа гарлаа");
    }
  };

  return (
    <div className="w-full p-4 md:p-6">
      <div className="flex justify-between items-center bg-white sticky top-0 z-10 p-2 mb-4">
        <BackButton text="Буцах" link="/admin/dashboard" />
        <button
          className="bg-yellow-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded text-xs flex items-center gap-2"
          onClick={openAdd}
        >
          <Plus size={15} /> Нэмэх
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Нэр</th>
              <th className="p-3 text-left">Тайлбар</th>
              <th className="p-3 text-left">Идэвхтэй</th>
              <th className="p-3 text-left">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-4 text-center">Уншиж байна...</td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center">Мэдээлэл алга</td>
              </tr>
            ) : (
              list.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{item.description ?? "-"}</td>
                  <td className="p-3">{item.is_active ? "Тийм" : "Үгүй"}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-2 rounded bg-blue-600 text-white"
                        title="Засах"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded bg-red-600 text-white"
                        title="Устгах"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Төлбөрийн төрөл">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{edit ? "Засах" : "Нэмэх"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Нэр</label>
              <input
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="mt-1 w-full border rounded px-3 py-2"
                placeholder="Ж: Бэлэн мөнгө, Лизинг, Зээл..."
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Идэвхтэй</label>
              <select
                value={form.is_active ? "true" : "false"}
                onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.value === "true" }))}
                className="mt-1 w-full border rounded px-3 py-2"
              >
                <option value="true">Тийм</option>
                <option value="false">Үгүй</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Тайлбар</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              className="mt-1 w-full border rounded px-3 py-2 min-h-[120px]"
              placeholder="Нэмэлт тайлбар..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded border">
              Болих
            </button>
            <button onClick={handleSave} className="px-4 py-2 rounded bg-black text-white">
              Хадгалах
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
