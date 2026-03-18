"use client";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ImageViewerModalProps {
  open: boolean;
  onClose: () => void;
  images: string[];
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ open, onClose, images }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Барааны зураг</DialogTitle>
        </DialogHeader>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`image-${i}`}
                className="w-full h-48 object-cover rounded-lg border"
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-6">Зураг олдсонгүй.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewerModal;
