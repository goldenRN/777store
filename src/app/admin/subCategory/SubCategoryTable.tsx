'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
  TableFooter,
} from '@/components/ui/table';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Pencil, Trash } from 'lucide-react';
import { SubCategory } from '@/app/types/subcategory';
// import { Category } from '@/app/types/category';

interface SubCategoryTableProps {
  subCategories: SubCategory[];
  onDelete?: (id: number) => void; // устгах callback
  onEdit: (scat: SubCategory) => void; // edit товчоо callback
}

const SubCategoryTable = ({ subCategories, onDelete, onEdit }: SubCategoryTableProps) => {
  // const [category, setCategories] = useState<Category[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div >

      <Table>
        <TableCaption> Мэдээлэл</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Категори</TableHead>
            <TableHead>Дэд Категори</TableHead>
            <TableHead>Тайлбар</TableHead>
            <TableHead>Үйлдэл</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subCategories.map((scat) => (
            <TableRow key={scat.id}>
              <TableCell>{scat.category_name}</TableCell>
              <TableCell>{scat.name}</TableCell>
              <TableCell>
                {scat.description}
              </TableCell>

              <TableCell>
                <div className="flex gap-2">
                  <button
                    className="bg-orange-200 hover:bg-orange-500 text-black font-bold py-1 px-3 rounded text-xs"
                    onClick={() => onEdit(scat)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-200 hover:bg-red-500 text-black font-bold py-1 px-3 rounded text-xs"
                    onClick={() => onDelete ? onDelete(scat.id) : null}
                  >
                    <Trash size={16} />
                  </button>
                </div>
                
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

      </Table>
      {/* Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="subCategory"
            style={{ maxHeight: "80%", maxWidth: "80%" }}
          />
        </div>
      )}
    </div>
  );
};

export default SubCategoryTable;
