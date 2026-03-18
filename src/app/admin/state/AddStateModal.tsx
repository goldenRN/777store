'use client';

import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddStateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string,  description:string}) => void;
}

const AddStateModal = ({ open, onClose, onSubmit }: AddStateModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Дэд ангиллын нэрийг заавал оруулна уу');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        name, description
      });

      // Reset form
      setName('');
      setDescription('');
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
          <h2 className="text-xl font-semibold text-gray-800">Төлөв нэмэх</h2>
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
            placeholder="Төлөв нэр"
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
            {loading && <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2"></span>}
            {loading ? 'Нэмэх...' : 'Нэмэх'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddStateModal;
