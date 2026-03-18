'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, Trash } from 'lucide-react'

interface Unit {
  id: number
  name: string
  description: string
}

interface Props {
  units: Unit[]
  onEdit: (unit: Unit) => void
  onDelete: (id: number) => void
}

const UnitTable = ({ units, onEdit, onDelete }: Props) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Нэгжийн нэр</TableHead>
        <TableHead>Тайлбар</TableHead>
        <TableHead>Үйлдэл</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {units.map((u) => (
        <TableRow key={u.id}>
          <TableCell>{u.name}</TableCell>
          <TableCell>{u.description}</TableCell>
          <TableCell>
            <div className="flex gap-2">
              <button
                className="bg-orange-200 hover:bg-orange-500 text-black font-bold py-1 px-3 rounded text-xs"
                onClick={() => onEdit(u)}
              >
                <Pencil size={16} />
              </button>
              <button
                className="bg-red-200 hover:bg-red-500 text-black font-bold py-1 px-3 rounded text-xs"
                onClick={() => onDelete(u.id)}
              >
                <Trash size={16} />
              </button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
)

export default UnitTable
