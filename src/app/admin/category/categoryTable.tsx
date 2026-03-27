

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
import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash } from 'lucide-react';

interface SubCategory {
  id: number;
  name: string;
  description?: string;
}

export interface Category {
  category_id: number;
  category_name: string;
  category_image?: string;
  description?: string;
  subcategories: SubCategory[];
}

interface CategoryTableProps {
  categories: Category[];
  onDelete?: (id: number) => void;
  onEdit: (cat: Category) => void;
}

const CategoryTable = ({ categories, onDelete, onEdit }: CategoryTableProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null); // аль category нээгдсэн бэ

  const resolveImage = (src?: string) => {
    if (!src) return "";
    if (src.startsWith("http://") || src.startsWith("https://")) return src;
    return `${process.env.NEXT_PUBLIC_API_URL || ""}${src}`;
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      <Table>
        <TableCaption>Мэдээлэл</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Категори</TableHead>
            <TableHead>Тайлбар</TableHead>
            <TableHead>Зураг</TableHead>
            <TableHead>Үйлдэл</TableHead>
            <TableHead>Дэд ангилал</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {categories.map((cat) => (
            <>
              {/* ✅ Category Row */}
              <TableRow key={cat.category_id}>
                <TableCell>{cat.category_name}</TableCell>
                <TableCell>{cat.description || '-'}</TableCell>
                <TableCell>
                  {cat.category_image && (
                    <img
                      src={resolveImage(cat.category_image)}
                      alt={cat.category_name}
                      width={50}
                      height={50}
                      className="cursor-pointer rounded-md"
                      onClick={() =>
                        setSelectedImage(resolveImage(cat.category_image))
                      }
                    />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {/* 🟩 Expand / Collapse Button */}


                    {/* ✏️ Edit Button */}
                    <button
                      className="bg-orange-200 hover:bg-orange-500 text-black py-1 px-3 rounded text-xs"
                      onClick={() => onEdit(cat)}
                    >
                      <Pencil size={16} />
                    </button>

                    {/* 🗑️ Delete Button */}
                    <button
                      className="bg-red-200 hover:bg-red-500 text-black py-1 px-3 rounded text-xs"
                      onClick={() => onDelete && onDelete(cat.category_id)}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleExpand(cat.category_id)}
                    className="bg-blue-100 hover:bg-blue-300 text-black py-1 px-2 rounded text-xs"
                  >
                    {expanded === cat.category_id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                </TableCell>
              </TableRow>

              {/* 🔽 Subcategories Row (хэрэв нээгдсэн бол) */}
              {expanded === cat.category_id && cat.subcategories?.length > 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="bg-gray-50">
                    <div className="p-3">
                      <h4 className=" mb-2">Дэд ангиллууд:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {cat.subcategories.map((sub) => (
                          <li key={sub.id}>
                            <span >{sub.name}</span>{' '}
                            <span className="text-gray-600 text-sm">
                              {sub.description || ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Хэрвээ дэд ангилал байхгүй бол */}
              {expanded === cat.category_id && cat.subcategories?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="bg-gray-50 text-gray-500 italic text-center">
                    Дэд ангилал алга байна
                  </TableCell>
                </TableRow>
              )}
            </>
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
            alt="Category"
            className="max-h-[80vh] max-w-[80vw] rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default CategoryTable;
