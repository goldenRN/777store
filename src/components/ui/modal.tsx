"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Modal({ open, onClose, children, title = "Dialog" }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />

      <Dialog.Content className="fixed inset-0 z-50 overflow-y-auto p-2 sm:p-4">
        <Dialog.Title className="sr-only">{title}</Dialog.Title>
        <div className="flex min-h-full items-start justify-center sm:items-center">
          <div className="bg-white w-full max-w-6xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl shadow-xl p-4 sm:p-6">
            {children}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
