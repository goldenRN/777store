"use client";

import Image from "next/image";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { AxiosError } from "axios";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import axios from "axios";
import { getActorHeaders } from "@/lib/actorHeaders";
import { normalizeBulkTiers } from "@/lib/bulkPricing";
import { Trash2 } from "lucide-react";

interface AddProductModalProps {
    open: boolean;
    onClose: () => void;
    onRefresh: () => void;
    editData?: EditableProduct | null;
    initialType?: "ready" | "preorder" | "live" | null;
}

interface NamedOption {
    id: number;
    name: string;
}

interface CategoryOption {
    category_id: number;
    category_name: string;
}

interface SubCategoryOption extends NamedOption {
    category_id: number;
}

interface TypeOption extends NamedOption {
    has_duration?: boolean | null;
}

interface UploadFile {
    file?: File;
    preview: string;
    uploadedUrl?: string;
    public_id?: string;
    progress?: number;
}

type BulkTier = { min_qty: string; price: string };

interface ProductFormState {
    name: string;
    description: string;
    video_url: string;
    price: string;
    discount_price: string;
    bulk_prices: BulkTier[];
    stock: string;
    material: string;
    duration_hours: string;
    category_id: string;
    category_name: string;
    subcategory_id: string;
    subcategory_name: string;
    brand_id: string;
    brand_name: string;
    unit_id: string;
    unit_name: string;
    type_id: string;
    type_name: string;
    type_has_duration: boolean;
    images: UploadFile[];
}

type BulkTierValue = { min_qty?: number | string | null; price?: number | string | null };

interface EditableProduct {
    id: number;
    name?: string | null;
    description?: string | null;
    video_url?: string | null;
    price?: number | string | null;
    discount_price?: number | string | null;
    bulk_prices?: BulkTierValue[] | null;
    stock?: number | string | null;
    material?: string | null;
    duration_hours?: number | string | null;
    category_id?: number | string | null;
    category_name?: string | null;
    subcategory_id?: number | string | null;
    subcategory_name?: string | null;
    brand_id?: number | string | null;
    brand_name?: string | null;
    unit_id?: number | string | null;
    unit_name?: string | null;
    type_id?: number | string | null;
    type_name?: string | null;
    type_has_duration?: boolean | null;
}

interface ProductImageResponse {
    image_url: string;
    public_id?: string | null;
}

interface UploadResponse {
    images: {
        imageUrl: string;
        public_id: string;
    }[];
}

export default function AddProductModal({ open, onClose, onRefresh, editData, initialType }: AddProductModalProps) {
    const [form, setForm] = useState<ProductFormState>({
        name: "",
        description: "",
        video_url: "",
        price: "",
        discount_price: "",
        bulk_prices: [] as BulkTier[],
        stock: "",
        material: "",
        duration_hours: "",
        category_id: "",
        category_name: "",
        subcategory_id: "",
        subcategory_name: "",
        brand_id: "",
        brand_name: "",
        unit_id: "",
        unit_name: "",
        type_id: "",
        type_name: "",
        type_has_duration: false,
        images: [] as UploadFile[],
    });

    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [allSubCategories, setAllSubCategories] = useState<SubCategoryOption[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([]);
    const [brands, setBrands] = useState<NamedOption[]>([]);
    const [units, setUnits] = useState<NamedOption[]>([]);
    const [types, setTypes] = useState<TypeOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [discountMode, setDiscountMode] = useState<"percent" | "amount">("percent");
    const [discountInput, setDiscountInput] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [productMode, setProductMode] = useState<"ready" | "preorder" | "live" | null>(null);
    const [forceReadyEdit, setForceReadyEdit] = useState(false);
    const [showImagePanel, setShowImagePanel] = useState(true);

    const priceNumber = Number(form.price) || 0;
    const discountInputNumber = Number(discountInput) || 0;

    const computedDiscountAmount = useMemo(() => {
        if (!priceNumber || !discountInputNumber) return 0;
        if (discountMode === "percent") {
            return (priceNumber * discountInputNumber) / 100;
        }
        return discountInputNumber;
    }, [priceNumber, discountInputNumber, discountMode]);

    const computedDiscountPercent = useMemo(() => {
        if (!priceNumber || !computedDiscountAmount) return 0;
        return (computedDiscountAmount / priceNumber) * 100;
    }, [priceNumber, computedDiscountAmount]);

    const computedDiscountPrice = useMemo(() => {
        if (!priceNumber || !computedDiscountAmount) return null;
        const next = priceNumber - computedDiscountAmount;
        return next > 0 ? next : 0;
    }, [priceNumber, computedDiscountAmount]);

    useEffect(() => {
        if (productMode !== "ready") {
            setDiscountInput("");
            setDiscountMode("percent");
        }
    }, [productMode]);

    // 🟢 Хэрэв засвар хийж байвал хуучин утгуудыг populate хийнэ
    useEffect(() => {
        if (editData) {
            const editPrice = Number(editData.price) || 0;
            const editDiscountPrice = Number(editData.discount_price) || 0;
            const discountAmount =
                editPrice > 0 && editDiscountPrice > 0 && editDiscountPrice < editPrice
                    ? editPrice - editDiscountPrice
                    : 0;
            setForm((prev) => ({
                ...prev,
                ...editData,
                name: editData.name?.toString() || "",
                description: editData.description?.toString() || "",
                price: editData.price?.toString() || "",
                video_url: editData.video_url?.toString() || "",
                discount_price: editData.discount_price?.toString() || "",
                bulk_prices: Array.isArray(editData.bulk_prices)
                  ? editData.bulk_prices.map((t) => ({
                      min_qty: String(t?.min_qty ?? ""),
                      price: String(t?.price ?? ""),
                    }))
                  : [],
                stock: editData.stock?.toString() || "",
                material: editData.material?.toString() || "",
                duration_hours: editData.duration_hours?.toString() || "",
                category_id: editData.category_id?.toString() || "",
                category_name: editData.category_name?.toString() || "",
                subcategory_id: editData.subcategory_id?.toString() || "",
                subcategory_name: editData.subcategory_name?.toString() || "",
                brand_id: editData.brand_id?.toString() || "",
                brand_name: editData.brand_name?.toString() || "",
                unit_id: editData.unit_id?.toString() || "",
                unit_name: editData.unit_name?.toString() || "",
                type_id: editData.type_id?.toString() || "",
                type_name: editData.type_name?.toString() || "",
                type_has_duration: Boolean(editData.type_has_duration),
                images: [],
            }));
            const typeName = String(editData.type_name || "").toLowerCase();
            if (typeName.includes("бэлэн") || typeName.includes("ready")) {
                setProductMode("ready");
            } else if (typeName.includes("захиал") || typeName.includes("preorder") || typeName.includes("урьдчил")) {
                setProductMode("preorder");
            } else if (typeName.includes("лайв") || typeName.includes("live")) {
                setProductMode("live");
            }
            setDiscountMode("amount");
            setDiscountInput(discountAmount > 0 ? discountAmount.toString() : "");

            // 🟢 Барааны зургуудыг татах
            axios
                .get(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/productimg/${editData.id}`)
                .then((res) => {
                    const imgs = (res.data as ProductImageResponse[]).map((i) => ({
                        preview: i.image_url,
                        uploadedUrl: i.image_url,
                        public_id: i.public_id ?? undefined,
                    }));
                    setForm((prev) => ({ ...prev, images: imgs }));
                })
                .catch((err) => console.error("Image fetch error:", err));
        } else {
            resetForm();
            setProductMode(null);
            setForceReadyEdit(false);
        }
    }, [editData, open]);

    // 🟢 Dropdown-уудыг populate хийх
    useEffect(() => {
        if (!open) return;
        Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/category`).then((r) => r.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/subcategory`).then((r) => r.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/brand`).then((r) => r.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/unit`).then((r) => r.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/type`).then((r) => r.json()),

        ]).then(([cat, sub, br, un, tp]) => {
            setCategories(cat);
            setAllSubCategories(sub);
            setBrands(br);
            setUnits(un);
            setTypes(tp)
        });
    }, [open]);

    const findTypeByKind = useCallback((kind: "ready" | "preorder" | "live") => {
        if (kind === "ready") {
            return types.find(
                (tp) => String(tp.name).toLowerCase().includes("бэлэн") || String(tp.name).toLowerCase().includes("ready")
            );
        }
        if (kind === "preorder") {
            return types.find(
                (tp) =>
                    String(tp.name).toLowerCase().includes("захиал") ||
                    String(tp.name).toLowerCase().includes("захил") ||
                    String(tp.name).toLowerCase().includes("preorder") ||
                    String(tp.name).toLowerCase().includes("урьдчил")
            );
        }
        return types.find(
            (tp) => String(tp.name).toLowerCase().includes("лайв") || String(tp.name).toLowerCase().includes("live")
        );
    }, [types]);

    // 🟢 Types ачаалсаны дараа сонгосон mode-д таарах type-г автоматаар сонгоно
    useEffect(() => {
        if (!productMode || form.type_id || types.length === 0) return;
        const selected = findTypeByKind(productMode);
        if (selected) {
            setForm((prev) => ({
                ...prev,
                type_id: selected.id.toString(),
                type_name: selected.name,
                type_has_duration: Boolean(selected.has_duration),
            }));
        }
    }, [findTypeByKind, productMode, form.type_id, types.length]);

    // 🟢 URL-аас ирсэн type дээр үндэслэн шинэ бараа нэмэхэд автоматаар сонгоно
    useEffect(() => {
        if (!open || editData) return;
        if (!initialType) return;
        if (initialType === "ready") setProductMode("ready");
        if (initialType === "preorder") setProductMode("preorder");
        if (initialType === "live") setProductMode("live");
    }, [open, editData, initialType]);

    useEffect(() => {
        if (!open || editData) return;
        if (!initialType) return;
        if (form.type_id || types.length === 0) return;
        const selected = findTypeByKind(initialType);
        if (selected) {
            setForm((prev) => ({
                ...prev,
                type_id: selected.id.toString(),
                type_name: selected.name,
                type_has_duration: Boolean(selected.has_duration),
            }));
        }
    }, [findTypeByKind, open, editData, initialType, form.type_id, types.length]);

    const resetForm = () => {
        setForm({
            name: "",
            description: "",
            video_url: "",
            price: "",
            discount_price: "",
            bulk_prices: [],
            stock: "",
            material: "",
            duration_hours: "",
            category_id: "",
            category_name: "",
            subcategory_id: "",
            subcategory_name: "",
            brand_id: "",
            brand_name: "",
            unit_id: "",
            unit_name: "",
            type_id: "",
            type_name: "",
            type_has_duration: false,
            images: [],
        });
        setDiscountMode("percent");
        setDiscountInput("");
    };

    const addTier = () => {
        setForm((prev) => ({
            ...prev,
            bulk_prices: [...(prev.bulk_prices || []), { min_qty: "", price: "" }],
        }));
    };

    const removeTier = (idx: number) => {
        setForm((prev) => ({
            ...prev,
            bulk_prices: (prev.bulk_prices || []).filter((_, i) => i !== idx),
        }));
    };

    const updateTier = (idx: number, field: keyof BulkTier, value: string) => {
        setForm((prev) => ({
            ...prev,
            bulk_prices: (prev.bulk_prices || []).map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
        }));
    };

    // 🟢 Change handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleCategorySelect = (value: string) => {
        const selected = categories.find((c) => c.category_id.toString() === value);
        const filteredSubs = allSubCategories.filter((s) => s.category_id.toString() === value);
        setForm({
            ...form,
            category_id: value,
            category_name: selected?.category_name || "",
            subcategory_id: "",
            subcategory_name: "",
        });
        setSubCategories(filteredSubs);
    };

    const handleSubCategorySelect = (value: string) => {
        const selected = subCategories.find((s) => s.id.toString() === value);
        setForm({ ...form, subcategory_id: value, subcategory_name: selected?.name || "" });
    };

    const handleSelectWithName = (fieldId: string, fieldName: string, list: NamedOption[], value: string) => {
        const selected = list.find((item) => item.id.toString() === value);
        setForm({ ...form, [fieldId]: value, [fieldName]: selected?.name || "" });
    };

    const handleModeSelect = (mode: "ready" | "preorder" | "live") => {
        setProductMode(mode);
        setForceReadyEdit(false);
        const selected = findTypeByKind(mode);
        if (selected) {
            setForm((prev) => ({
                ...prev,
                type_id: selected.id.toString(),
                type_name: selected.name,
                type_has_duration: Boolean(selected.has_duration),
            }));
        }
    };

    // 🟢 Зураг upload
    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        const selected = Array.from(files);
        if (form.images.length + selected.length > 5) {
            alert("⚠️ Зөвхөн 5 зураг оруулах боломжтой!");
            return;
        }
        const newFiles: UploadFile[] = selected.map((f) => ({
            file: f,
            preview: URL.createObjectURL(f),
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
            const imgs = [...prev.images];
            imgs.splice(index, 1);
            return { ...prev, images: imgs };
        });
    };


    const handleClose = () => {
        resetForm();
        setShowImagePanel(true);
        onClose();
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!productMode) {
            alert("Эхлээд барааны төрлөө сонгоно уу.");
            return;
        }
        if (!form.type_id) {
            alert("Төрлийн тохиргоо олдсонгүй. Админ хэсэгт Бэлэн/Захиалгын төрлүүдийг үүсгэсэн эсэхээ шалгана уу.");
            return;
        }
        if (!form.name.trim()) {
            alert("Барааны нэр оруулна уу.");
            return;
        }

        if (discountInputNumber > 0 && (computedDiscountPrice === null || computedDiscountPrice <= 0)) {
            alert("Хямдралын утга буруу байна. Хямдралын үнэ 0-ээс их байх ёстой.");
            return;
        }

        const stockNumber = Number(form.stock) || 0;
        const durationNumber = form.type_has_duration ? Number(form.duration_hours) || 0 : 0;

        if ((productMode === "ready" || forceReadyEdit) && stockNumber <= 0) {
            alert("Бэлэн бараанд үлдэгдэл заавал оруулна уу.");
            return;
        }

        if ((productMode === "preorder" || productMode === "live") && !forceReadyEdit) {
            // allow saving without base stock/duration (variants can carry stock later)
        }

        setLoading(true);

        try {
            const normalizedBulk = normalizeBulkTiers(form.bulk_prices);
            const bulk_prices = normalizedBulk.length > 0 ? normalizedBulk : null;
            let uploadedImages: { image_url: string; public_id: string }[] = [];

            // 🟢 Шинээр upload хийгдэх зурагнууд
            const newImages = form.images.filter((img) => !img.uploadedUrl && img.file);
            if (newImages.length > 0) {
                const formData = new FormData();
                newImages.forEach((img) => {
                    formData.append("images", img.file as File);
                });

                const res = await axios.post<UploadResponse>(
                    `${process.env.NEXT_PUBLIC_API_URL || ""}/api/productimg/upload-multiple`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data", ...getActorHeaders() } }
                );

                uploadedImages = res.data.images.map((imgObj) => ({
                    image_url: imgObj.imageUrl,
                    public_id: imgObj.public_id,
                }));
            }

            // 🟢 Хуучин (өмнө нь хадгалагдсан) зургуудыг хадгална
            const existingImages = form.images
                .filter((img) => img.uploadedUrl)
                .map((img) => ({
                    image_url: img.uploadedUrl,
                    public_id: img.public_id || null,
                }));

            // 🧩 Бүх зургийг нэгтгэх
            const allImages = [...existingImages, ...uploadedImages];

            // 📦 Payload үүсгэх
            const payload = {
                name: form.name,
                description: form.description,
                video_url: form.video_url,
                category_id: form.category_id || null,
                category_name: form.category_name || "",
                subcategory_id: form.subcategory_id || null,
                subcategory_name: form.subcategory_name || "",
                brand_id: form.brand_id,
                brand_name: form.brand_name,
                unit_id: form.unit_id,
                unit_name: form.unit_name,
                type_id: form.type_id,
                type_name: form.type_name,
                type_has_duration: form.type_has_duration,
                price: Number(form.price) || 0,
                discount_price:
                    (productMode === "ready" || forceReadyEdit) && computedDiscountPrice !== null && computedDiscountPrice > 0
                        ? Number(computedDiscountPrice.toFixed(2))
                        : null,
                bulk_prices,
                stock: stockNumber,
                material: form.material,
                duration_hours: form.type_has_duration ? durationNumber : null,
                images: allImages, // [{ image_url, public_id }]
            };

            // 🟢 API дуудах
            if (editData) {
                await axios.put(
                    `${process.env.NEXT_PUBLIC_API_URL || ""}/api/product/${editData.id}`,
                    payload,
                    { headers: { ...getActorHeaders() } }
                );
            } else {
                await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL || ""}/api/product`,
                    payload,
                    { headers: { ...getActorHeaders() } }
                );
            }

            onRefresh();
            handleClose();
        } catch (err) {
            const axiosError = err as AxiosError<{ message?: string; error?: string }>;
            const message =
                axiosError.response?.data?.message ||
                axiosError.response?.data?.error ||
                "⚠️ Алдаа гарлаа!";
            console.error("❌ Upload error:", err);
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    // 🧱 UI хэсэг
    return (
        <Modal open={open} onClose={handleClose}>
            <div className="flex h-full min-h-0 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="grid min-h-0 grid-cols-1 gap-6 p-1 sm:p-2 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
                        {/* -------- LEFT FORM -------- */}
                        <div className="min-w-0 space-y-4">
                            <h2 className="mb-2 text-xl font-bold sm:text-2xl">{editData ? "✏️ Бараа засах" : "🛍️ Шинэ бүтээгдэхүүн нэмэх"}</h2>

                            {!editData && initialType !== "live" && (
                                <div>
                                    <Label>Ямар төрлийн бараа бүртгэх вэ?</Label>
                                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => handleModeSelect("ready")}
                                            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                                                productMode === "ready" ? "border-[var(--accent-2)] text-[var(--accent-2)]" : "hover:bg-[var(--sky-100)]"
                                            }`}
                                        >
                                            Бэлэн бараа бүртгэх
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleModeSelect("preorder")}
                                            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                                                productMode === "preorder" ? "border-[var(--accent-2)] text-[var(--accent-2)]" : "hover:bg-[var(--sky-100)]"
                                            }`}
                                        >
                                            Захиалгын бараа бүртгэх
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!editData && initialType === "live" && (
                                <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                    Live бараа бүртгэх горим
                                </div>
                            )}

                            {!productMode && !editData && initialType !== "live" && (
                                <div className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                                    Төрлөө сонгосны дараа бусад талбарууд гарна.
                                </div>
                            )}

                            {productMode && (
                                <>
                                    <div>
                                        <Label>Бүтээгдэхүүний нэр</Label>
                                        <Input name="name" value={form.name} onChange={handleChange} className="h-12 text-lg" />
                                    </div>
                                    <div>
                                        <Label>Тайлбар</Label>
                                        <Textarea name="description" value={form.description} onChange={handleChange} className="h-28 text-lg" />
                                    </div>
                                    <div>
                                        <Label>Видео линк (YouTube/Facebook/Instagram)</Label>
                                        <Input
                                            name="video_url"
                                            value={form.video_url}
                                            onChange={handleChange}
                                            className="h-12 text-lg"
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <div>
                                            <Label>Үнэ (₮)</Label>
                                            <Input name="price" type="number" value={form.price} onChange={handleChange} className="h-12 text-lg" />
                                        </div>
                                        {(productMode === "ready" || forceReadyEdit) && (
                                            <>
                                                <div>
                                                    <Label>Хямдралын төрөл</Label>
                                                    <Select value={discountMode} onValueChange={(v) => setDiscountMode(v as "percent" | "amount")}>
                                                        <SelectTrigger className="h-12">
                                                            <SelectValue placeholder="Сонгох..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="percent">Хувь (%)</SelectItem>
                                                            <SelectItem value="amount">Дүн (₮)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>{discountMode === "percent" ? "Хямдрал (%)" : "Хямдралын дүн (₮)"}</Label>
                                                    <Input
                                                        type="number"
                                                        value={discountInput}
                                                        onChange={(e) => setDiscountInput(e.target.value)}
                                                        className="h-12 text-lg"
                                                        placeholder={discountMode === "percent" ? "Ж: 10" : "Ж: 50000"}
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            <Label>{productMode === "preorder" || productMode === "live" ? "Захиалах тоо" : "Үлдэгдэл"}</Label>
                                            <Input name="stock" type="number" value={form.stock} onChange={handleChange} className="h-12 text-lg" />
                                        </div>
                                    </div>

                                    {(productMode === "ready" || forceReadyEdit) && (
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <div>
                                                <Label>Бодогдсон хямдрал (₮)</Label>
                                                <Input
                                                    value={computedDiscountAmount > 0 ? Math.round(computedDiscountAmount).toLocaleString() : ""}
                                                    readOnly
                                                    className="h-12 bg-slate-50 text-lg"
                                                    placeholder="-"
                                                />
                                            </div>
                                            <div>
                                                <Label>Бодогдсон хувь (%)</Label>
                                                <Input
                                                    value={computedDiscountPercent > 0 ? computedDiscountPercent.toFixed(2) : ""}
                                                    readOnly
                                                    className="h-12 bg-slate-50 text-lg"
                                                    placeholder="-"
                                                />
                                            </div>
                                            <div>
                                                <Label>Хямдралын үнэ (автомат)</Label>
                                                <Input
                                                    value={computedDiscountPrice !== null ? Math.round(computedDiscountPrice).toLocaleString() : ""}
                                                    readOnly
                                                    className="h-12 bg-slate-50 text-lg"
                                                    placeholder="хямдралгүй"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3 rounded-xl border p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <Label className="text-base font-semibold">Бөөний үнэ (сонголттой)</Label>
                                            <Button type="button" variant="outline" className="h-9" onClick={addTier}>
                                                Нэмэх
                                            </Button>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Жишээ: `10`-аас дээш бол `4500₮`, `100`-аас дээш бол `4000₮` (нэгж үнэ).
                                        </div>

                                        {!form.bulk_prices || form.bulk_prices.length === 0 ? (
                                            <div className="text-sm text-slate-500">Одоогоор бөөний үнэ тохируулаагүй.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {form.bulk_prices.map((t, idx) => (
                                                    <div key={idx} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-12">
                                                        <div className="sm:col-span-5">
                                                            <Label className="text-xs">Доод тоо (min)</Label>
                                                            <Input
                                                                type="number"
                                                                value={t.min_qty}
                                                                onChange={(e) => updateTier(idx, "min_qty", e.target.value)}
                                                                className="h-11"
                                                                placeholder="Ж: 10"
                                                                min={1}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-5">
                                                            <Label className="text-xs">Нэгж үнэ (₮)</Label>
                                                            <Input
                                                                type="number"
                                                                value={t.price}
                                                                onChange={(e) => updateTier(idx, "price", e.target.value)}
                                                                className="h-11"
                                                                placeholder="Ж: 4500"
                                                                min={0}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-2 sm:pt-5">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="h-11 w-full sm:w-11 px-0"
                                                                onClick={() => removeTier(idx)}
                                                                aria-label="Устгах"
                                                                title="Устгах"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <Label>Материал</Label>
                                        <Input name="material" value={form.material} onChange={handleChange} className="h-12 text-lg" />
                                    </div>

                                    {form.type_has_duration && (
                                        <div>
                                            <Label>Хугацаа (цаг)</Label>
                                            <Input
                                                name="duration_hours"
                                                type="number"
                                                value={form.duration_hours}
                                                onChange={handleChange}
                                                className="h-12 text-lg"
                                                placeholder="Ж: 72"
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label>Ангилал</Label>
                                            <Select value={form.category_id} onValueChange={handleCategorySelect}>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue placeholder="Сонгох..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories?.map((c) => (
                                                        <SelectItem key={c.category_id} value={c.category_id.toString()}>
                                                            {c.category_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label>Дэд ангилал</Label>
                                            <Select value={form.subcategory_id} onValueChange={handleSubCategorySelect}>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue placeholder="Сонгох..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {subCategories.map((s) => (
                                                        <SelectItem key={s.id} value={s.id.toString()}>
                                                            {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label>Хэмжих нэгж</Label>
                                            <Select value={form.unit_id} onValueChange={(v) => handleSelectWithName("unit_id", "unit_name", units, v)}>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue placeholder="Сонгох..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {units?.map((u) => (
                                                        <SelectItem key={u.id} value={u.id.toString()}>
                                                            {u.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Брэнд</Label>
                                            <Select value={form.brand_id} onValueChange={(v) => handleSelectWithName("brand_id", "brand_name", brands, v)}>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue placeholder="Сонгох..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {brands.map((b) => (
                                                        <SelectItem key={b.id} value={b.id.toString()}>
                                                            {b.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </>
                            )}
                            {editData && productMode === "preorder" && !forceReadyEdit && (
                                <div className="mt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForceReadyEdit(true);
                                            handleModeSelect("ready");
                                        }}
                                        className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-[var(--sky-100)]"
                                    >
                                        Бэлэн барааруу бүртгэх
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* -------- RIGHT IMAGE UPLOAD -------- */}
                        <div className="flex min-w-0 flex-col items-center justify-start rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                            <div className="mb-3 flex w-full items-center justify-between gap-3">
                                <div>
                                    <Label className="py-1 text-sm font-semibold sm:text-base">Зураг оруулах</Label>
                                    <div className="text-xs text-slate-500">Хамгийн ихдээ 5 зураг</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowImagePanel((prev) => !prev)}
                                    className="rounded-full border px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white xl:hidden"
                                >
                                    {showImagePanel ? "Хураах" : `Зураг (${form.images.length})`}
                                </button>
                            </div>

                            <div className={`w-full ${showImagePanel ? "block" : "hidden"} xl:block`}>
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="mb-4 flex h-32 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-400 bg-white px-3 text-center text-sm sm:h-40 sm:text-base"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Зургаа энд чирээд эсвэл click хийж зураг оруулна
                                </div>
                                <Input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

                                <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
                                    {form.images.map((img, index) => (
                                        <div key={index} className="relative h-28 overflow-hidden rounded-xl border bg-white shadow-lg sm:h-36">
                                            <Image
                                                src={img.preview}
                                                alt={`preview-${index}`}
                                                fill
                                                sizes="(max-width: 640px) 45vw, 160px"
                                                className="object-cover"
                                                unoptimized
                                            />
                                            <Button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 p-0 text-xs text-white"
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 z-10 mt-4 flex shrink-0 flex-col justify-end gap-3 border-t bg-white/95 pt-3 pb-2 backdrop-blur sm:mt-6 sm:flex-row">
                    <Button variant="outline" onClick={handleClose} className="h-12 w-full px-6 text-base sm:w-auto">
                        Хаах
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="h-12 w-full px-6 text-base sm:w-auto">
                        {loading ? "Хадгалж байна..." : editData ? "Засах" : "Хадгалах"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
