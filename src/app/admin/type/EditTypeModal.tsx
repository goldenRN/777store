'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';



interface Type {
  id: number;
  name: string;
  description?: string;

}
interface EditTypeModalProps {
  open: boolean;
  onClose: () => void;
  type?: Type | null;
  onSubmit: ( id: number, name: string, description?: string ) => Promise<void>;
}

const EditTypeModal: React.FC<EditTypeModalProps> = ({
  open,
  type,
  onClose,
  onSubmit,
}) => {
//   const [states, setStates] = useState<State[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (type) {
      setName(type.name);
      setDescription(type.description || '');
    }
  }, [type]);

  


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('нэр оруулна уу');
      return;
    }

    try {
      setLoading(true);
      await onSubmit( type!.id, name, description );
      setError('');
      onClose();
    } catch (err) {
      console.error(err);
      setError('Засах үед алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  if (!open ) return null;

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
          <h2 className="text-xl font-semibold text-gray-800">Төрөл засах</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 font-bold text-2xl"
          >
            &times;
          </button>
        </div>

        {error && <p className="text-red-500 mb-2">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">

          <label className="block mb-1 text-sm font-medium text-gray-600">
            Төрөл нэр
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

export default EditTypeModal;
