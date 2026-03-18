'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubCategory } from '@/app/types/subcategory';
import { Category } from '@/app/types/category';
interface EditSubCategoryModalProps {
  open: boolean;
  onClose: () => void;
  category: SubCategory | null; 
  onSubmit: (id: number, data: { name: string; description?: string; category_id: number }) => Promise<void>;
}

const EditSubCategoryModal: React.FC<EditSubCategoryModalProps> = ({
  open,
  onClose,
  category,
  onSubmit,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
      setCategoryId(category.category_id || 0);
    }
  }, [category]);

  useEffect(() => {
    if (open) fetchCategories();
  }, [open]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category`);
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Дэд ангиллын нэрийг оруулна уу');
      return;
    }
    if (!categoryId) {
      setError('Үндсэн ангиллыг сонгоно уу');
      return;
    }
    if (!category) return;

    try {
      setLoading(true);
      await onSubmit(category.id, { name, description, category_id: categoryId });
      setError('');
      onClose();
    } catch (err) {
      console.error(err);
      setError('Засах үед алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !category) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md relative p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Дэд ангилал засах</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 font-bold text-2xl"
          >
            &times;
          </button>
        </div>

        {error && <p className="text-red-500 mb-2">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600">
              Үндсэн ангилал
            </label>
            <select
              value={categoryId || ''}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1d3b86] outline-none"
            >
              <option value="">Ангилал</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          <label className="block mb-1 text-sm font-medium text-gray-600">
            Дэд ангиллын нэр
          </label>
          <Input
            placeholder="Дэд ангиллын нэр"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label className="block mb-1 text-sm font-medium text-gray-600">
            Тайлбар
          </label>
          <Input
            placeholder="Тайлбар"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#1d3b86] via-[#2b4ea2] to-[#3b5fc3] text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition flex justify-center items-center"
          >
            {loading && (
              <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2"></span>
            )}
            {loading ? 'Хадгалж байна...' : 'Хадгалах'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default EditSubCategoryModal;
