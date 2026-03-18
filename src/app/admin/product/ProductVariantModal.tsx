"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

type VariantImage = {
    id: number;
    image_url: string;
    product_id: number;
    product_variant_id: number;
    created_at?: string;
    public_id?: string;
};

type Variant = {
    id: number;
    product_id: number;
    sku?: string | null;
    attribute?: Record<string, unknown> | null;
    price?: number | null;
    stock?: number | null;
    images?: VariantImage[];
};

type UploadFile = {
    file: File;
    preview: string;
    progress: number;
    uploadedUrl?: string;
    public_id?: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    productId: number | null;
    productName: String | null;
    onRefresh?: () => void;
};

const getVariantLabel = (variant: Variant) => {
    const attr = (variant.attribute || {}) as Record<string, unknown>;
    const type = typeof attr.type === "string" ? attr.type : "";
    const color = typeof attr.color === "string" ? attr.color : "";
    const size = typeof attr.size === "string" ? attr.size : "";

    const merged = [type, color, size].filter(Boolean).join(" / ");
    return merged || variant.sku || `Variant-${variant.id}`;
};

export default function ProductVariantModal({ open, onClose, productId, productName, onRefresh }: Props) {
    const [variants, setVariants] = useState<Variant[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        sku: "",
        typeName: "",
        color: "",
        size: "",
        price: "",
        stock: "",
        attributeJson: "",
        images: [] as UploadFile[],
    });

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (open && productId) fetchVariants();
        if (!open) resetForm();
    }, [open, productId]); // eslint-disable-line react-hooks/exhaustive-deps

    const resetForm = () => {
        setForm({
            sku: "",
            typeName: "",
            color: "",
            size: "",
            price: "",
            stock: "",
            attributeJson: "",
            images: [],
        });
        setError(null);
    };

    const fetchVariants = async () => {
        if (!productId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/productvar/${productId}`);
            setVariants(res.data || []);
        } catch {
            setError("Төрөл уншихад алдаа гарлаа");
        } finally {
            setLoading(false);
        }
    };

    /** -------------------- IMAGE UPLOAD -------------------- **/
    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        const selected = Array.from(files);
        if (form.images.length + selected.length > 5) {
            alert("Зөвхөн 5 зураг оруулах боломжтой!");
            return;
        }
        const newFiles = selected.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            progress: 0,
        }));
        setForm((prev) => ({ ...prev, images: [...prev.images, ...newFiles] }));
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    };

    const removeImage = (index: number) => {
        setForm((prev) => {
            const images = [...prev.images];
            images.splice(index, 1);
            return { ...prev, images };
        });
    };

    /** -------------------- ADD VARIANT -------------------- **/
    const handleAddVariant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId) return;

        if (!form.typeName.trim() && !form.sku.trim()) {
            setError("Төрлийн нэр эсвэл SKU заавал оруулна уу");
            return;
        }

        let parsedAttr: Record<string, unknown> = {};
        try {
            parsedAttr = form.attributeJson.trim()
                ? JSON.parse(form.attributeJson)
                : {};
        } catch {
            setError("Нэмэлт attribute JSON буруу байна");
            return;
        }

        const finalAttr: Record<string, unknown> = {
            ...parsedAttr,
        };
        if (form.typeName.trim()) finalAttr.type = form.typeName.trim();
        if (form.color.trim()) finalAttr.color = form.color.trim();
        if (form.size.trim()) finalAttr.size = form.size.trim();

        setSaving(true);
        try {
            let uploadedImages: { image_url: string; public_id: string }[] = [];
            // 2️⃣ Зураг upload API
            for (const img of form.images) {
                const formData = new FormData();
                formData.append("images", img.file);
                const uploadRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/productimg/upload-multiple`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                    onUploadProgress: (e) => {
                        const progress = Math.round((e.loaded * 100) / (e.total || 1));
                        setForm(prev => {
                            const images = [...prev.images];
                            const index = images.findIndex(f => f.preview === img.preview);
                            if (index >= 0) images[index].progress = progress;
                            return { ...prev, images };
                        });
                    },
                });
                const uploadedBatch = uploadRes.data.images.map((imgObj: any) => ({
                    image_url: imgObj.imageUrl,
                    public_id: imgObj.public_id,
                }));
                uploadedImages = [...uploadedImages, ...uploadedBatch];

            }
            // 1️⃣ Variant create
            const variantRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/productvar`, {
                product_id: productId,
                sku: form.sku || null,
                attribute: finalAttr,
                price: form.price ? Number(form.price) : null,
                stock: form.stock ? Number(form.stock) : null,
                images: uploadedImages, // түр хадгалалт, дараа upload хийнэ
            });

            const variant = {
                ...variantRes.data.data,
                images: uploadedImages.map((img, idx) => ({
                    id: Date.now() + idx,
                    product_id: productId,
                    product_variant_id: variantRes.data.data.id,
                    image_url: img.image_url,
                    public_id: img.public_id,
                })),
            };
            setVariants(prev => [variant, ...prev]);
            resetForm();
            onRefresh && onRefresh();

        } catch (err: any) {
            setError(err?.response?.data?.message || "Төрөл нэмэхэд алдаа гарлаа");
        } finally { setSaving(false); }
    };

    /** -------------------- DELETE VARIANT -------------------- **/
    const handleDeleteVariant = async (id: number | undefined) => {
        if (!id) return;
        if (!confirm("Энэ төрлийг устгах уу?")) return;
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/productvar/${id}`);
            setVariants(prev => prev.filter((v) => v.id !== id));
            onRefresh && onRefresh();
        } catch {
            alert("Төрөл устгаж чадсангүй");
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-6xl w-full">
                <DialogHeader>
                    <DialogTitle>Барааны төрлүүдийн мэдээлэл {productName && `(Нэр: ${productName})`}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <h4 className="font-semibold">Төрлүүд</h4>
                            <span className="text-sm text-gray-500">
                                {loading ? "Уншиж байна..." : `${variants.length} ширхэг`}
                            </span>
                        </div>

                        <div className="max-h-[420px] overflow-auto space-y-2">
                            {variants.length === 0 ? (
                                <div className="text-sm text-gray-500">Төрөл байхгүй</div>
                            ) : (
                                variants.map(v => {
                                    const firstImage = v.images?.[0]?.image_url;

                                    return (
                                        <div
                                            key={v.id}
                                            className="flex items-center justify-between p-3 border rounded-lg bg-white hover:shadow-sm transition"
                                        >
                                            {/* LEFT CONTENT */}
                                            <div className="flex items-center gap-3">

                                                {/* IMAGE */}
                                                <div className="w-12 h-12 rounded overflow-hidden border bg-gray-100">
                                                    {firstImage ? (
                                                        <img
                                                            src={firstImage}
                                                            alt="variant image"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                                            no img
                                                        </div>
                                                    )}
                                                </div>

                                                {/* TEXT INFO */}
                                                <div>
                                                    <div className="font-medium text-sm">
                                                        {v.sku || `SKU-${v.id}`}
                                                    </div>

                                                    {/* ATTRIBUTE NICE LOOK */}
                                                    <div className="text-xs text-gray-600">
                                                        {getVariantLabel(v)}
                                                    </div>

                                                    <div className="text-xs text-gray-600">
                                                        {Number(v.price).toLocaleString()}₮ • {v.stock}ш
                                                    </div>
                                                </div>
                                            </div>

                                            {/* DELETE BUTTON */}
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                onClick={() => handleDeleteVariant(v.id)}
                                                className="ml-2"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Form */}
                    <div>
                        <h4 className="font-semibold mb-2">Шинэ төрөл нэмэх</h4>
                        <form onSubmit={handleAddVariant} className="space-y-3">
                            <div>
                                <label className="text-xs mb-1 block">Төрлийн нэр (ж: 13 inch, Улаан, XL)</label>
                                <Input
                                    value={form.typeName}
                                    onChange={(e) => setForm({ ...form, typeName: e.target.value })}
                                    placeholder="Төрлийн нэр"
                                />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block">SKU</label>
                                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs mb-1 block">Өнгө</label>
                                    <Input
                                        value={form.color}
                                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                                        placeholder="Ж: Red"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs mb-1 block">Хэмжээ</label>
                                    <Input
                                        value={form.size}
                                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                                        placeholder="Ж: XL"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs mb-1 block">Үнэ</label>
                                <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block">Үлдэгдэл</label>
                                <Input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs block mb-1">Нэмэлт attribute JSON (optional)</label>
                                <Textarea
                                    value={form.attributeJson}
                                    onChange={(e) => setForm({ ...form, attributeJson: e.target.value })}
                                    rows={4}
                                    placeholder='{"memory":"16GB","speed":"3200Mhz"}'
                                />
                            </div>

                            <DialogFooter>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={resetForm}>Цэвэрлэх</Button>
                                    <Button type="submit" disabled={saving}>{saving ? "Хадгалж..." : "Нэмэх"}</Button>
                                </div>
                            </DialogFooter>
                        </form>
                    </div>
                    {/* MIDDLE: Image preview */}
                    <div>
                        <Label className="py-2">Зураг оруулах (ихдээ 5 зураг)</Label>
                        <div
                            className="w-full h-20 border-2 border-dashed border-gray-400 rounded-xl flex items-center justify-center cursor-pointer"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Зургаа энд чирэх эсвэл дараад оруул
                        </div>

                        <Input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={(e) => handleFiles(e.target.files)}
                        />

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
                            {form.images.map((img, index) => (
                                <div key={index} className="relative">
                                    <img src={img.preview} alt={`preview-${index}`} className="w-full h-40 object-cover rounded-xl border shadow-lg" />
                                    <Button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-1 right-1 bg-red-500 text-white h-6 w-6 rounded-full p-0 text-xs flex items-center justify-center"
                                    >
                                        ×
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>


                </div>

            </DialogContent>

        </Dialog>
    );
}
