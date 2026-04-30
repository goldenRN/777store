"use client";

import { Modal } from "@/components/ui/modal";
import type { ArrivedTarget } from "./types";

type ArrivedModalProps = {
  open: boolean;
  target: ArrivedTarget | null;
  mode?: "arrived" | "edit";
  qty: string;
  cargoFee: string;
  cargoNote: string;
  saving: boolean;
  onClose: () => void;
  onQtyChange: (value: string) => void;
  onCargoFeeChange: (value: string) => void;
  onCargoNoteChange: (value: string) => void;
  onSave: () => void;
};

export default function ArrivedModal({
  open,
  target,
  mode = "arrived",
  qty,
  cargoFee,
  cargoNote,
  saving,
  onClose,
  onQtyChange,
  onCargoFeeChange,
  onCargoNoteChange,
  onSave,
}: ArrivedModalProps) {
  const isEditMode = mode === "edit";
  return (
    <Modal open={open} onClose={onClose} title={isEditMode ? "Карго засах" : "Бараа ирсэн"}>
      <div className="space-y-4">
        <div className="text-sm text-gray-700">
          <div className="font-semibold">{target?.productName ?? "Бараа"}</div>
          {target?.variantLabel ? (
            <div className="text-xs text-gray-600">Төрөл: {target.variantLabel}</div>
          ) : target?.applyToAllVariants ? (
            <div className="text-xs text-gray-600">Энэ барааны бүх төрөлд нэг мөр бүртгэнэ.</div>
          ) : null}
          <div className="text-xs text-gray-500">
            {isEditMode ? "Карго үнэ, тайлбараа засаад хадгална." : "Ирсэн тоо, карго үнэ оруулаад хадгална."}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600">Ирсэн тоо (ш)</label>
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => onQtyChange(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="Ж: 10"
            disabled={isEditMode}
          />
          <div className="mt-1 text-[11px] text-gray-500">
            {isEditMode
              ? "Ирсэн тоо энэ цонхноос засагдахгүй, зөвхөн карго мэдээлэл шинэчлэгдэнэ."
              : "Default утга нь “Захиалсан” тоотой тэнцүү. Хуваагдаж ирсэн/гэмтэлтэй бол багасгаж засч болно."}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600">Карго (₮)</label>
          <input
            type="number"
            min={0}
            value={cargoFee}
            onChange={(e) => onCargoFeeChange(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="Ж: 12000"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Тайлбар</label>
          <textarea
            value={cargoNote}
            onChange={(e) => onCargoNoteChange(e.target.value)}
            className="mt-1 min-h-[88px] w-full rounded border px-3 py-2"
            placeholder="Ж: Карго 2 багц, 4/20-нд ирнэ гэх мэт"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Болих
          </button>
          <button
            onClick={onSave}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            disabled={saving}
          >
            Хадгалах
          </button>
        </div>
      </div>
    </Modal>
  );
}
