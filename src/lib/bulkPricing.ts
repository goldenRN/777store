export type BulkPriceTier = {
  min_qty: number;
  price: number;
};

const toTier = (raw: unknown): BulkPriceTier | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const minRaw = r["min_qty"] ?? r["minQty"] ?? r["qty"];
  const priceRaw = r["price"];
  const min = Math.floor(Number(minRaw ?? 0));
  const price = Math.round(Number(priceRaw ?? 0));
  if (!Number.isFinite(min) || min <= 0) return null;
  if (!Number.isFinite(price) || price <= 0) return null;
  return { min_qty: min, price };
};

export const normalizeBulkTiers = (raw: unknown): BulkPriceTier[] => {
  if (!Array.isArray(raw)) return [];
  const tiers = raw.map(toTier).filter(Boolean) as BulkPriceTier[];
  // Unique by min_qty: keep the cheapest price for that threshold
  const byMin = new Map<number, number>();
  for (const t of tiers) {
    const prev = byMin.get(t.min_qty);
    if (prev == null || t.price < prev) byMin.set(t.min_qty, t.price);
  }
  return Array.from(byMin.entries())
    .map(([min_qty, price]) => ({ min_qty, price }))
    .sort((a, b) => a.min_qty - b.min_qty);
};

export const getBulkUnitPrice = (basePrice: number, qty: number, tiersRaw: unknown): number => {
  const base = Math.max(0, Math.round(Number(basePrice || 0)));
  const q = Math.max(1, Math.floor(Number(qty || 1)));
  const tiers = normalizeBulkTiers(tiersRaw);
  let best = base;
  for (const t of tiers) {
    if (q >= t.min_qty) best = t.price;
  }
  return best;
};
