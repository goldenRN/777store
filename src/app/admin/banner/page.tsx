'use client';

import React, { useState, useEffect } from 'react';
import AddBannerModal from './AddBannerModal';
import EditBannerModal from './EditBannerModal';
import BannerTable from './BannerTable';
import BackButton from '@/components/BackButton';
import { Plus, Loader2 } from 'lucide-react';
import { Banner } from './EditBannerModal'

const BannerPage: React.FC = () => {
  const [banner, setBanner] = useState<Banner[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch categories on mount
  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banner`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (!res.ok) throw new Error(' мэдээлэл татахад алдаа гарлаа');
      const data = await res.json();

      const formatted: Banner[] = data.map((c: any) => ({
        id: c.id,
        image_url: c.image_url,
        description: c.description,
      }));

      setBanner(formatted);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Мэдээлэл татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add new category
  const handleAddCategory = async (formData: FormData) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banner`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData,
      });

      if (!res.ok) throw new Error(' нэмэх үед алдаа гарлаа');
      setOpenModal(false);
      await fetchBanners();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ✅ Edit button click handler
  const handleEditClick = (cat: Banner) => {
    setEditBanner(cat);
    setEditModalOpen(true);
  };

  // ✅ Update category info
  const handleUpdateBanner = async (id: number, formData: FormData) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banner/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || ' засахад алдаа гарлаа');
      }

      setEditModalOpen(false);
      await fetchBanners();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ✅ Delete category
  const handleDeleteBanner = async (id: number) => {
    const confirmed = window.confirm(' устгах уу?');
    if (!confirmed) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/banner/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Устгах үед алдаа гарлаа');
      }

      setBanner((prev) => prev.filter((b) => b.id !== id));
      alert('Амжилттай устгалаа');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="w-[calc(100vw-300px)] p-4">
      {/* Header section */}
      <div className="flex justify-between items-center bg-white sticky top-0 z-10 p-2 mb-4 border-b">
        <BackButton text="Буцах" link="/admin/dashboard" />
        <button
          className="bg-yellow-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded text-xs flex items-center gap-2"
          onClick={() => setOpenModal(true)}
        >
          <Plus size={15} /> Нэмэх
        </button>
      </div>

      {/* Loading / Error / Table */}
      {loading ? (
        <div className="flex justify-center items-center h-40 text-gray-500">
          <Loader2 className="animate-spin mr-2" /> Уншиж байна...
        </div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : (
        <BannerTable
          banner={banner}
          onEdit={handleEditClick}
          onDelete={handleDeleteBanner}
        />
      )}

      {/* Modals */}
      <EditBannerModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleUpdateBanner}
        banner={editBanner}
      />
      <AddBannerModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={handleAddCategory}
      />
    </div>
  );
};

export default BannerPage;



