'use client'

import React, { useState, useEffect, FormEvent } from 'react'
import { Plus } from 'lucide-react'
import BackButton from '@/components/BackButton'
import UnitTable from './UnitTable'
import AddUnitModal from './AddUnitModal'
import EditUnitModal from './EditUnitModal'

interface Unit {
  id: number
  name: string
  description: string
}

const UnitPage = () => {
  const [units, setUnits] = useState<Unit[]>([])
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editUnit, setEditUnit] = useState<Unit | null>(null)

  useEffect(() => {
    fetchUnits()
  }, [])

  const fetchUnits = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/unit`)
    const data = await res.json()
    setUnits(data)
  }

  const handleAddUnit = async (data: { name: string; description: string }) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/unit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setOpenAdd(false)
    fetchUnits()
  }

  const handleEdit = (unit: Unit) => {
    setEditUnit(unit)
    setOpenEdit(true)
  }

  const handleUpdateUnit = async (id: number, name: string, description: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/unit/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    setOpenEdit(false)
    fetchUnits()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Устгах уу?')) return
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/unit/${id}`, { method: 'DELETE' })
    fetchUnits()
  }

  return (
    <div className="w-[calc(100vw-300px)] p-4">
      <div className="flex justify-between items-center bg-white sticky top-0 z-10 p-2 mb-4">
        <BackButton text="Буцах" link="/admin/dashboard" />
        <button
          className="bg-yellow-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded text-xs flex items-center gap-2"
          onClick={() => setOpenAdd(true)}
        >
          <Plus size={15} /> Нэмэх
        </button>
      </div>

      <UnitTable units={units} onEdit={handleEdit} onDelete={handleDelete} />

      <AddUnitModal open={openAdd} onClose={() => setOpenAdd(false)} onSubmit={handleAddUnit} />
      <EditUnitModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        onSubmit={handleUpdateUnit}
        unit={editUnit}
      />
    </div>
  )
}

export default UnitPage
