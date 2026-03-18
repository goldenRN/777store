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
import { Pencil, Trash } from 'lucide-react';

interface Brand {
  id: number;
  image_url: string;
  name: string;
  description: string;
}

interface BrandTableProps {
  brands: Brand[];
  onEdit: (brand: Brand) => void;
  onDelete?: (id: number) => void;
}

const BrandTable = ({ brands, onEdit, onDelete }: BrandTableProps) => {
  return (
    <div>
      <Table>
        <TableCaption>Брэндийн бүртгэл</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Нэр</TableHead>
            <TableHead>Лого</TableHead>
            <TableHead>Тайлбар</TableHead>
            <TableHead>Үйлдэл</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.map((b) => (
            <TableRow key={b.id}>
              <TableCell>{b.name}</TableCell>
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
              <TableCell>{b.description}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <button
                    className="bg-blue-100 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded text-xs"
                    onClick={() => onEdit(b)}
                  >
                    <Pencil className="text-slate-800" size={20} />
                  </button>
                  <button
                    className="bg-red-100 hover:bg-red-500 text-white font-bold py-2 px-4 rounded text-xs"
                    onClick={() => onDelete && onDelete(b.id)}
                  >
                    <Trash className="text-slate-800" size={20} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BrandTable;
