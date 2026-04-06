type VariantAttr = Record<string, unknown> | null | undefined;

export function getVariantLabel(
  attribute: VariantAttr,
  sku?: string | null,
  fallbackId?: number | null
) {
  const attr = (attribute || {}) as Record<string, unknown>;
  const type = typeof attr.type === "string" ? attr.type : "";
  const color = typeof attr.color === "string" ? attr.color : "";
  const size = typeof attr.size === "string" ? attr.size : "";
  const merged = [type, color, size].filter(Boolean).join(" / ");
  if (merged) return merged;
  if (sku) return sku;
  if (fallbackId != null) return `Төрөл-${fallbackId}`;
  return "";
}
