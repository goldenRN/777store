'use client'
import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Edit, Eye, EyeOff, Trash2, Plus } from "lucide-react";
import AddProductModal from "./AddProductModal";
import axios from "axios";
import { getActorHeaders } from "@/lib/actorHeaders";
import ImageViewerModal from "./ImageViewerModal";
import ProductVariantModal from "./ProductVariantModal"; 
import AdminTableSearchBar from "@/components/admin/AdminTableSearchBar";

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
  type_has_duration?: boolean;
  arrival_status?: string | null;
  cargo_fee?: number | null;
  ordered_qty?: number | null;
  is_hidden?: boolean;
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

type TableCol = {
  key: string;
  label: string;
  sortable?: boolean;
};

const ProductPage = () => {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<Product | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
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
  // This screen is for product registration only.
  // Anything order-related (close, ordered qty, remaining, etc.) is shown in the Order screens.
  const tableColumns: TableCol[] = useMemo(() => {
    return [
      { key: "name", label: "Нэр" },
      { key: "category_name", label: "Ангилал" },
      { key: "subcategory_name", label: "Дэд ангилал" },
      ...(closedFilter ? [{ key: "cargo_fee", label: "Карго (₮)", sortable: false }] : []),
      { key: "type_name", label: "Төрөл" },
      { key: "price", label: "Үнэ (₮)" },
      { key: "discount_price", label: "Хямдрал" },
      { key: "stock", label: "Үлдэгдэл" },
      { key: "created_at", label: "Бүртгэсэн огноо" },
    ];
  }, [closedFilter]);
  const colSpan = tableColumns.length + 1; // + Үйлдэл

  const titleLabel = (() => {
    if (closedFilter) return "Хаагдсан бараа";
    if (discountFilter) return "Хямдралтай бараа";
    if (typeFilter === "ready") return "Бэлэн бараа";
    if (typeFilter === "preorder") return "Захиалгын бараа";
    if (typeFilter === "live") return "Лайвын бараа";
    return "Бараа бүртгэл";
  })();

  const formatOrderWindow = (createdAt: string, durationHours?: number | null) => {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" });
    const start = new Date(createdAt);
    const startText = fmt.format(start);
    const hours = Number(durationHours || 0);
    if (hours > 0) {
      const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
      return `${startText} → ${fmt.format(end)}`;
    }
    return startText;
  };

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
      data = data.filter((p) => {
        const typeName = (p.type_name || "").toLowerCase();
        const isLive = typeName.includes("лайв") || typeName.includes("live");
        const hasDuration = Boolean(p.type_has_duration || p.duration_hours);
        const isPreorder = matchesType(typeName, "preorder") || hasDuration;
        const isReady = matchesType(typeName, "ready") || (!isLive && !isPreorder);

        if (typeFilter === "ready") return isReady;
        if (typeFilter === "preorder") return !isLive && isPreorder;
        if (typeFilter === "live") return isLive;
        return matchesType(typeName, typeFilter);
      });
    }
    if (discountFilter) {
      data = data.filter((p) => (p.discount_price ?? 0) > 0);
    }
    // featured filter removed (no status field)

    if (searchApplied) {
      data = data.filter((p) =>
        p.name.toLowerCase().includes(searchApplied.toLowerCase())
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
  }, [products, searchApplied, sortField, sortOrder, searchParams]);

  const pages = Math.max(Math.ceil(filteredProducts.length / limit), 1);
  const pagedProducts = filteredProducts.slice((page - 1) * limit, page * limit);

  useEffect(() => {
    setPage(1);
  }, [searchApplied, sortField, sortOrder, searchParams]);

	  const handleViewImages = async (productId: number) => {
	    try {
	      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/productimg/${productId}`);
	      const list: unknown = res.data;
	      const urls = Array.isArray(list)
	        ? list
	            .map((img) => (img && typeof img === "object" ? (img as { image_url?: unknown }).image_url : null))
	            .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
	        : [];
	      setImages(urls);
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

  const handleToggleVisibility = async (product: Product) => {
    const nextHidden = !product.is_hidden;
    const actionLabel = nextHidden ? "хэрэглэгчдээс нуух" : "хэрэглэгчдэд дахин харуулах";
    if (!confirm(`Энэ барааг ${actionLabel} уу?`)) return;

    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/product/${product.id}`,
        {
          is_hidden: nextHidden,
        },
        { headers: { ...getActorHeaders() } }
      );

      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                is_hidden: nextHidden,
              }
            : item
        )
      );
    } catch (err) {
      console.error("Харагдах төлөв шинэчлэхэд алдаа:", err);
      alert("⚠️ Барааны харагдах төлөв шинэчилж чадсангүй!");
    }
  };

  const openStatusModal = (p: Product) => {
    setStatusTarget(p);
    setCargoInput(p.cargo_fee != null ? String(p.cargo_fee) : "");
    // This modal is used only for closing preorder/live orders.
    setStatusChoice("CLOSED");
    setStatusModalOpen(true);
  };

  const saveStatusModal = async () => {
    if (!statusTarget) return;
    await updateOrderAcceptStatus(statusTarget.id, "CLOSED");
    setStatusModalOpen(false);
    alert("Захиалга хаагдлаа. Энэ бараа “Хаагдсан бараа” цэсэнд орно.");
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
            <AdminTableSearchBar
              value={searchInput}
              onValueChange={setSearchInput}
              onSearch={() => setSearchApplied(searchInput)}
              onRefresh={fetchProducts}
              placeholder="Хайлт хийх..."
              debounceMs={3000}
              showSearchButton={false}
              loading={loading}
            />

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
                {tableColumns.map((col) => (
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
                  <tr
                    key={p.id}
                    className={`border-b hover:bg-gray-50 ${p.is_hidden ? "bg-gray-50/80 text-gray-400" : ""}`}
                  >
                    <td className="py-2 px-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.is_hidden && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                            Нуусан
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-xs">{p.category_name}</td>
                    <td className="py-2 px-4 text-xs">{p.subcategory_name}</td>
                    {closedFilter && (
                      <td className="py-2 px-4 text-xs">
                        {p.cargo_fee != null ? `${Number(p.cargo_fee).toLocaleString()}₮` : "-"}
                      </td>
                    )}
                    <td className="py-2 px-4 text-xs">{p.type_name}</td>
                    <td className="py-2 px-4 text-xs">
                      {p.price.toLocaleString()}₮
                    </td>
                    <td className="py-2 px-4 text-xs">
                      {p.discount_price ? `${Number(p.discount_price).toLocaleString()}₮` : "-"}
                    </td>
                    <td className="py-2 px-4 text-xs">{p.stock}</td>
	                    <td className="py-2 px-4 text-xs whitespace-nowrap">
	                      {formatOrderWindow(p.created_at, null)}
	                    </td>

	                    <td className="py-2 px-4 text-center">
	                      <div className="flex justify-center gap-2">
	                        {/* ✔ VARIANT НЭМЭХ */}
	                        {(() => {
	                          // "Хаагдсан бараа" таб дээр төрөл нэмэхийг бүр мөсөн хориглоно.
	                          if (closedFilter) return null;
	                          return (
	                            <Button
	                              size="sm"
	                              variant="outline"
	                              onClick={() => openVariantModal(p.id, p.name)}
	                            >
	                              <Plus size={16} />
	                            </Button>
	                          );
	                        })()}
                        {/* Захиалга хаах үйлдлийг Захиалга цэс рүү шилжүүлсэн (энд харуулахгүй). */}

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

                        {initialType === "ready" && (
                          <Button
                            size="sm"
                            variant="outline"
                            title={p.is_hidden ? "Хэрэглэгчдэд дахин харуулах" : "Хэрэглэгчдээс нуух"}
                            onClick={() => handleToggleVisibility(p)}
                            className={p.is_hidden ? "border-red-200 text-red-600 hover:bg-red-50" : ""}
                          >
                            {p.is_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        )}

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
            <div className="text-sm font-semibold">Захиалга хаах</div>
            <div className="mt-3 space-y-2 text-xs text-gray-700">
              <div>Энэ барааны захиалгыг хаах уу?</div>
              <div className="rounded-lg bg-gray-50 p-3 text-[11px] text-gray-600">
                Хаагдсаны дараа энэ бараа “Хаагдсан бараа” цэсэнд орно.
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
                Болих
              </Button>
              <Button
                onClick={() => {
                  if (!confirm("Захиалгыг хаах уу?")) return;
                  saveStatusModal();
                }}
              >
                Хаах
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;
