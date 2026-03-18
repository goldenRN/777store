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

export interface State {
  id: number;
  name: string;
  description:string;
}

interface StateTableProps {
  states: State[];
  onDelete?: (id: number) => void;
  onEdit: (state: State) => void;
}

const StateTable = ({ states, onDelete, onEdit }: StateTableProps) => {
  return (
    <div>
      <Table>
        <TableCaption>Нэршил бүртгэл</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Төлөв</TableHead>
             <TableHead>Тайлбар</TableHead>
            <TableHead>Үйлдэл</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {states.map((st) => (
            <TableRow key={st.id}>
              <TableCell>{st.name}</TableCell>
               <TableCell>{st.description}</TableCell>
              <TableCell>
                 <div className="flex gap-2">
                  <button
                    className="bg-orange-200 hover:bg-orange-500 text-black font-bold py-1 px-3 rounded text-xs"
                    onClick={() => onEdit(st)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="bg-red-200 hover:bg-red-500 text-black font-bold py-1 px-3 rounded text-xs"
                    onClick={() => onDelete ? onDelete(st.id) : null}
                  >
                    <Trash size={16} />
                  </button>
                </div>
                {/* <div className="flex items-center gap-3">
                  <button
                    className="bg-orange-200 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded text-xs"
                     onClick={() => onEdit(st)}
                  >
                    <Pencil className="text-slate-800" size={20} />
                  </button>

                  <button
                    className="bg-red-200 hover:bg-red-500 text-white font-bold py-2 px-4 rounded text-xs"
                    onClick={() => onDelete && onDelete(st.id)}
                  >
                    <Trash className="text-slate-800" size={20} />
                  </button>
                </div> */}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default StateTable;
