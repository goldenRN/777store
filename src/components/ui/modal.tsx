"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      {/* Overlay нь бүх дэлгэцийг cover хийнэ */}
      <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />

      {/* Content нь center-д байрлана, full screen */}
      <Dialog.Content className="fixed inset-0 z-50 overflow-auto flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-6xl h-[90vh] md:h-auto rounded-2xl shadow-xl p-6">
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
