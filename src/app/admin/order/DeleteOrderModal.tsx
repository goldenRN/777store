"use client";

import { Modal } from "@/components/ui/modal";
import type { Order } from "./types";

type DeleteOrderModalProps = {
  open: boolean;
  target: Order | null;
  reason: string;
  saving: boolean;
  onClose: () => void;
  onReasonChange: (value: string) => void;
  onSave: () => void;
};

export default function DeleteOrderModal({
  open,
  target,
  reason,
  saving,
  onClose,
  onReasonChange,
  onSave,
}: DeleteOrderModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Захиалга устгах">
      <div className="space-y-4">
        <div className="text-sm text-gray-700">
          <div className="font-semibold">Захиалга #{target?.id}</div>
          <div className="text-xs text-gray-500">
            {target?.name ? `${target.name} • ` : ""}
            {target?.phone1 || ""}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600">Устгах шалтгаан</label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            className="mt-1 min-h-[110px] w-full rounded border px-3 py-2"
            placeholder="Яагаад устгаж байгаа вэ?"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-4 py-2">
            Болих
          </button>
          <button
            onClick={onSave}
            className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
            disabled={saving}
          >
            Устгах
          </button>
        </div>
      </div>
    </Modal>
  );
}
