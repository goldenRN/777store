"use client";

import { useEffect, useMemo, useState } from "react";
import { getActorHeaders } from "@/lib/actorHeaders";
import { Plus, Save, Trash2 } from "lucide-react";

type District = { id: number; name: string; sort_order: number };
type Khoroo = { id: number; district_id: number; name: string; zone: string; fee: number };

export default function DeliveryAreasPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [khoroos, setKhoroos] = useState<Khoroo[]>([]);
  const [loading, setLoading] = useState(false);
  const [kLoading, setKLoading] = useState(false);

  const [newDistrictName, setNewDistrictName] = useState("");
  const [newDistrictSort, setNewDistrictSort] = useState("0");

  const [newKhorooName, setNewKhorooName] = useState("");
  const [newKhorooZone, setNewKhorooZone] = useState<"Ойр" | "Хол">("Ойр");
  const [newKhorooFee, setNewKhorooFee] = useState("");

  const fetchDistricts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/delivery/district");
      const json = await res.json();
      const list = Array.isArray(json) ? (json as District[]) : [];
      setDistricts(list);
      if (!selectedDistrictId && list.length > 0) setSelectedDistrictId(list[0].id);
    } finally {
      setLoading(false);
    }
  };

  const fetchKhoroos = async (districtId: number | null) => {
    if (!districtId) {
      setKhoroos([]);
      return;
    }
    setKLoading(true);
    try {
      const url = new URL("/api/delivery/khoroo", window.location.origin);
      url.searchParams.set("district_id", String(districtId));
      const res = await fetch(url.toString());
      const json = await res.json();
      setKhoroos(Array.isArray(json) ? (json as Khoroo[]) : []);
    } finally {
      setKLoading(false);
    }
  };

  useEffect(() => {
    fetchDistricts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchKhoroos(selectedDistrictId);
  }, [selectedDistrictId]);

  const selectedDistrict = useMemo(
    () => districts.find((d) => d.id === selectedDistrictId) ?? null,
    [districts, selectedDistrictId]
  );

  const createDistrict = async () => {
    const name = newDistrictName.trim();
    if (!name) return;
    const sortRaw = newDistrictSort.trim();
    const sort_order = Number.isFinite(Number(sortRaw)) ? Math.floor(Number(sortRaw)) : 0;
    await fetch("/api/delivery/district", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getActorHeaders() },
      body: JSON.stringify({ name, sort_order }),
    });
    setNewDistrictName("");
    setNewDistrictSort("0");
    await fetchDistricts();
  };

  const saveDistrict = async (d: District) => {
    await fetch(`/api/delivery/district/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getActorHeaders() },
      body: JSON.stringify({ name: d.name, sort_order: d.sort_order }),
    });
    await fetchDistricts();
  };

  const deleteDistrict = async (id: number) => {
    if (!confirm("Дүүргийг устгах уу? (холбогдсон хороонууд хамт устна)")) return;
    await fetch(`/api/delivery/district/${id}`, {
      method: "DELETE",
      headers: { ...getActorHeaders() },
    });
    setSelectedDistrictId(null);
    await fetchDistricts();
  };

  const createKhoroo = async () => {
    if (!selectedDistrictId) return;
    const name = newKhorooName.trim();
    if (!name) return;
    const fee = Number(newKhorooFee || 0);
    await fetch("/api/delivery/khoroo", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getActorHeaders() },
      body: JSON.stringify({
        district_id: selectedDistrictId,
        name,
        zone: newKhorooZone,
        fee,
      }),
    });
    setNewKhorooName("");
    setNewKhorooFee("");
    setNewKhorooZone("Ойр");
    await fetchKhoroos(selectedDistrictId);
  };

  const saveKhoroo = async (k: Khoroo) => {
    await fetch(`/api/delivery/khoroo/${k.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getActorHeaders() },
      body: JSON.stringify({ name: k.name, zone: k.zone, fee: k.fee }),
    });
    await fetchKhoroos(selectedDistrictId);
  };

  const deleteKhoroo = async (id: number) => {
    if (!confirm("Хороог устгах уу?")) return;
    await fetch(`/api/delivery/khoroo/${id}`, {
      method: "DELETE",
      headers: { ...getActorHeaders() },
    });
    await fetchKhoroos(selectedDistrictId);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Хүргэлтийн бүс</h1>
        <button
          onClick={() => {
            fetchDistricts();
            fetchKhoroos(selectedDistrictId);
          }}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border bg-white p-4">
          <div className="mb-3 text-sm font-semibold">Дүүргүүд</div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_90px_40px] gap-2">
              <input
                value={newDistrictName}
                onChange={(e) => setNewDistrictName(e.target.value)}
                placeholder="Шинэ дүүргийн нэр"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={newDistrictSort}
                onChange={(e) => setNewDistrictSort(e.target.value)}
                placeholder="Эрэмбэ"
                className="rounded-lg border px-3 py-2 text-sm"
                type="number"
                inputMode="numeric"
              />
              <button
                onClick={createDistrict}
                className="inline-flex items-center justify-center rounded-lg border px-3 py-2 hover:bg-gray-50"
                title="Нэмэх"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="text-sm text-gray-500">Ачаалж байна...</div>
            ) : districts.length === 0 ? (
              <div className="text-sm text-gray-500">Дүүрэг алга.</div>
            ) : (
              <div className="space-y-2">
                {districts.map((d) => {
                  const active = d.id === selectedDistrictId;
                  return (
                    <div
                      key={d.id}
                      className={`rounded-xl border p-3 ${active ? "border-[var(--accent-2)] bg-[var(--sky-50)]" : "bg-white"}`}
                    >
                      <button
                        onClick={() => setSelectedDistrictId(d.id)}
                        className="w-full text-left"
                      >
                        <div className="text-sm font-semibold">{d.name}</div>
                      </button>
                      <div className="mt-2 grid grid-cols-[1fr_90px] gap-2">
                        <input
                          value={d.name}
                          onChange={(e) =>
                            setDistricts((prev) =>
                              prev.map((x) => (x.id === d.id ? { ...x, name: e.target.value } : x))
                            )
                          }
                          className="rounded-lg border px-3 py-2 text-xs"
                        />
                        <input
                          value={Number.isFinite(Number(d.sort_order)) ? String(d.sort_order) : "0"}
                          onChange={(e) =>
                            setDistricts((prev) =>
                              prev.map((x) =>
                                x.id === d.id
                                  ? {
                                      ...x,
                                      sort_order: (() => {
                                        const raw = e.target.value.trim();
                                        const n = raw === "" ? 0 : Number(raw);
                                        return Number.isFinite(n) ? Math.floor(n) : 0;
                                      })(),
                                    }
                                  : x
                              )
                            )
                          }
                          className="rounded-lg border px-3 py-2 text-xs"
                          type="number"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => saveDistrict(d)}
                          className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs hover:bg-gray-50"
                          title="Хадгалах"
                        >
                          <Save className="h-4 w-4" />
                          Хадгалах
                        </button>
                        <button
                          onClick={() => deleteDistrict(d.id)}
                          className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                          title="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Хороонууд</div>
              <div className="text-xs text-gray-500">
                {selectedDistrict ? `Дүүрэг: ${selectedDistrict.name}` : "Дүүрэг сонгоно уу"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_120px_40px]">
            <input
              value={newKhorooName}
              onChange={(e) => setNewKhorooName(e.target.value)}
              placeholder="Шинэ хороо"
              className="rounded-lg border px-3 py-2 text-sm"
              disabled={!selectedDistrictId}
            />
            <select
              value={newKhorooZone}
              onChange={(e) => setNewKhorooZone(e.target.value as any)}
              className="rounded-lg border px-3 py-2 text-sm"
              disabled={!selectedDistrictId}
            >
              <option value="Ойр">Ойр</option>
              <option value="Хол">Хол</option>
            </select>
            <input
              value={newKhorooFee}
              onChange={(e) => setNewKhorooFee(e.target.value)}
              placeholder="Үнэ (₮)"
              className="rounded-lg border px-3 py-2 text-sm"
              disabled={!selectedDistrictId}
            />
            <button
              onClick={createKhoroo}
              className="inline-flex items-center justify-center rounded-lg border px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
              disabled={!selectedDistrictId}
              title="Нэмэх"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            {kLoading ? (
              <div className="text-sm text-gray-500">Ачаалж байна...</div>
            ) : khoroos.length === 0 ? (
              <div className="text-sm text-gray-500">Хороо алга.</div>
            ) : (
              <div className="overflow-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Нэр</th>
                      <th className="px-3 py-2 text-left">Ойр/Хол</th>
                      <th className="px-3 py-2 text-left">Үнэ (₮)</th>
                      <th className="px-3 py-2 text-right">Үйлдэл</th>
                    </tr>
                  </thead>
                  <tbody>
                    {khoroos.map((k) => (
                      <tr key={k.id} className="border-t">
                        <td className="px-3 py-2">
                          <input
                            value={k.name}
                            onChange={(e) =>
                              setKhoroos((prev) =>
                                prev.map((x) => (x.id === k.id ? { ...x, name: e.target.value } : x))
                              )
                            }
                            className="w-full rounded-lg border px-3 py-2 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={k.zone}
                            onChange={(e) =>
                              setKhoroos((prev) =>
                                prev.map((x) => (x.id === k.id ? { ...x, zone: e.target.value } : x))
                              )
                            }
                            className="rounded-lg border px-3 py-2 text-xs"
                          >
                            <option value="Ойр">Ойр</option>
                            <option value="Хол">Хол</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={String(k.fee ?? 0)}
                            onChange={(e) =>
                              setKhoroos((prev) =>
                                prev.map((x) =>
                                  x.id === k.id ? { ...x, fee: Number(e.target.value || 0) } : x
                                )
                              )
                            }
                            className="w-full rounded-lg border px-3 py-2 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => saveKhoroo(k)}
                              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs hover:bg-gray-50"
                              title="Хадгалах"
                            >
                              <Save className="h-4 w-4" />
                              Хадгалах
                            </button>
                            <button
                              onClick={() => deleteKhoroo(k.id)}
                              className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                              title="Устгах"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
