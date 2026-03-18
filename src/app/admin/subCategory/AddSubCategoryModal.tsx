'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Category } from '@/app/types/category';



interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; category_id: number }) => void;
  category: Category[];
}

const AddSubCategoryModal: React.FC<AddCategoryModalProps> = ({ open, onClose, onSubmit, category }) => {
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [description, setDescription] = useState('');
  const [category_id, setCategoryId] = useState<number>(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [parentCategory, setParentCategory] = useState<string>(''); // parent ID хадгална

  // ESC дарахад хаагдана, ангиллуудыг татна
  useEffect(() => {
    setCategories(category)
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Дэд ангиллын нэрийг заавал оруулна уу');
      return;
    }
    if (!parentCategory) {
      setError('Үндсэн ангиллыг заавал сонгоно уу');
      return;
    }

    try {
      setLoading(true);
      const category_id = Number(parentCategory); // select-аас ирсэн string → number хөрвүүлнэ

      await onSubmit({
        name,
        description,
        category_id,
      });

      // Reset form
      setName('');
      setDescription('');
      setParentCategory('');
      setError('');
      onClose();
    } catch (err) {
      console.error(err);
      setError('Нэмэх үед алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

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
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Дэд ангилал нэмэх</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 font-bold text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Error */}
        {error && <p className="text-red-500 mb-2">{error}</p>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category chooser */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600">
              Ангилал сонгоно уу
            </label>
            <select
              value={parentCategory}
              onChange={(e) => setParentCategory(e.target.value)}
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
            Дэд ангилал
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
            className="w-full bg-gradient-to-r from-[#d49943] via-[#dfa243] to-[#edad45] text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition flex justify-center items-center"
          >
            {loading && (
              <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2"></span>
            )}
            {loading ? 'Нэмэх...' : 'Нэмэх'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddSubCategoryModal;
