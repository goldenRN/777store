import type { ProductSummary, ProductSortField, VariantOption } from "./types";

export function getTitleLabel(args: {
  deletedOnly: boolean;
  openOnly: boolean;
  isPending: boolean;
  statusFilter: string;
  statusOptions: { id: number; name: string }[];
}) {
  const { deletedOnly, openOnly, isPending, statusFilter, statusOptions } = args;
  if (deletedOnly) return "Устгасан захиалга";
  if (openOnly && isPending) return "Захиалга авч байгаа";
  if (!statusFilter) return "Захиалгын жагсаалт";

  const hit = statusOptions.find((s) => s.name === statusFilter);
  if (hit) return hit.name;

  const key = statusFilter.toLowerCase();
  if (key === "pending") return "Хүлээгдэж буй";
  if (key === "confirmed") return "Бараа ирсэн";
  if (key === "shipping" || key === "shipped") return "Хүргэлтэнд бүртгэгдсэн";
  if (key === "delivered" || key === "completed") return "Хүргэгдсэн";
  if (key === "cancelled" || key === "canceled") return "Цуцлагдсан";
  return statusFilter;
}

export function getVariantLabel(variant: VariantOption) {
  const attr = variant.attribute && typeof variant.attribute === "object" ? variant.attribute : null;
  const typeValue = typeof attr?.type === "string" ? attr.type.trim() : "";
  const colorValue = typeof attr?.color === "string" ? attr.color.trim() : "";
  const sizeValue = typeof attr?.size === "string" ? attr.size.trim() : "";
  const parts = [typeValue, colorValue, sizeValue].filter(Boolean);
  if (parts.length > 0) return parts.join(" / ");
  if (variant.sku && variant.sku.trim()) return variant.sku.trim();
  return `Төрөл-${variant.id}`;
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toLocaleString()}₮`;
}

export function getRemainingForProductRow(product: ProductSummary) {
  if (product.product_stock == null || product.product_ordered_qty == null) return null;
  return Math.max(0, Number(product.product_stock) - Number(product.product_ordered_qty));
}

export function getProductRowStatus(product: ProductSummary, titleLabel: string) {
  if (product.arrival_status === "Бараа ирсэн" && (product.uniform_variant_cargo || !(product.variants?.length > 0))) {
    return {
      label: "Бараа ирсэн",
      className: "bg-emerald-100 text-emerald-700",
    };
  }
  return {
    label: titleLabel,
    className: "bg-gray-100 text-gray-700",
  };
}

export function sortProductItems(
  items: ProductSummary[],
  field: ProductSortField,
  order: "asc" | "desc"
) {
  const list = [...items];
  const dir = order === "asc" ? 1 : -1;
  list.sort((a, b) => {
    const aVal = (() => {
      if (field === "product_name") return String(a.product_name || "");
      if (field === "total_qty") return Number(a.total_qty || 0);
      if (field === "product_stock") return a.product_stock == null ? -1 : Number(a.product_stock);
      const r = getRemainingForProductRow(a);
      return r == null ? -1 : Number(r);
    })();
    const bVal = (() => {
      if (field === "product_name") return String(b.product_name || "");
      if (field === "total_qty") return Number(b.total_qty || 0);
      if (field === "product_stock") return b.product_stock == null ? -1 : Number(b.product_stock);
      const r = getRemainingForProductRow(b);
      return r == null ? -1 : Number(r);
    })();

    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * dir;
    }
    return String(aVal).localeCompare(String(bVal)) * dir;
  });
  return list;
}
