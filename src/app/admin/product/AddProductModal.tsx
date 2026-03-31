"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import axios from "axios";

interface AddProductModalProps {
    open: boolean;
    onClose: () => void;
    onRefresh: () => void;
    editData?: any | null;
    initialType?: "ready" | "preorder" | "live" | null;
}

interface UploadFile {
    file?: File;
    preview: string;
    uploadedUrl?: string;
    public_id?: string;
    progress?: number;
}

export default function AddProductModal({ open, onClose, onRefresh, editData, initialType }: AddProductModalProps) {
    const [form, setForm] = useState({
        name: "",
        description: "",
        price: "",
        discount_price: "",
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

    const [categories, setCategories] = useState<any[]>([]);
    const [allSubCategories, setAllSubCategories] = useState<any[]>([]);
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [discountMode, setDiscountMode] = useState<"percent" | "amount">("percent");
    const [discountInput, setDiscountInput] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [productMode, setProductMode] = useState<"ready" | "preorder" | "live" | null>(null);
    const [forceReadyEdit, setForceReadyEdit] = useState(false);

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
                price: editData.price?.toString() || "",
                discount_price: editData.discount_price?.toString() || "",
                stock: editData.stock?.toString() || "",
                material: editData.material?.toString() || "",
                duration_hours: editData.duration_hours?.toString() || "",
                category_id: editData.category_id?.toString() || "",
                brand_id: editData.brand_id?.toString() || "",
                unit_id: editData.unit_id?.toString() || "",
                type_id: editData.type_id?.toString() || "",
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
                    const imgs = res.data.map((i: any) => ({
                        preview: i.image_url,
                        uploadedUrl: i.image_url,
                        public_id: i.public_id,
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

    const findTypeByKind = (kind: "ready" | "preorder" | "live") => {
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
    };

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
    }, [productMode, types, form.type_id]);

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
    }, [open, editData, initialType, form.type_id, types]);

    const resetForm = () => {
        setForm({
            name: "",
            description: "",
            price: "",
            discount_price: "",
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

    const handleSelectWithName = (fieldId: string, fieldName: string, list: any[], value: string) => {
        const selected = list.find((item) => item.id.toString() === value);
        setForm({ ...form, [fieldId]: value, [fieldName]: selected?.name || "" });
    };

    const handleTypeSelect = (value: string) => {
        const selected = types.find((tp) => tp.id.toString() === value);
        setForm({
            ...form,
            type_id: value,
            type_name: selected?.name || "",
            type_has_duration: Boolean(selected?.has_duration),
        });
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

        setLoading(true);

        try {
            let uploadedImages: { image_url: string; public_id: string }[] = [];

            // 🟢 Шинээр upload хийгдэх зурагнууд
            const newImages = form.images.filter((img) => !img.uploadedUrl && img.file);
            if (newImages.length > 0) {
                const formData = new FormData();
                newImages.forEach((img) => {
                    formData.append("images", img.file as File);
                });

                const res = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL || ""}/api/productimg/upload-multiple`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );

                uploadedImages = res.data.images.map((imgObj: any) => ({
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
                category_id: (productMode === "ready" || forceReadyEdit) ? form.category_id : null,
                category_name: (productMode === "ready" || forceReadyEdit) ? form.category_name : "",
                subcategory_id: (productMode === "ready" || forceReadyEdit) ? form.subcategory_id : null,
                subcategory_name: (productMode === "ready" || forceReadyEdit) ? form.subcategory_name : "",
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
                stock: Number(form.stock) || 0,
                material: form.material,
                duration_hours: form.type_has_duration ? Number(form.duration_hours) || 0 : null,
                images: allImages, // [{ image_url, public_id }]
            };

            // 🟢 API дуудах
            if (editData) {
                await axios.put(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/product/${editData.id}`, payload);
            } else {
                await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/product`, payload);
            }

            onRefresh();
            handleClose();
        } catch (err) {
            const message =
                (err as any)?.response?.data?.message ||
                (err as any)?.response?.data?.error ||
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-2 h-full">
                {/* -------- LEFT FORM -------- */}
                <div className="space-y-4 overflow-auto p-2">
                    <h2 className="text-2xl font-bold mb-2">{editData ? "✏️ Бараа засах" : "🛍️ Шинэ бүтээгдэхүүн нэмэх"}</h2>

                    {!editData && initialType !== "live" && (
                        <div>
                            <Label>Ямар төрлийн бараа бүртгэх вэ?</Label>
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <Label>Бодогдсон хямдрал (₮)</Label>
                                <Input
                                    value={computedDiscountAmount > 0 ? Math.round(computedDiscountAmount).toLocaleString() : ""}
                                    readOnly
                                    className="h-12 text-lg bg-slate-50"
                                    placeholder="-"
                                />
                            </div>
                            <div>
                                <Label>Бодогдсон хувь (%)</Label>
                                <Input
                                    value={computedDiscountPercent > 0 ? computedDiscountPercent.toFixed(2) : ""}
                                    readOnly
                                    className="h-12 text-lg bg-slate-50"
                                    placeholder="-"
                                />
                            </div>
                            <div>
                                <Label>Хямдралын үнэ (автомат)</Label>
                                <Input
                                    value={computedDiscountPrice !== null ? Math.round(computedDiscountPrice).toLocaleString() : ""}
                                    readOnly
                                    className="h-12 text-lg bg-slate-50"
                                    placeholder="хямдралгүй"
                                />
                            </div>
                        </div>
                    )}

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

                    {(productMode === "ready" || forceReadyEdit) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="flex flex-col items-center justify-start overflow-auto">
                    <Label className="py-2 mt-2">Зураг оруулах (хамгийн ихдээ 5)</Label>
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className="w-full h-32 sm:h-40 border-2 border-dashed border-gray-400 rounded-xl flex items-center justify-center cursor-pointer mb-4 text-center px-3 text-sm sm:text-base"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Зургаа энд чирээд эсвэл click хийж зураг оруулна
                    </div>
                    <Input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {form.images.map((img, index) => (
                            <div key={index} className="relative">
                                <img src={img.preview} alt={`preview-${index}`} className="w-full h-28 sm:h-36 object-cover rounded-xl border shadow-lg" />
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

            <div className="sticky bottom-0 bg-white border-t pt-3 flex flex-col sm:flex-row justify-end gap-3 mt-6 pb-3">
                <Button variant="outline" onClick={handleClose} className="h-12 px-6 text-base w-full sm:w-auto">
                    Хаах
                </Button>
                <Button onClick={handleSubmit} disabled={loading} className="h-12 px-6 text-base w-full sm:w-auto">
                    {loading ? "Хадгалж байна..." : editData ? "Засах" : "Хадгалах"}
                </Button>
            </div>
        </Modal>
    );
}
