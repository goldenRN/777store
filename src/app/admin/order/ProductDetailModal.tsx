"use client";

import { Modal } from "@/components/ui/modal";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ProductSummary } from "./types";

type ProductDetailModalProps = {
  productDetail: ProductSummary | null;
  onClose: () => void;
};

type BuyerFilter = "all" | "received" | "pending";

export default function ProductDetailModal({
  productDetail,
  onClose,
}: ProductDetailModalProps) {
  const [filter, setFilter] = useState<BuyerFilter>("all");
  const buyers = productDetail?.buyers ?? [];

  useEffect(() => {
    setFilter("all");
  }, [productDetail?.product_id, productDetail?.product_name]);

  const receivedCount = useMemo(
    () => buyers.filter((buyer) => buyer.received).length,
    [buyers]
  );
  const pendingCount = Math.max(0, buyers.length - receivedCount);

  const visibleBuyers = useMemo(() => {
    if (filter === "received") return buyers.filter((buyer) => buyer.received);
    if (filter === "pending") return buyers.filter((buyer) => !buyer.received);
    return buyers;
  }, [buyers, filter]);

  if (!productDetail) return null;

  const filterButtonClass = (value: BuyerFilter) =>
    `inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
      filter === value
        ? "bg-black text-white"
        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
    }`;

  return (
    <Modal open={!!productDetail} onClose={onClose} title={productDetail.product_name}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{productDetail.product_name}</h3>
            <div className="text-sm text-gray-600">Нийт: {productDetail.total_qty}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            title="Хаах"
            aria-label="Хаах"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setFilter("all")} className={filterButtonClass("all")}>
            <span>Бүгд</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${filter === "all" ? "bg-white/15 text-white" : "bg-gray-100 text-gray-700"}`}>
              {buyers.length}
            </span>
          </button>
          <button type="button" onClick={() => setFilter("received")} className={filterButtonClass("received")}>
            <span>Авсан</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${filter === "received" ? "bg-emerald-400/20 text-emerald-100" : "bg-emerald-100 text-emerald-700"}`}>
              {receivedCount}
            </span>
          </button>
          <button type="button" onClick={() => setFilter("pending")} className={filterButtonClass("pending")}>
            <span>Аваагүй</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${filter === "pending" ? "bg-amber-400/20 text-amber-100" : "bg-amber-100 text-amber-700"}`}>
              {pendingCount}
            </span>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Захиалга</th>
                <th className="px-3 py-2 text-left">Хэрэглэгч</th>
                <th className="px-3 py-2 text-left">Утас</th>
                <th className="px-3 py-2 text-left">Төлөв</th>
                <th className="px-3 py-2 text-left">Тоо</th>
                <th className="px-3 py-2 text-left">Нэгж үнэ</th>
                <th className="px-3 py-2 text-left">Нийт үнэ</th>
              </tr>
            </thead>
            <tbody>
              {visibleBuyers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    Энэ шүүлтүүрт тохирох захиалагч алга.
                  </td>
                </tr>
              ) : (
                visibleBuyers.map((buyer, idx) => (
                  <tr key={`${buyer.order_id}-${idx}`} className="border-t">
                    <td className="px-3 py-2">#{buyer.order_id}</td>
                    <td className="px-3 py-2">{buyer.name}</td>
                    <td className="px-3 py-2">{buyer.phone}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          buyer.received
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {buyer.received ? "Авсан" : "Аваагүй"}
                      </span>
                    </td>
                    <td className="px-3 py-2">{buyer.qty}</td>
                    <td className="px-3 py-2">{Number(buyer.unit_price).toLocaleString()}₮</td>
                    <td className="px-3 py-2">{Number(buyer.total_price).toLocaleString()}₮</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
