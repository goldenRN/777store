"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import OrderDetailsModal from "./OrderDetailsModal";
import ProductDetailModal from "./ProductDetailModal";
import CreateOrderModal from "./CreateOrderModal";
import ArrivedModal from "./ArrivedModal";
import DeleteOrderModal from "./DeleteOrderModal";
import ProductSummaryTable from "./ProductSummaryTable";
import OrdersTable from "./OrdersTable";
import { getActorHeaders } from "@/lib/actorHeaders";
import { getBulkUnitPrice } from "@/lib/bulkPricing";
import AdminTableSearchBar from "@/components/admin/AdminTableSearchBar";
import {
  getTitleLabel,
  getVariantLabel,
  sortProductItems,
} from "./helpers";
import type {
  AdminProductOption,
  ArrivedTarget,
  CreateItemDraft,
  Order,
  OrderColumn,
  PaymentMethod,
  ProductSortField,
  ProductSummary,
  VariantOption,
} from "./types";

export default function AdminOrdersTable() {
  const router = useRouter();
  const pathname = usePathname();
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const limit = 20;
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [qInput, setQInput] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [statusOptions, setStatusOptions] = useState<{ id: number; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<"order" | "product">("order");
  const [productItems, setProductItems] = useState<ProductSummary[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productDetail, setProductDetail] = useState<ProductSummary | null>(null);
  const [sortField, setSortField] = useState<keyof Order>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createPhone, setCreatePhone] = useState("");
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createUserId, setCreateUserId] = useState<string | null>(null);
  const [createItems, setCreateItems] = useState<CreateItemDraft[]>([
    { product_id: "", product_query: "", qty: 1, variant_id: "" },
  ]);
  const [productOptions, setProductOptions] = useState<AdminProductOption[]>([]);
  const [variantOptions, setVariantOptions] = useState<Record<number, VariantOption[]>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState<number | "">("");
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const [closingProductId, setClosingProductId] = useState<number | null>(null);
  const [closingVariantId, setClosingVariantId] = useState<number | null>(null);
  const [productSortField, setProductSortField] = useState<ProductSortField>("total_qty");
  const [productSortOrder, setProductSortOrder] = useState<"asc" | "desc">("desc");
  const [arrivedOpen, setArrivedOpen] = useState(false);
  const [arrivedTarget, setArrivedTarget] = useState<ArrivedTarget | null>(null);
  const [arrivedMode, setArrivedMode] = useState<"arrived" | "edit">("arrived");
  const [arrivedQty, setArrivedQty] = useState<string>("");
  const [arrivedCargoFee, setArrivedCargoFee] = useState<string>("");
  const [arrivedCargoNote, setArrivedCargoNote] = useState<string>("");
  const [arrivedSaving, setArrivedSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const qParam = (searchParams.get("q") ?? "").trim();
  const deliveryIdParam = Number(searchParams.get("deliveryId") ?? "");
  const statusKey = statusFilter.toLowerCase();
  const isPending = statusKey === "pending";
  const isArrivedTab = statusKey === "confirmed";
  const isShippingTab = statusKey === "shipping" || statusKey === "shipped";
  const isDeliveredTab = statusKey === "delivered" || statusKey === "completed";
  const isDeliveryOrderTab = isShippingTab || isDeliveredTab;
  const openOnly = searchParams.get("openOnly") === "true";
  const deletedOnly = searchParams.get("deleted") === "true";
  // Only some tabs are "product summary" views (pending / openOnly / arrived workflow).
  // Other tabs (shipping/delivered/cancelled) should remain as order lists.
  const isProductOnly = !deletedOnly && (isPending || openOnly || isArrivedTab);
  const titleLabel = getTitleLabel({ deletedOnly, openOnly, isPending, statusFilter, statusOptions });

  useEffect(() => {
    setQInput(qParam);
    setQDebounced(qParam);
  }, [qParam]);

  useEffect(() => {
    setViewMode(isProductOnly ? "product" : "order");
  }, [isProductOnly]);

  const fetchOrders = async (p = page, query = qDebounced) => {
    setLoading(true);
    try {
      const trimmed = query.trim();
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const useDeliveryOrders = isDeliveryOrderTab && !deletedOnly;
      const url = new URL(
        `${base}${useDeliveryOrders ? "/api/delivery-orders" : "/api/orders"}`,
        window.location.origin
      );
      url.searchParams.set("page", String(p));
      url.searchParams.set("limit", String(limit));
      if (trimmed) url.searchParams.set("q", trimmed);
      if (statusFilter) url.searchParams.set("status", statusFilter);
      if (deletedOnly) url.searchParams.set("deleted", "true");

      const res = await fetch(url.toString());
      const json = await res.json();
      setOrders(json.data || []);
      setPages(json.meta?.pages || 1);
      setPage(json.meta?.page || 1);
      setTotal(json.meta?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isProductOnly) {
      setViewMode("product");
    }
    if (deletedOnly) {
      setViewMode("order");
    }
    if (viewMode === "order") {
      fetchOrders(1);
    } else {
      fetchProductSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, viewMode, openOnly, deletedOnly]);

  useEffect(() => {
    if (!isDeliveryOrderTab || !Number.isFinite(deliveryIdParam) || deliveryIdParam <= 0 || selected) return;
    const matched = orders.find((order) => Number(order.id) === deliveryIdParam);
    if (matched) {
      setSelected(matched);
    }
  }, [deliveryIdParam, isDeliveryOrderTab, orders, selected]);

  useEffect(() => {
    setPage(1);
    setProductPage(1);
  }, [statusFilter, openOnly, deletedOnly, qDebounced, productSortField, productSortOrder, viewMode]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/status`)
      .then((r) => r.json())
      .then((data) => setStatusOptions(Array.isArray(data) ? data : []))
      .catch(() => setStatusOptions([]));
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    if (productOptions.length === 0) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/product`)
        .then((r) => r.json())
        .then((data) => setProductOptions(Array.isArray(data) ? data : []))
        .catch(() => setProductOptions([]));
    }
    if (paymentMethods.length === 0) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/payment-methods`)
        .then((r) => r.json())
        .then((data) => setPaymentMethods(Array.isArray(data) ? data : []))
        .catch(() => setPaymentMethods([]));
    }
  }, [createOpen, paymentMethods.length, productOptions.length]);

  useEffect(() => {
    if (!createOpen) return;
    const ids = Array.from(
      new Set(createItems.map((it) => Number(it.product_id)).filter((id) => Number.isFinite(id)))
    ) as number[];
    ids.forEach((id) => {
      if (variantOptions[id]) return;
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/productvar/${id}`)
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? (data as VariantOption[]) : [];
          setVariantOptions((prev) => ({ ...prev, [id]: list }));
        })
        .catch(() => {
          setVariantOptions((prev) => ({ ...prev, [id]: [] }));
        });
    });
  }, [createOpen, createItems, variantOptions]);

  useEffect(() => {
    if (!createOpen) return;
    const phone = createPhone.trim();
    if (phone.length < 4) {
      setCreateName("");
      setCreateEmail("");
      setCreateUserId(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/users`, window.location.origin);
        url.searchParams.set("q", phone);
        const res = await fetch(url.toString());
        const json = await res.json();
        const user = Array.isArray(json?.data) ? json.data[0] : null;
        if (user) {
          setCreateName(user.name || "");
          setCreateEmail(user.email || "");
          setCreateUserId(user.id || null);
        }
      } catch {
        // ignore
      }
    }, 450);
    return () => clearTimeout(t);
  }, [createOpen, createPhone]);

  const productOptionMap = useMemo(() => new Map(productOptions.map((p) => [p.id, p])), [productOptions]);

  const getBaseUnitPrice = useCallback(
    (productId: number) => {
    const product = productOptionMap.get(productId);
    if (!product) return 0;
    return product.discount_price && product.discount_price > 0 ? product.discount_price : product.price;
    },
    [productOptionMap]
  );

  const getBulkUnitPriceForProduct = useCallback(
    (productId: number, qty: number) => {
      const product = productOptionMap.get(productId);
      const baseUnit = getBaseUnitPrice(productId);
      const tiers = product?.bulk_prices ?? null;
      return getBulkUnitPrice(baseUnit, qty, tiers);
    },
    [getBaseUnitPrice, productOptionMap]
  );

  const getUnitPriceForVariant = useCallback(
    (productId: number, variantId: number | null, qty: number) => {
      if (!variantId) return getBulkUnitPriceForProduct(productId, qty);
      const variant = (variantOptions[productId] || []).find((v) => v.id === variantId) || null;
      const variantPrice = variant?.price != null ? Number(variant.price) : null;
      return variantPrice != null && variantPrice > 0 ? variantPrice : getBulkUnitPriceForProduct(productId, qty);
    },
    [getBulkUnitPriceForProduct, variantOptions]
  );

  const orderItemTotal = useMemo(() => {
    return createItems.reduce((sum, it) => {
      if (!it.product_id) return sum;
      const productId = Number(it.product_id);
      const variantId = it.variant_id ? Number(it.variant_id) : null;
      const unit = getUnitPriceForVariant(productId, variantId, Number(it.qty || 1));
      return sum + Math.max(1, Number(it.qty || 1)) * unit;
    }, 0);
  }, [createItems, getUnitPriceForVariant]);

  const onSearch = () => {
    setQDebounced(qInput);
    if (viewMode === "product") {
      return;
    }
    fetchOrders(1, qInput);
  };

  const visibleProductItems = useMemo(() => {
    const q = qDebounced.trim().toLowerCase();
    if (!q) return productItems;
    return productItems.filter((p) => {
      const hay = `${p.product_name || ""} ${p.product_description || ""}`.toLowerCase();
      if (hay.includes(q)) return true;
      if (Array.isArray(p.variants) && p.variants.some((v) => String(v.label || "").toLowerCase().includes(q))) return true;
      return false;
    });
  }, [productItems, qDebounced]);

  const sortedVisibleProductItems = useMemo(
    () => sortProductItems(visibleProductItems, productSortField, productSortOrder),
    [visibleProductItems, productSortField, productSortOrder]
  );

  const productTotal = sortedVisibleProductItems.length;
  const productPages = Math.max(1, Math.ceil(productTotal / limit));
  const paginatedProductItems = useMemo(() => {
    const safePage = Math.min(productPage, productPages);
    const start = (safePage - 1) * limit;
    return sortedVisibleProductItems.slice(start, start + limit);
  }, [limit, productPage, productPages, sortedVisibleProductItems]);

  useEffect(() => {
    if (productPage > productPages) {
      setProductPage(productPages);
    }
  }, [productPage, productPages]);

  const handleProductSort = (field: ProductSortField) => {
    if (productSortField === field) {
      setProductSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setProductSortField(field);
      // sensible defaults
      setProductSortOrder(field === "product_name" ? "asc" : "desc");
    }
  };

  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const jumpToDeliveryOrder = useCallback(
    (order: Order) => {
      const deliveryId = Number(order.related_delivery_order_id || 0);
      const sourceOrderId = Number(order.id || 0);
      if (!deliveryId || !sourceOrderId) return;

      const nextParams = new URLSearchParams();
      nextParams.set("status", "shipping");
      nextParams.set("q", String(sourceOrderId));
      nextParams.set("deliveryId", String(deliveryId));
      router.push(`${pathname}?${nextParams.toString()}`);
    },
    [pathname, router],
  );

  const fetchProductSummary = async () => {
    setProductLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = new URL(`${base}/api/orders/items/summary`, window.location.origin);
      if (statusFilter) url.searchParams.set("status", statusFilter);
      url.searchParams.set("payment", "PAID");
      if (isPending) url.searchParams.set("excludeArrived", "true");
      if (openOnly) url.searchParams.set("openOnly", "true");
      if (isPending && !openOnly) url.searchParams.set("closedOnly", "true");
      // "Бараа ирсэн" таб дээр AdminOrderItem.status = "Бараа ирсэн" мөрүүдийг харуулна.
      if (statusFilter.toLowerCase() === "confirmed") {
        url.searchParams.set("itemStatus", "Бараа ирсэн");
      }
      const res = await fetch(url.toString(), { headers: getActorHeaders() });
      const json = await res.json();
      setProductItems(json.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setProductLoading(false);
    }
  };

  const closeProductOrders = async (productId: number, productName: string) => {
    if (!confirm(`“${productName}” барааны захиалгыг хаах уу?`)) return;
    setClosingProductId(productId);
    try {
      const res = await fetch(`/api/product/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getActorHeaders(),
        },
        body: JSON.stringify({ order_accept_status: "CLOSED" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Захиалга хааж чадсангүй");
      }
      alert("Захиалга хаагдлаа. Энэ бараа “Хаагдсан бараа” цэсэнд орно.");
      await fetchProductSummary();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Алдаа гарлаа";
      alert(`⚠️ ${message}`);
    } finally {
      setClosingProductId((prev) => (prev === productId ? null : prev));
    }
  };

  const closeVariantOrders = async (variantId: number, variantLabel: string) => {
    if (!confirm(`“${variantLabel}” төрлийн захиалгыг хаах уу?`)) return;
    setClosingVariantId(variantId);
    try {
      const res = await fetch(`/api/productvar/${variantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getActorHeaders(),
        },
        body: JSON.stringify({ order_accept_status: "CLOSED" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Төрөл хааж чадсангүй");
      }
      await fetchProductSummary();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Алдаа гарлаа";
      alert(`⚠️ ${message}`);
    } finally {
      setClosingVariantId((prev) => (prev === variantId ? null : prev));
    }
  };

  const openArrivedModalForProduct = (p: ProductSummary) => {
    if (!p.product_id) return;
    setArrivedMode("arrived");
    setArrivedTarget({
      productId: p.product_id,
      productName: p.product_name,
      variantId: null,
      variantLabel: null,
      applyToAllVariants: Array.isArray(p.variants) && p.variants.length > 0,
    });
    setArrivedQty(String(p.pending_qty ?? p.total_qty ?? 0));
    setArrivedCargoFee("");
    setArrivedCargoNote("");
    setArrivedOpen(true);
  };

  const openArrivedModalForVariant = (p: ProductSummary, v: ProductSummary["variants"][number]) => {
    if (!p.product_id) return;
    setArrivedMode("arrived");
    setArrivedTarget({
      productId: p.product_id,
      productName: p.product_name,
      variantId: v.variant_id,
      variantLabel: v.label,
      applyToAllVariants: false,
    });
    setArrivedQty(String(v.pending_qty ?? v.ordered_qty ?? 0));
    setArrivedCargoFee("");
    setArrivedCargoNote("");
    setArrivedOpen(true);
  };

  const openEditArrivedForProduct = (p: ProductSummary) => {
    if (!p.product_id) return;
    setArrivedMode("edit");
    setArrivedTarget({
      productId: p.product_id,
      productName: p.product_name,
      variantId: null,
      variantLabel: null,
      applyToAllVariants: Array.isArray(p.variants) && p.variants.length > 0,
      handedQty: p.handed_qty ?? 0,
      deliveryQty: p.delivery_qty ?? 0,
    });
    setArrivedQty(String(p.arrived_qty ?? p.total_qty ?? 0));
    setArrivedCargoFee(String(p.cargo_fee ?? 0));
    setArrivedCargoNote(p.cargo_note ?? "");
    setArrivedOpen(true);
  };

  const openEditArrivedForVariant = (p: ProductSummary, v: ProductSummary["variants"][number]) => {
    if (!p.product_id) return;
    setArrivedMode("edit");
    setArrivedTarget({
      productId: p.product_id,
      productName: p.product_name,
      variantId: v.variant_id,
      variantLabel: v.label,
      applyToAllVariants: false,
      handedQty: v.handed_qty ?? 0,
      deliveryQty: v.delivery_qty ?? 0,
    });
    setArrivedQty(String(v.arrived_qty ?? v.ordered_qty ?? 0));
    setArrivedCargoFee(String(v.cargo_fee ?? 0));
    setArrivedCargoNote(v.cargo_note ?? "");
    setArrivedOpen(true);
  };

  const saveArrived = async () => {
    if (!arrivedTarget) return;
    const qtyRaw = arrivedQty.trim();
    const qty = qtyRaw ? Number(qtyRaw) : NaN;
    if (!Number.isFinite(qty) || qty < 0) {
      alert("Ирсэн тоо зөв оруулна уу.");
      return;
    }
    const feeRaw = arrivedCargoFee.trim();
    const fee = feeRaw ? Number(feeRaw) : NaN;
    if (!Number.isFinite(fee) || fee < 0) {
      alert("Карго үнэ зөв оруулна уу.");
      return;
    }
    setArrivedSaving(true);
    try {
      const res = await fetch(`/api/orders/items/mark-arrived`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getActorHeaders() },
        body: JSON.stringify({
          productId: arrivedTarget.productId,
          variantId: arrivedTarget.variantId,
          arrived_qty: Math.round(qty),
          cargo_fee: fee,
          cargo_note: arrivedCargoNote.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Хадгалж чадсангүй");

      setArrivedOpen(false);
      setArrivedTarget(null);
      setArrivedQty("");
      alert(arrivedMode === "edit" ? "Карго мэдээлэл амжилттай шинэчлэгдлээ." : "Амжилттай хадгаллаа. “Бараа ирсэн” цэсэнд харагдана.");
      await fetchProductSummary();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Алдаа гарлаа";
      alert(`⚠️ ${message}`);
    } finally {
      setArrivedSaving(false);
    }
  };

  const revertArrivedToPending = async () => {
    if (!arrivedTarget) return;
    if ((arrivedTarget.handedQty ?? 0) > 0 || (arrivedTarget.deliveryQty ?? 0) > 0) {
      alert("Ирж авсан эсвэл хүргэлтэнд бүртгэгдсэн тоо байгаа тул буцаах боломжгүй.");
      return;
    }

    setArrivedSaving(true);
    try {
      const res = await fetch(`/api/orders/items/mark-arrived`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getActorHeaders() },
        body: JSON.stringify({
          action: "revert_pending",
          productId: arrivedTarget.productId,
          variantId: arrivedTarget.variantId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Буцааж чадсангүй");

      setArrivedOpen(false);
      setArrivedTarget(null);
      setArrivedQty("");
      setArrivedCargoFee("");
      setArrivedCargoNote("");
      setArrivedMode("arrived");
      alert("Бараа “Хүлээгдэж буй” руу буцлаа.");
      await fetchProductSummary();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Алдаа гарлаа";
      alert(`⚠️ ${message}`);
    } finally {
      setArrivedSaving(false);
    }
  };

  const openDeleteModal = (o: Order) => {
    setDeleteTarget(o);
    setDeleteReason("");
    setDeleteOpen(true);
  };

  const saveDelete = async () => {
    if (!deleteTarget) return;
    const reason = deleteReason.trim();
    if (!reason) {
      alert("Устгах шалтгаан оруулна уу.");
      return;
    }
    if (!confirm(`Захиалга #${deleteTarget.id} устгах уу?`)) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/orders/${deleteTarget.id}/delete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getActorHeaders() },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Устгаж чадсангүй");
      setDeleteOpen(false);
      setDeleteTarget(null);
      alert("Захиалга устгагдлаа. “Устгасан захиалга” цэсэнд орно.");
      fetchOrders(1, qDebounced);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Алдаа гарлаа";
      alert(`⚠️ ${message}`);
    } finally {
      setDeleteSaving(false);
    }
  };

  const updatePendingOrderStatus = async (orderId: number, nextStatus: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getActorHeaders() },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchOrders(page);
  };

  const markDeliveryComplete = async (order: Order) => {
    if (!order.is_delivery_order) return;
    if (!confirm(`Хүргэлтийн захиалга #${order.id}-г “Хүргэгдсэн” төлөвт шилжүүлэх үү?`)) return;
    try {
      const res = await fetch(`/api/delivery-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getActorHeaders() },
        body: JSON.stringify({ action: "mark_delivered" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Хүргэлтийн төлөв шинэчилж чадсангүй");
      }
      alert("Хүргэлтийн төлөв “Хүргэгдсэн” боллоо.");
      fetchOrders(page, qDebounced);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Алдаа гарлаа";
      alert(`⚠️ ${message}`);
    }
  };

  const orderColumns = useMemo(() => {
    const cols: OrderColumn[] = [
      { key: "id", label: "Дугаар" },
      { key: "name", label: "Захиалагч" },
      { key: "phone1", label: "Утас" },
      { key: "total", label: "Нийт" },
      ...(isDeliveryOrderTab
        ? ([
            { key: "cargo_fee", label: "Карго" },
            { key: "delivery_fee", label: "Хүргэлтийн төлбөр" },
            { key: "delivery_address", label: "Хүргэлтийн хаяг", sortable: false },
          ] as OrderColumn[])
        : []),
      { key: "payment_method_name", label: "Төлбөрийн төрөл", sortable: false },
      { key: "payment_status", label: "Төлбөр", sortable: false },
      { key: "created_at", label: "Огноо" },
    ];
    if (deletedOnly) {
      cols.push(
        { key: "deleted_by_name", label: "Хэн устгасан", sortable: false },
        { key: "deleted_reason", label: "Тайлбар", sortable: false },
        { key: "deleted_at", label: "Устгасан огноо", sortable: false }
      );
    }
    return cols;
  }, [deletedOnly, isDeliveryOrderTab]);

  const orderColSpan = orderColumns.length + 1;

  const renderPagination = ({
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
    label,
  }: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (nextPage: number) => void;
    label: string;
  }) => (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
      <div className="text-gray-600">
        Нийт {totalItems} {label}-аас {totalItems === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalItems)} харуулж байна
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 rounded border px-3 text-xs disabled:opacity-50"
        >
          Өмнөх
        </button>
        {totalPages <= 7 ? (
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                  pageNumber === currentPage
                    ? "bg-[var(--accent-2)] text-white"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {pageNumber}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                currentPage === 1
                  ? "bg-[var(--accent-2)] text-white"
                  : "border border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              1
            </button>
            {currentPage > 3 ? <span className="px-1 text-gray-400">…</span> : null}
            {Array.from({ length: 3 }, (_, index) => currentPage - 1 + index)
              .filter((pageNumber) => pageNumber > 1 && pageNumber < totalPages)
              .map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => onPageChange(pageNumber)}
                  className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                    pageNumber === currentPage
                      ? "bg-[var(--accent-2)] text-white"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
            {currentPage < totalPages - 2 ? <span className="px-1 text-gray-400">…</span> : null}
            <button
              onClick={() => onPageChange(totalPages)}
              className={`h-8 min-w-8 rounded-md px-2 text-xs ${
                currentPage === totalPages
                  ? "bg-[var(--accent-2)] text-white"
                  : "border border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {totalPages}
            </button>
          </div>
        )}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 rounded border px-3 text-xs disabled:opacity-50"
        >
          Дараах
        </button>
      </div>
    </div>
  );


  const refreshCurrentView = () => {
    if (viewMode === "order") {
      fetchOrders(page, qDebounced);
    } else {
      fetchProductSummary();
    }
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
  };

  const saveCreateOrder = async () => {
    if (!createPhone.trim()) {
      alert("Утас оруулна уу");
      return;
    }

    const filteredItems = createItems.filter((item) => item.product_id);
    if (filteredItems.length === 0) {
      alert("Бараа сонгоно уу");
      return;
    }

    setCreateLoading(true);
    try {
      const productMap = new Map(productOptions.map((product) => [product.id, product]));
      for (const item of filteredItems) {
        const productId = Number(item.product_id);
        const variants = variantOptions[productId] || [];
        if (variants.length > 0 && !item.variant_id) {
          const productName = productMap.get(productId)?.name || "Бараа";
          alert(`Төрөлтэй бараанд төрөл заавал сонгоно уу: ${productName}`);
          setCreateLoading(false);
          return;
        }
      }

      const res = await fetch(`/api/orders/admin-create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getActorHeaders(),
        },
        body: JSON.stringify({
          phone: createPhone.trim(),
          name: createName.trim(),
          email: createEmail.trim(),
          user_id: createUserId,
          payment_method_id: paymentMethodId || null,
          items: filteredItems.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id || null,
            qty: item.qty,
          })),
        }),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || err?.error || "Алдаа гарлаа");
        }
        const raw = await res.text().catch(() => "");
        const trimmed = String(raw || "").replace(/\s+/g, " ").trim();
        throw new Error(trimmed ? `Серверийн алдаа: ${trimmed.slice(0, 160)}` : "Серверийн алдаа гарлаа");
      }

      setCreateOpen(false);
      setCreateItems([{ product_id: "", product_query: "", qty: 1, variant_id: "" }]);
      setCreatePhone("");
      setCreateName("");
      setCreateEmail("");
      setCreateUserId(null);
      setPaymentMethodId("");
      fetchOrders(1);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Алдаа гарлаа";
      alert(message);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">{titleLabel}</h1>

        <div className="flex flex-wrap items-center gap-2">
          <AdminTableSearchBar
            value={qInput}
            onValueChange={setQInput}
            placeholder={viewMode === "product" ? "Бараа хайх..." : "Нэр / Имэйл / ID хайх..."}
            debounceMs={3000}
            loading={viewMode === "order" ? loading : productLoading}
            onSearch={onSearch}
            onRefresh={refreshCurrentView}
            showSearchButton
            searchButtonLabel="Хайх"
          />

          <button
            onClick={() => {
              const base = process.env.NEXT_PUBLIC_API_URL || "";
              if (viewMode === "product") {
                const url = new URL(`${base}/api/orders/export/excel`, window.location.origin);
                url.searchParams.set("mode", "product");
                if (statusFilter) url.searchParams.set("status", statusFilter);
                url.searchParams.set("payment", "PAID");
                if (isPending) url.searchParams.set("excludeArrived", "true");
                window.open(url.toString(), "_blank");
                return;
              }
              window.open(`${base}/api/orders/export/excel`, "_blank");
            }}
            className="rounded bg-green-700 px-3 py-1 text-white"
          >
            Excel татах
          </button>

          <button
            onClick={() => setCreateOpen(true)}
            className="rounded bg-black px-3 py-1 text-white"
            style={{ display: statusFilter || deletedOnly ? "none" : "inline-flex" }}
          >
            Захиалга үүсгэх
          </button>
        </div>
      </div>

      {viewMode === "product" ? (
        <ProductSummaryTable
          items={paginatedProductItems}
          loading={productLoading}
          isArrivedTab={isArrivedTab}
          isPending={isPending}
          openOnly={openOnly}
          arrivedSaving={arrivedSaving}
          titleLabel={titleLabel}
          expandedProducts={expandedProducts}
          closingProductId={closingProductId}
          closingVariantId={closingVariantId}
          productSortField={productSortField}
          productSortOrder={productSortOrder}
          onProductSort={handleProductSort}
          onToggleExpanded={(key) => setExpandedProducts((prev) => ({ ...prev, [key]: !prev[key] }))}
          onCloseProductOrders={closeProductOrders}
          onCloseVariantOrders={closeVariantOrders}
          onOpenArrivedModalForProduct={openArrivedModalForProduct}
          onOpenArrivedModalForVariant={openArrivedModalForVariant}
          onOpenEditArrivedForProduct={openEditArrivedForProduct}
          onOpenEditArrivedForVariant={openEditArrivedForVariant}
          onOpenProductDetail={setProductDetail}
        />
      ) : (
        <OrdersTable
          orders={orders}
          loading={loading}
          orderColumns={orderColumns}
          orderColSpan={orderColSpan}
          deletedOnly={deletedOnly}
          isPending={isPending}
          sortField={sortField}
          sortOrder={sortOrder}
          page={page}
          onSort={handleSort}
          onSelect={setSelected}
          onDelete={openDeleteModal}
          onStatusChange={updatePendingOrderStatus}
          onJumpToDelivery={jumpToDeliveryOrder}
          onMarkDeliveryComplete={markDeliveryComplete}
        />
      )}

      {viewMode === "product"
        ? renderPagination({
            currentPage: productPage,
            totalPages: productPages,
            totalItems: productTotal,
            onPageChange: setProductPage,
            label: "бараа",
          })
        : !isProductOnly
          ? renderPagination({
              currentPage: page,
              totalPages: pages,
              totalItems: total,
              onPageChange: (nextPage) => fetchOrders(nextPage),
              label: "захиалга",
            })
          : null}

      {selected ? (
        <OrderDetailsModal
          id={selected.id}
          deliveryMode={Boolean(selected.is_delivery_order)}
          onClose={() => {
            setSelected(null);
            fetchOrders(page);
          }}
        />
      ) : null}

      <ProductDetailModal productDetail={productDetail} onClose={() => setProductDetail(null)} />

      <CreateOrderModal
        open={createOpen}
        createLoading={createLoading}
        createPhone={createPhone}
        createName={createName}
        createEmail={createEmail}
        createItems={createItems}
        productOptions={productOptions}
        variantOptions={variantOptions}
        paymentMethods={paymentMethods}
        paymentMethodId={paymentMethodId}
        orderItemTotal={orderItemTotal}
        onClose={closeCreateModal}
        onCreatePhoneChange={setCreatePhone}
        onCreateNameChange={setCreateName}
        onCreateEmailChange={setCreateEmail}
        onCreateItemsChange={setCreateItems}
        onPaymentMethodChange={setPaymentMethodId}
        onSave={saveCreateOrder}
        getUnitPriceForVariant={getUnitPriceForVariant}
        getVariantLabel={getVariantLabel}
      />

      <ArrivedModal
        open={arrivedOpen}
        target={arrivedTarget}
        mode={arrivedMode}
        qty={arrivedQty}
        cargoFee={arrivedCargoFee}
        cargoNote={arrivedCargoNote}
        saving={arrivedSaving}
        onClose={() => {
          setArrivedOpen(false);
          setArrivedTarget(null);
          setArrivedQty("");
          setArrivedMode("arrived");
        }}
        onQtyChange={setArrivedQty}
        onCargoFeeChange={setArrivedCargoFee}
        onCargoNoteChange={setArrivedCargoNote}
        onRevertToPending={arrivedMode === "edit" ? revertArrivedToPending : undefined}
        onSave={saveArrived}
      />

      <DeleteOrderModal
        open={deleteOpen}
        target={deleteTarget}
        reason={deleteReason}
        saving={deleteSaving}
        onClose={() => setDeleteOpen(false)}
        onReasonChange={setDeleteReason}
        onSave={saveDelete}
      />
    </div>
  );
}
