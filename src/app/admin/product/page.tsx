'use client'
import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RefreshCcw, Edit, Trash2, Plus } from "lucide-react";
import AddProductModal from "./AddProductModal";
import axios from "axios";
import { getActorHeaders } from "@/lib/actorHeaders";
import ImageViewerModal from "./ImageViewerModal";
import ProductVariantModal from "./ProductVariantModal"; 

interface Product {
  id: number;
  name: string;
  description: string;
  category_name: string;
  subcategory_name: string;
  brand_name: string;
  unit_name: string;
  type_name: string;
  price: number;
  discount_price?: number | null;
  stock: number;
  arrival_status?: string | null;
  cargo_fee?: number | null;
  ordered_qty?: number | null;
  order_accept_status?: string | null;
  category_id?: number | null;
  subcategory_id?: number | null;
  brand_id?: number | null;
  unit_id?: number | null;
  type_id?: number | null;
  created_at: string;
  duration_hours?: number | null;
  image_urls?: string[];
}

const ProductPage = () => {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof Product>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Product | null>(null);
  const [statusChoice, setStatusChoice] = useState<"OPEN" | "CLOSED" | "WAITING" | "ARRIVED">("OPEN");
  const [cargoInput, setCargoInput] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // ✅ Variant modal states
  const [variantOpen, setVariantOpen] = useState(false);
  const [variantProductId, setVariantProductId] = useState<number | null>(null);
  const [variantProductName, setVariantProductName] = useState<string | null>(null);
  const typeFilter = searchParams.get("type");
  const initialType =
    typeFilter === "ready" || typeFilter === "preorder" || typeFilter === "live" ? typeFilter : null;
  const discountFilter = searchParams.get("discount") === "true";
  const closedFilter = searchParams.get("closed") === "true";
  const isPreorderLive = typeFilter === "preorder" || typeFilter === "live";
  const colSpan = isPreorderLive ? 10 : 11;

  const titleLabel = (() => {
    if (closedFilter) return "Хаагдсан бараа";
    if (discountFilter) return "Хямдралтай бараа";
    if (typeFilter === "ready") return "Бэлэн бараа";
    if (typeFilter === "preorder") return "Захиалгын бараа";
    if (typeFilter === "live") return "Лайвын бараа";
    return "Бараа бүртгэл";
  })();

  const openVariantModal = (productId: number, productName: string) => {
    setVariantProductId(productId);
    setVariantProductName(productName);
    setVariantOpen(true);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/product`);
      setProducts(res.data);
    } catch (err) {
      console.error("Бараа татахад алдаа:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const matchesType = (typeName: string, query: string) => {
    const t = typeName.toLowerCase();
    const q = query.toLowerCase();
    if (q === "ready") return t.includes("бэлэн") || t.includes("ready");
    if (q === "preorder") return t.includes("захиал") || t.includes("preorder") || t.includes("урьдчил");
    if (q === "live") return t.includes("лайв") || t.includes("live");
    return t.includes(q);
  };

  const filteredProducts = useMemo(() => {
    let data = [...products];
    const typeFilter = searchParams.get("type");
    const discountFilter = searchParams.get("discount") === "true";
    const closedFilter = searchParams.get("closed") === "true";

    if (typeFilter) {
      data = data.filter((p) => matchesType(p.type_name || "", typeFilter));
    }
    if (discountFilter) {
      data = data.filter((p) => (p.discount_price ?? 0) > 0);
    }
    // featured filter removed (no status field)

    if (search) {
      data = data.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (closedFilter) {
      data = data.filter((p) => {
        const total = Number(p.stock || 0);
        const ordered = Number(p.ordered_qty || 0);
        const remaining = Math.max(0, total - ordered);
        const hasDuration = Boolean(p.created_at && p.duration_hours);
        const expiresAt = hasDuration
          ? new Date(
              new Date(p.created_at).getTime() + Number(p.duration_hours || 0) * 60 * 60 * 1000
            )
          : null;
        const expired = Boolean(expiresAt && expiresAt.getTime() <= Date.now());
        const isClosed = expired || remaining <= 0 || p.order_accept_status === "CLOSED";
        return isClosed;
      });
    }
    data.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return data;
  }, [products, search, sortField, sortOrder, searchParams]);

  const pages = Math.max(Math.ceil(filteredProducts.length / limit), 1);
  const pagedProducts = filteredProducts.slice((page - 1) * limit, page * limit);

  useEffect(() => {
    setPage(1);
  }, [search, sortField, sortOrder, searchParams]);

  const handleViewImages = async (productId: number) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/productimg/${productId}`);
      setImages(res.data.map((img: any) => img.image_url));
      setImageModalOpen(true);
    } catch (err) {
      console.error("Зураг татахад алдаа:", err);
      alert("Зураг татаж чадсангүй!");
    }
  };

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const updateArrival = async (productId: number, status: string, cargoFee?: number | null) => {
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/product/${productId}`,
        {
          arrival_status: status,
          cargo_fee: cargoFee ?? null,
        },
        { headers: { ...getActorHeaders() } }
      );
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, arrival_status: status, cargo_fee: cargoFee ?? null }
            : p
        )
      );
    } catch (err) {
      console.error("Төлөв шинэчлэхэд алдаа:", err);
      alert("⚠️ Төлөв шинэчилж чадсангүй!");
    }
  };

  const updateOrderAcceptStatus = async (productId: number, status: "OPEN" | "CLOSED") => {
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/product/${productId}`,
        {
          order_accept_status: status,
        },
        { headers: { ...getActorHeaders() } }
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, order_accept_status: status } : p))
      );
    } catch (err) {
      console.error("Захиалга авах төлөв шинэчлэхэд алдаа:", err);
      alert("⚠️ Захиалга авах төлөв шинэчилж чадсангүй!");
    }
  };

  const handleCopyLink = async (productId: number) => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/product/${productId}`;
      await navigator.clipboard.writeText(url);
      alert("Линк хууллаа");
    } catch {
      alert("Линк хуулж чадсангүй");
    }
  };

  const openStatusModal = (p: Product) => {
    setStatusTarget(p);
    setCargoInput(p.cargo_fee != null ? String(p.cargo_fee) : "");
    // default choice based on current state
    if (p.arrival_status === "Бараа ирсэн") {
      setStatusChoice("ARRIVED");
    } else if (p.arrival_status === "Хүлээгдэж буй") {
      setStatusChoice("WAITING");
    } else if (p.order_accept_status === "CLOSED") {
      setStatusChoice("CLOSED");
    } else {
      setStatusChoice("OPEN");
    }
    setStatusModalOpen(true);
  };

  const saveStatusModal = async () => {
    if (!statusTarget) return;
    if (statusChoice === "OPEN" || statusChoice === "CLOSED") {
      await updateOrderAcceptStatus(statusTarget.id, statusChoice);
    } else {
      if (statusChoice === "ARRIVED") {
        if (cargoInput.trim() === "") {
          alert("Каргоны төлбөр оруулна уу.");
          return;
        }
        await updateArrival(statusTarget.id, "Бараа ирсэн", Number(cargoInput));
        await updateOrderAcceptStatus(statusTarget.id, "CLOSED");
      } else {
        await updateArrival(statusTarget.id, "Хүлээгдэж буй", null);
        await updateOrderAcceptStatus(statusTarget.id, "CLOSED");
      }
    }
    setStatusModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("⚠️ Энэ барааг устгах уу?")) return;

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/product/${id}`,
        { headers: { ...getActorHeaders() } }
      );
      await fetchProducts();
    } catch (err) {
      console.error("Устгах үед алдаа:", err);
      alert("⚠️ Устгаж чадсангүй!");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-800">📦 {titleLabel}</h2>
            {closedFilter && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                Архив
              </span>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Input
              placeholder="Хайлт хийх..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />

            <Button onClick={fetchProducts} variant="outline" disabled={loading} className="bg-blue-900">
              <RefreshCcw size={16} className={loading ? "animate-spin text-white" : "text-white"} />
            </Button>

            {!typeFilter && !discountFilter && !closedFilter && (
              <Button
                onClick={() => {
                  setEditData(null);
                  setOpen(true);
                }}
                className="flex gap-2 items-center bg-yellow-600"
              >
                <Plus size={18} /> Шинэ бараа
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="overflow-auto">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-100 text-left">
                {[
                  { key: "name", label: "Нэр" },
                  ...(isPreorderLive
                    ? []
                    : [
                        { key: "category_name", label: "Ангилал" },
                        { key: "subcategory_name", label: "Дэд ангилал" },
                      ]),
                  ...(isPreorderLive
                    ? [
                        { key: "status_badge", label: "Төлөв", sortable: false },
                        { key: "cargo_fee", label: "Карго (₮)" },
                      ]
                    : [
                      ]),
                  { key: "type_name", label: "Төрөл" },
                  { key: "price", label: "Үнэ (₮)" },
                  ...(isPreorderLive ? [] : [{ key: "discount_price", label: "Хямдрал" }]),
                  ...(isPreorderLive
                    ? [
                        { key: "stock", label: "Захиалах тоо" },
                        { key: "ordered_qty", label: "Захиалсан" },
                        { key: "remaining", label: "Үлдэгдэл", sortable: false },
                      ]
                    : [{ key: "stock", label: "Үлдэгдэл" }]),
                  { key: "created_at", label: "Огноо" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() =>
                      col.sortable === false ? undefined : handleSort(col.key as keyof Product)
                    }
                    className={`py-3 px-4 whitespace-nowrap text-xs ${
                      col.sortable === false ? "cursor-default" : "cursor-pointer hover:bg-gray-200"
                    }`}
                  >
                    {col.label}{" "}
                    {col.sortable === false
                      ? null
                      : sortField === col.key && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                ))}
                <th className="py-3 px-4 text-center text-xs">Үйлдэл</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.length > 0 ? (
                pagedProducts.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 text-xs">{p.name}</td>
                    {!isPreorderLive && (
                      <>
                        <td className="py-2 px-4 text-xs">{p.category_name}</td>
                        <td className="py-2 px-4 text-xs">{p.subcategory_name}</td>
                      </>
                    )}
                    {isPreorderLive ? (
                      <>
                        <td className="py-2 px-4 text-xs">
                          {(() => {
                            const total = Number(p.stock || 0);
                            const ordered = Number(p.ordered_qty || 0);
                            const remaining = Math.max(0, total - ordered);
                            const hasDuration = Boolean(p.created_at && p.duration_hours);
                            const expiresAt = hasDuration
                              ? new Date(
                                  new Date(p.created_at).getTime() +
                                    Number(p.duration_hours || 0) * 60 * 60 * 1000
                                )
                              : null;
                            const expired = Boolean(expiresAt && expiresAt.getTime() <= Date.now());
                            const isClosed = expired || remaining <= 0 || p.order_accept_status === "CLOSED";
                            const arrival = p.arrival_status || "Хүлээгдэж буй";
                            const showWaiting = arrival === "Хүлээгдэж буй" && p.order_accept_status === "CLOSED";
                            const showArrived = arrival === "Бараа ирсэн";
                            const orderBadge = isClosed ? "Захиалга хаагдсан" : "Захиалга авч байгаа";
                            const orderClass = isClosed
                              ? "bg-gray-100 text-gray-600"
                              : "bg-green-100 text-green-700";
                            const waitingClass = "bg-yellow-100 text-yellow-700";
                            const arrivedClass = "bg-blue-100 text-blue-700";

                            return (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  showArrived
                                    ? arrivedClass
                                    : showWaiting
                                    ? waitingClass
                                    : orderClass
                                }`}
                              >
                                {showArrived ? "Бараа ирсэн" : showWaiting ? "Хүлээгдэж буй" : orderBadge}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-4 text-xs">
                          {p.cargo_fee != null ? `${Number(p.cargo_fee).toLocaleString()}₮` : "-"}
                        </td>
                      </>
                    ) : (
                      <>
                      </>
                    )}
                    <td className="py-2 px-4 text-xs">{p.type_name}</td>
                    <td className="py-2 px-4 text-xs">
                      {p.price.toLocaleString()}₮
                    </td>
                    {!isPreorderLive && (
                      <td className="py-2 px-4 text-xs">
                        {p.discount_price ? `${Number(p.discount_price).toLocaleString()}₮` : "-"}
                      </td>
                    )}
                    {isPreorderLive ? (
                      <>
                        <td className="py-2 px-4 text-xs">{p.stock}</td>
                        <td className="py-2 px-4 text-xs">{p.ordered_qty ?? 0}</td>
                        <td className="py-2 px-4 text-xs">
                          {Math.max(0, Number(p.stock || 0) - Number(p.ordered_qty || 0))}
                        </td>
                      </>
                    ) : (
                      <td className="py-2 px-4 text-xs">{p.stock}</td>
                    )}
                    <td className="py-2 px-4 text-xs">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-2 px-4 text-center">
                      <div className="flex justify-center gap-2">
                        {/* ✔ VARIANT НЭМЭХ */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openVariantModal(p.id, p.name)}
                        >
                          <Plus size={16} />
                        </Button>
                        {isPreorderLive && (
                          <Button size="sm" variant="outline" onClick={() => openStatusModal(p)}>
                            Төлөв
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewImages(p.id)}
                        >
                          🖼️
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyLink(p.id)}
                        >
                          🔗
                        </Button>

                        {/* Бараа засах */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditData(p);
                            setOpen(true);
                          }}
                        >
                          <Edit size={16} />
                        </Button>

                        {/* Бараа устгах */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={colSpan} className="text-center py-6 text-gray-500">
                    {loading ? "Уншиж байна..." : "Бараа олдсонгүй."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="text-gray-600">
          Нийт {filteredProducts.length} бараанаас{" "}
          {filteredProducts.length === 0 ? 0 : (page - 1) * limit + 1} -{" "}
          {Math.min(page * limit, filteredProducts.length)} харуулж байна
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Өмнөх
          </Button>
          {pages <= 7 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                    p === page
                      ? "bg-[var(--accent-2)] text-white"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          {pages > 7 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                  page === 1
                    ? "bg-[var(--accent-2)] text-white"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                1
              </button>
              {page > 3 && <span className="px-1 text-gray-400">…</span>}
              {Array.from({ length: 3 }, (_, i) => page - 1 + i)
                .filter((p) => p > 1 && p < pages)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                      p === page
                        ? "bg-[var(--accent-2)] text-white"
                        : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              {page < pages - 2 && <span className="px-1 text-gray-400">…</span>}
              <button
                onClick={() => setPage(pages)}
                className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                  page === pages
                    ? "bg-[var(--accent-2)] text-white"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {pages}
              </button>
            </div>
          )}
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Дараах
          </Button>
        </div>
      </div>

      {/* Бараа нэмэх / засах */}
      <AddProductModal
        open={open}
        onClose={() => setOpen(false)}
        onRefresh={fetchProducts}
        editData={editData}
        initialType={initialType}
      />

      {/* ✔ VARIANT MODAL ЗӨВ АЖИЛЛАДАГ БОЛСОН */}
      <ProductVariantModal
        open={variantOpen}
        onClose={() => setVariantOpen(false)}
        productId={variantProductId}
        productName={variantProductName}
        onRefresh={fetchProducts}
      />

      {/* Зураг харагч */}
      <ImageViewerModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        images={images}
      />

      {statusModalOpen && statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setStatusModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="text-sm font-semibold">Төлөв солих</div>
            <div className="mt-3 space-y-2 text-xs">
              {[
                { key: "OPEN", label: "Захиалга авч байгаа" },
                { key: "CLOSED", label: "Захиалга хаагдсан" },
                { key: "WAITING", label: "Хүлээгдэж буй" },
                { key: "ARRIVED", label: "Бараа ирсэн" },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="statusChoice"
                    checked={statusChoice === opt.key}
                    onChange={() => setStatusChoice(opt.key as any)}
                  />
                  {opt.label}
                </label>
              ))}
              {statusChoice === "ARRIVED" && (
                <input
                  type="number"
                  value={cargoInput}
                  onChange={(e) => setCargoInput(e.target.value)}
                  placeholder="Каргоны төлбөр"
                  className="mt-2 w-full rounded-lg border px-3 py-2 text-xs"
                />
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
                Болих
              </Button>
              <Button onClick={saveStatusModal}>Хадгалах</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;
