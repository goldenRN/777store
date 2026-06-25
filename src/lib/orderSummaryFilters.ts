import { Prisma } from "@prisma/client";

export const preorderTypeWhere: Prisma.AdminTypeWhereInput = {
  OR: [
    { has_duration: true },
    { name: { contains: "захиал", mode: "insensitive" } },
    { name: { contains: "урьдчил", mode: "insensitive" } },
    { name: { contains: "preorder", mode: "insensitive" } },
    { name: { contains: "live", mode: "insensitive" } },
    { name: { contains: "лайв", mode: "insensitive" } },
  ],
};

export function normalizeSummaryStatus(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function isHandedSummaryStatus(value?: string | null) {
  const normalized = normalizeSummaryStatus(value);
  return normalized.includes("олгосон") || normalized.includes("pickup") || normalized.includes("picked");
}

export function isDeliveredSummaryStatus(value?: string | null) {
  const normalized = normalizeSummaryStatus(value);
  return normalized.includes("хүргэгд") || normalized.includes("delivered") || normalized.includes("completed");
}

export function isOpenPreorderSummaryType(type?: { name?: string | null; has_duration?: boolean | null } | null) {
  if (!type) return false;
  if (type.has_duration === true) return true;
  const name = String(type.name ?? "").toLowerCase();
  if (name.includes("захиал") || name.includes("урьдчил") || name.includes("preorder")) return true;
  if (name.includes("лайв") || name.includes("live")) return true;
  if (name.includes("бэлэн") || name.includes("ready")) return false;
  return false;
}

export type SummaryFilterVariant = {
  closed: boolean;
  arrived: boolean;
  pending_qty: number;
};

export type SummaryFilterGroup = {
  arrival_status?: string | null;
  arrived_qty?: number | null;
};

export function getVisibleVariantsForSummaryTab(args: {
  openOnly: boolean;
  closedOnly: boolean;
  arrivedOnly: boolean;
  variants: SummaryFilterVariant[];
}) {
  const { openOnly, closedOnly, arrivedOnly, variants } = args;
  if (openOnly) return variants;
  if (closedOnly) return variants.filter((variant) => variant.closed && !variant.arrived);
  if (arrivedOnly) return variants.filter((variant) => variant.arrived || variant.pending_qty > 0);
  return variants.filter((variant) => variant.pending_qty > 0);
}

export function shouldIncludeOpenOnlySummaryGroup(args: {
  hasProductMeta: boolean;
  isPreorderSource: boolean;
  closedItem: boolean;
  variants: SummaryFilterVariant[];
  effectiveStock: number | null;
}) {
  const { hasProductMeta, isPreorderSource, closedItem, variants, effectiveStock } = args;
  if (!hasProductMeta) return false;
  if (!isPreorderSource) return false;
  if (closedItem) return false;
  if (variants.length > 0 && !variants.some((variant) => !variant.closed)) return false;
  if (variants.length === 0 && (effectiveStock == null || effectiveStock <= 0)) return false;
  return true;
}

export function shouldIncludeArrivedSummaryGroup(args: {
  group: SummaryFilterGroup;
  variants: SummaryFilterVariant[];
}) {
  const { group, variants } = args;
  const productArrived = group.arrival_status === "Бараа ирсэн" || group.arrived_qty != null;
  const variantArrived = variants.some((variant) => variant.arrived);
  return productArrived || variantArrived;
}

export function shouldIncludeClosedSummaryGroup(args: {
  closedItem: boolean;
  variants: SummaryFilterVariant[];
  group: SummaryFilterGroup;
  allVariantsArrived: boolean;
}) {
  const { closedItem, variants, group, allVariantsArrived } = args;
  if (!closedItem && !variants.some((variant) => variant.closed)) return false;
  if (group.arrival_status === "Бараа ирсэн" || allVariantsArrived) return false;
  return true;
}
