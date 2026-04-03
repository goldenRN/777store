'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import React, { useState } from 'react';
import { Pencil, Trash } from 'lucide-react';
import { Banner } from './EditBannerModal'


interface BannerTableProps {
  banner: Banner[];
  onDelete?: (id: number) => void;
  onEdit: (cat: Banner) => void;
}

const BannerTable = ({ banner, onDelete, onEdit }: BannerTableProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);


  return (
    <div>
      <Table>
        <TableCaption>Мэдээлэл</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Тайлбар</TableHead>
            <TableHead>Зураг</TableHead>
            <TableHead>Үйлдэл</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {banner.map((b) => (
            <React.Fragment key={b.id}>
              {/* ✅ Category Row */}
              <TableRow key={b.id}>
                <TableCell>{b.description || '-'}</TableCell>
                <TableCell>
                  {b.image_url && (
                    <img
                      src={b.image_url}
                      width={150}
                      height={100}
                      className="cursor-pointer rounded-md object-cover border border-gray-200 shadow-sm"
                      alt={b.description}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {/* 🟩 Expand / Collapse Button */}


                    {/* ✏️ Edit Button */}
                    <button
                      className="bg-orange-200 hover:bg-red-500 text-black py-1 px-3 rounded text-xs"
                      onClick={() => onEdit(b)}
                    >
                      <Pencil size={16} />
                    </button>

                    {/* 🗑️ Delete Button */}
                    <button
                      className="bg-red-200 hover:bg-red-500 text-black py-1 px-3 rounded text-xs"
                      onClick={() => onDelete && onDelete(b.id)}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </TableCell>

              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* 🖼️ Зураг томруулж харах modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/70 flex justify-center items-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Banner"
            className="max-h-[80vh] max-w-[80vw] rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default BannerTable;
