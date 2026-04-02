'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; has_duration: boolean }) => Promise<void>;
}

const AddTypeModal = ({ open, onClose, onSubmit }: AddTypeModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hasDuration, setHasDuration] = useState(false);
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
      setError('нэр оруулна уу');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        name, description, has_duration: hasDuration
      });

      // Reset form
      setName('');
      setDescription('');
      setHasDuration(false);
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-md relative p-5 md:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // modal доторхи click overlay-ийг trigger хийхгүй
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">төрөл нэмэх</h2>
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
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600">Төрөл нэр</label>
            <Input
              placeholder="Төрөл нэр"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600">Тайлбар</label>
            <textarea
              placeholder="Тайлбар"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
              rows={3}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={hasDuration}
              onChange={(e) => setHasDuration(e.target.checked)}
            />
            Хугацаатай төрөл
          </label>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#d49943] via-[#dfa243] to-[#edad45] text-white font-bold py-2.5 px-4 rounded-lg hover:opacity-90 transition flex justify-center items-center"
          >
            {loading && <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2"></span>}
            {loading ? 'Нэмэх...' : 'Нэмэх'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddTypeModal;
