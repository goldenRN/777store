'use client';

import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Category } from "./categoryTable";

// interface EditCategoryModalProps {
//     open: boolean;
//     onClose: () => void;
//     onSubmit: (id: number, formData: FormData) => Promise<void>;
//     category: Category | null;
// }
interface EditCategoryModalProps {
    open: boolean; // modal нээгдсэн эсэх
    onClose: () => void; // modal хаах функц
    onSubmit: (id: number, formData: FormData) => Promise<void>; // хадгалах үед дуудагдах функц
    category: Category | null; // засаж буй category-ийн өгөгдөл
}


const EditCategoryModal = ({ open, onClose, onSubmit, category }: EditCategoryModalProps) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // category солигдсон үед state шинэчлэх
    useEffect(() => {
        if (category) {
            setName(category.category_name);
            setDescription(category.description || '');
            setImage(null);
        }
    }, [category]);

    // ESC товч дарсан үед хаах
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!open || !category) return null;

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Ангиллын нэрийг заавал оруулна уу');
            return;
        }
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        if (image) formData.append('image', image);


        try {
            setLoading(true);
            await onSubmit(category.category_id, formData);
            setName('');
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
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={onClose} // overlay дээр дарвал хаагдана
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative"
                onClick={(e) => e.stopPropagation()} // доторх div дээр дарвал overlay хаахгүй
            >
                <div className='flex justify-between items-center mb-4'>
                    <h2 className="text-xl font-bold">Ангилал Засах</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 font-bold text-xl"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Input
                        placeholder="Ангиллын нэр"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />

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

                    {(image || category.category_image) && (
                        <img
                            src={image ? URL.createObjectURL(image) : `${process.env.NEXT_PUBLIC_API_URL || ""}${category.category_image}`}
                            alt="preview"
                            className="mt-2 w-32 h-32 object-cover rounded"
                        />
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#d49943] via-[#dfa243] to-[#edad45] text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition flex justify-center items-center"
                        >
                            {loading && <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2"></span>}
                            {loading ? 'Хадгалах...' : 'Хадгалах'}
                        </Button>

                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCategoryModal;
