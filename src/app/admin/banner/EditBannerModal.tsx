'use client';

import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface Banner {
    id: number;
    description: string;
    image_url: string;
}
interface EditBannerModalProps {
    open: boolean; // modal нээгдсэн эсэх
    onClose: () => void; // modal хаах функц
    onSubmit: (id: number, formData: FormData) => Promise<void>; // хадгалах үед дуудагдах функц
    banner: Banner | null; // засаж буй benner-ийн өгөгдөл
}


const EditBannerModal = ({ open, onClose, onSubmit, banner }: EditBannerModalProps) => {

    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (banner) {
            setDescription(banner.description || '');
            setImage(null);
        }
    }, [banner]);

    // ESC товч дарсан үед хаах
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!open || !banner) return null;

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('description', description);
        if (image) formData.append('image', image);


        try {
            setLoading(true);
            await onSubmit(banner.id, formData);
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
                    <h2 className="text-xl font-bold">Баннер Засах</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 font-bold text-xl"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

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

                    {(image || banner.image_url) && (
                        <img
                            src={image ? URL.createObjectURL(image) : `${banner.image_url}`}
                            alt="preview"
                            className="mt-2 w-full h-32 object-cover rounded"
                        />
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#d49943] via-[#dfa243] to-[#edad45] text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition flex justify-center items-center"
                        >
                            {loading && <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2"></span>}
                            {loading ? 'Хадгалж байна...' : 'Хадгалах'}
                        </Button>

                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditBannerModal;
