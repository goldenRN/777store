'use client';

import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddBannerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

const AddBannerModal = ({ open, onClose, onSubmit }: AddBannerModalProps) => {

  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ESC товч дарахад хаагдах
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setError('Зурагны хэмжээ 2MB-аас хэтрэхгүй байх ёстой');
      return;
    }
    setError('');
    setImage(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    if (description) formData.append('description', description);
    if (image) formData.append('image', image);

    try {
      setLoading(true);
      await onSubmit(formData);
      setDescription('');
      setImage(null);
      setError('');
      onClose();
    } catch (err) {
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
        // overlay дээр дарсан бол хаагдах
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md relative p-6"
        onClick={(e) => e.stopPropagation()} // modal доторхи click overlay-ийг trigger хийхгүй
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Баннер нэмэх</h2>
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
        
          <Input
            placeholder="Тайлбар"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

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
          {image && (
            <img
              src={URL.createObjectURL(image)}
              alt="preview"
              width={100}
              height={80}
              className="mt-2 w-full h-32 object-cover rounded"
            />
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#d49943] via-[#dfa243] to-[#edad45] text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition flex justify-center items-center"
          >
            {loading && <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2"></span>}
            {loading ? 'Нэмэх...' : 'Нэмэх'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddBannerModal;
