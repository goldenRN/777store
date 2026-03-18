'use client';

import React, { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { X } from 'lucide-react';

interface AddBrandModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  // onSubmit: (data: { name: string; description: string }) => Promise<void>;
}

const AddBrandModal: React.FC<AddBrandModalProps> = ({ open, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  // ESC товч дарахад хаагдах
  // useEffect(() => {
  //   const handleEsc = (e: KeyboardEvent) => {
  //     if (e.key === 'Escape') onClose();
  //   };
  //   window.addEventListener('keydown', handleEsc);
  //   return () => window.removeEventListener('keydown', handleEsc);
  // }, [onClose]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setError('Зурагны хэмжээ 2MB-аас хэтрэхгүй байх ёстой');
      return;
    }
    setError('');
    setLogo(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    if (name) formData.append('name', name);
    if (description) formData.append('description', description);
    if (logo) formData.append('image', logo);
    e.preventDefault();
    if (!name.trim()) return alert('Брэндийн нэрийг оруулна уу');
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
    setName('');
    setDescription('');
    setLogo(null);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X />
        </button>
        <h2 className="text-xl font-semibold text-center mb-4">Брэнд нэмэх</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Нэр</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 rounded-md w-full px-3 py-2"
              placeholder="Жишээ: Samsung, LG, Bosch..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тайлбар</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border border-gray-300 rounded-md w-full px-3 py-2"
              rows={3}
              placeholder="Брэндийн тухай товч тайлбар..."
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600">
              Зураг сонгох
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                         file:rounded-lg file:border-0
                         file:text-sm file:font-semibold
                         file:bg-[#1d3b86] file:text-white
                         hover:opacity-90 cursor-pointer"
            />
          </div>

          {/* Preview */}
          {logo && (
            <img
              src={URL.createObjectURL(logo)}
              alt="preview"
              width={100}
              height={80}
              className="mt-2 w-full h-32 object-cover rounded"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold w-full py-2 rounded-md transition-all"
          >
            {loading ? 'Хадгалж байна...' : 'Нэмэх'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddBrandModal;
