"use client";

import { Modal } from "@/components/ui/modal";
import { X } from "lucide-react";
import type { ProductSummary } from "./types";

type ProductDetailModalProps = {
  productDetail: ProductSummary | null;
  onClose: () => void;
};

export default function ProductDetailModal({
  productDetail,
  onClose,
}: ProductDetailModalProps) {
  if (!productDetail) return null;

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
        <div className="max-h-[60vh] overflow-y-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Захиалга</th>
                <th className="px-3 py-2 text-left">Хэрэглэгч</th>
                <th className="px-3 py-2 text-left">Утас</th>
                <th className="px-3 py-2 text-left">Тоо</th>
                <th className="px-3 py-2 text-left">Нэгж үнэ</th>
                <th className="px-3 py-2 text-left">Нийт үнэ</th>
              </tr>
            </thead>
            <tbody>
              {productDetail.buyers.map((buyer, idx) => (
                <tr key={`${buyer.order_id}-${idx}`} className="border-t">
                  <td className="px-3 py-2">#{buyer.order_id}</td>
                  <td className="px-3 py-2">{buyer.name}</td>
                  <td className="px-3 py-2">{buyer.phone}</td>
                  <td className="px-3 py-2">{buyer.qty}</td>
                  <td className="px-3 py-2">{Number(buyer.unit_price).toLocaleString()}₮</td>
                  <td className="px-3 py-2">{Number(buyer.total_price).toLocaleString()}₮</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
