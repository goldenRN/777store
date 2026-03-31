'use client';

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import BackButton from '@/components/BackButton';
import BrandTable from './BrandTable';
import AddBrandModal from './AddBrandModal';
import EditBrandModal from './EditBrandModal';

interface Brand {
  id: number;
  image_url: string;
  name: string;
  description: string;
}

const BrandPage = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);

  const fetchBrands = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/brand`);
    const data = await res.json();
    setBrands(data);
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleAddBrand = async (formData: FormData) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/brand`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user.token}` },
      body: formData,
      // body: JSON.stringify(data),
    });
    setOpenAdd(false);
    fetchBrands();
  };

  const handleEdit = (brand: Brand) => {
    setEditBrand(brand);
    setOpenEdit(true);
  };

  const handleUpdateBrand = async (id: number, formData: FormData) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/brand/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${user.token}` },
      body: formData,
    });
    setOpenEdit(false);
    fetchBrands();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Устгах уу?')) return;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/brand/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        return alert(error.message || 'Устгах үед алдаа гарлаа');
      }
      setBrands((prev) => prev.filter((brnd) => brnd.id !== id));
      alert('Амжилттай устлаа');
    } catch (err) {
      alert('Серверийн алдаа');
    }
  };

  return (
    <div className="w-full p-4 md:p-6">
      <div className="flex justify-between items-center bg-white sticky top-0 z-10 p-2 mb-4">
        <BackButton text="Буцах" link="/admin/dashboard" />
        <button
          className="bg-yellow-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded text-xs flex items-center gap-2"
          onClick={() => setOpenAdd(true)}
        >
          <Plus size={15} /> Брэнд нэмэх
        </button>
      </div>

      <BrandTable brands={brands} onEdit={handleEdit} onDelete={handleDelete} />

      <AddBrandModal open={openAdd} onClose={() => setOpenAdd(false)} onSubmit={handleAddBrand} />
      <EditBrandModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        onSubmit={handleUpdateBrand}
        brand={editBrand}
      />

    </div>
  );
};

export default BrandPage;
