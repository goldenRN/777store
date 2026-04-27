"use client";

import { Modal } from "@/components/ui/modal";
import { Plus, Trash2 } from "lucide-react";
import type {
  AdminProductOption,
  CreateItemDraft,
  PaymentMethod,
  VariantOption,
} from "./types";

type CreateOrderModalProps = {
  open: boolean;
  createLoading: boolean;
  createPhone: string;
  createName: string;
  createEmail: string;
  createItems: CreateItemDraft[];
  productOptions: AdminProductOption[];
  variantOptions: Record<number, VariantOption[]>;
  paymentMethods: PaymentMethod[];
  paymentMethodId: number | "";
  orderItemTotal: number;
  onClose: () => void;
  onCreatePhoneChange: (value: string) => void;
  onCreateNameChange: (value: string) => void;
  onCreateEmailChange: (value: string) => void;
  onCreateItemsChange: (items: CreateItemDraft[]) => void;
  onPaymentMethodChange: (value: number | "") => void;
  onSave: () => void;
  getUnitPriceForVariant: (productId: number, variantId: number | null, qty: number) => number;
  getVariantLabel: (variant: VariantOption) => string;
};

export default function CreateOrderModal({
  open,
  createLoading,
  createPhone,
  createName,
  createEmail,
  createItems,
  productOptions,
  variantOptions,
  paymentMethods,
  paymentMethodId,
  orderItemTotal,
  onClose,
  onCreatePhoneChange,
  onCreateNameChange,
  onCreateEmailChange,
  onCreateItemsChange,
  onPaymentMethodChange,
  onSave,
  getUnitPriceForVariant,
  getVariantLabel,
}: CreateOrderModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Захиалга үүсгэх">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Захиалга үүсгэх</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm text-gray-600">Утас</label>
            <input
              value={createPhone}
              onChange={(e) => onCreatePhoneChange(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="Ж: 99xxxxxx"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Нэр</label>
            <input
              value={createName}
              onChange={(e) => onCreateNameChange(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="Нэр"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Имэйл</label>
            <input
              value={createEmail}
              onChange={(e) => onCreateEmailChange(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="Имэйл"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Захиалгын бараа</h3>
            <button
              onClick={() =>
                onCreateItemsChange([...createItems, { product_id: "", qty: 1, variant_id: "" }])
              }
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
                <Plus className="h-3 w-3" />
              </span>
              Бараа нэмэх
            </button>
          </div>

          {createItems.map((item, idx) => (
            <div key={idx} className="rounded-xl border bg-white p-3 shadow-sm md:p-4">
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[2fr_1.2fr_160px]">
                <div>
                  <input
                    list={`product-list-${idx}`}
                    value={item.product_query ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const needle = value.trim().toLowerCase();
                      const next: CreateItemDraft[] = createItems.map((row, i) =>
                        i === idx ? { ...row, product_query: value, product_id: "", variant_id: "" } : row
                      );
                      const hit = productOptions.find((p) => p.name.toLowerCase() === needle);
                      if (hit) {
                        next[idx] = {
                          ...next[idx],
                          product_id: hit.id,
                          product_query: hit.name,
                          variant_id: "",
                        };
                      }
                      onCreateItemsChange(next);
                    }}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Бараа хайж сонгох..."
                  />
                  <datalist id={`product-list-${idx}`}>
                    {productOptions
                      .filter((product) =>
                        (item.product_query ?? "").trim()
                          ? product.name
                              .toLowerCase()
                              .includes((item.product_query ?? "").trim().toLowerCase())
                          : true
                      )
                      .slice(0, 10)
                      .map((product) => (
                        <option key={product.id} value={product.name} />
                      ))}
                  </datalist>
                </div>

                <div>
                  <select
                    value={item.variant_id === "" || item.variant_id == null ? "" : String(item.variant_id)}
                    onChange={(e) => {
                      onCreateItemsChange(
                        createItems.map((row, i) =>
                          i === idx
                            ? { ...row, variant_id: e.target.value ? Number(e.target.value) : "" }
                            : row
                        )
                      );
                    }}
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={!item.product_id}
                  >
                    <option value="">Төрөл сонгох</option>
                    {item.product_id &&
                      (variantOptions[Number(item.product_id)] || []).map((variant) => {
                        const productId = Number(item.product_id);
                        const unit = getUnitPriceForVariant(
                          productId,
                          variant.id,
                          Number(item.qty || 1)
                        );
                        return (
                          <option key={variant.id} value={variant.id}>
                            {getVariantLabel(variant)} — {Number(unit || 0).toLocaleString()}₮
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) => {
                      onCreateItemsChange(
                        createItems.map((row, i) =>
                          i === idx ? { ...row, qty: Number(e.target.value) } : row
                        )
                      );
                    }}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                  <button
                    onClick={() => onCreateItemsChange(createItems.filter((_, i) => i !== idx))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border text-red-600 hover:bg-red-50"
                    aria-label="Устгах"
                    title="Устгах"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-gray-600">Төлбөрийн төрөл</label>
            <select
              value={paymentMethodId === "" ? "" : String(paymentMethodId)}
              onChange={(e) => onPaymentMethodChange(e.target.value ? Number(e.target.value) : "")}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="">Сонгох...</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Нийт: <span className="font-semibold">{orderItemTotal.toLocaleString()}₮</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Хаах
          </button>
          <button
            onClick={onSave}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            disabled={createLoading}
          >
            Хадгалах
          </button>
        </div>
      </div>
    </Modal>
  );
}
