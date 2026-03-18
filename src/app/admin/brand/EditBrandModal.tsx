'use client';

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { X } from 'lucide-react';

interface Brand {
  id: number;
  name: string;
  image_url: string;
  description: string;
}

interface EditBrandModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (id: number, formData: FormData) => Promise<void>; // хадгалах үед дуудагдах функц
  brand: Brand | null;
}

const EditBrandModal: React.FC<EditBrandModalProps> = ({ open, onClose, onSubmit, brand }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setDescription(brand.description || '');
      setImage(null);
    }
  }, [brand]);

  // ESC товч дарсан үед хаах
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!open || !brand) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    if (image) formData.append('image', image);


    try {
      setLoading(true);
      await onSubmit(brand.id, formData);
      setDescription('');
      setImage(null);
      setError('');
      onClose();
    } catch (err) {
      setError('Ангилал засах үед алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };
  // const handleSubmit = async (e: FormEvent) => {
  //   e.preventDefault();
  //   await onSubmit(brand.id, name, description);
  // };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X />
        </button>
        <h2 className="text-xl font-semibold text-center mb-4">Брэнд засах</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Нэр</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 rounded-md w-full px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тайлбар</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border border-gray-300 rounded-md w-full px-3 py-2"
              rows={3}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600">
              Зураг сонгох
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                e.target.files && setImage(e.target.files[0])
              }
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                                          file:rounded-lg file:border-0
                                          file:text-sm file:font-semibold
                                          file:bg-[#1d3b86] file:text-white
                                          hover:opacity-90 cursor-pointer"
            />
          </div>
          {(image || brand.image_url) && (
            <img
              src={image ? URL.createObjectURL(image) : `${brand.image_url}`}
              alt="preview"
              className="mt-2 w-full h-32 object-cover rounded"
            />
          )}
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold w-full py-2 rounded-md transition-all"
          >
            {loading && <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2"></span>}
            {loading ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditBrandModal;
