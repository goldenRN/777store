'use client';

import React, { useState, useEffect } from 'react';
import AddCategoryModal from './AddCategoryModal';
import EditCategoryModal from './EditCategoryModal';
import CategoryTable, { Category } from './categoryTable';
import BackButton from '@/components/BackButton';
import { Plus, Loader2 } from 'lucide-react';

const CategoryPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (!res.ok) throw new Error('Ангиллын мэдээлэл татахад алдаа гарлаа');
      const data = await res.json();

      const formatted: Category[] = data.map((c: any) => ({
        category_id: c.category_id,
        category_name: c.category_name,
        category_image: c.category_image,
        description: c.description,
        subcategories: c.subcategories || [],
      }));

      setCategories(formatted);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Мэдээлэл татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add new category
  const handleAddCategory = async (formData: FormData) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Ангилал нэмэхэд алдаа гарлаа');
      setOpenModal(false);
      await fetchCategories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ✅ Edit button click handler
  const handleEditClick = (cat: Category) => {
    setEditCategory(cat);
    setEditModalOpen(true);
  };

  // ✅ Update category info
  const handleUpdateCategory = async (id: number, formData: FormData) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Ангилал засахад алдаа гарлаа');
      }

      setEditModalOpen(false);
      await fetchCategories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ✅ Delete category
  const handleDeleteCategory = async (id: number) => {
    const confirmed = window.confirm('Энэ ангиллыг устгах уу?');
    if (!confirmed) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Устгах үед алдаа гарлаа');
      }

      setCategories((prev) => prev.filter((cat) => cat.category_id !== id));
      alert('Амжилттай устгалаа');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="w-[calc(100vw-300px)] p-4">
      {/* Header section */}
      <div className="flex justify-between items-center bg-white sticky top-0 z-10 p-2 mb-4 border-b">
        <BackButton text="Буцах" link="/admin/dashboard" />
        <button
          className="bg-yellow-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded text-xs flex items-center gap-2"
          onClick={() => setOpenModal(true)}
        >
          <Plus size={15} /> Нэмэх
        </button>
      </div>

      {/* Loading / Error / Table */}
      {loading ? (
        <div className="flex justify-center items-center h-40 text-gray-500">
          <Loader2 className="animate-spin mr-2" /> Уншиж байна...
        </div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : (
        <CategoryTable
          categories={categories}
          onEdit={handleEditClick}
          onDelete={handleDeleteCategory}
        />
      )}

      {/* Modals */}
      <EditCategoryModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleUpdateCategory}
        category={editCategory}
      />
      <AddCategoryModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={handleAddCategory}
      />
    </div>
  );
};

export default CategoryPage;




// 'use client';

// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
//   TableCaption,
// } from '@/components/ui/table';
// import { useState, Fragment } from 'react';
// import { ChevronDown, ChevronUp, Pencil, Trash } from 'lucide-react';

// interface SubCategory {
//   id: number;
//   name: string;
//   description?: string;
// }

// export interface Category {
//   category_id: number;
//   category_name: string;
//   category_image?: string;
//   description?: string;
//   subcategories: SubCategory[];
// }

// interface CategoryTableProps {
//   categories: Category[];
//   onDelete?: (id: number) => void;
//   onEdit: (cat: Category) => void;
// }

// const CategoryTable = ({ categories, onDelete, onEdit }: CategoryTableProps) => {
//   const [selectedImage, setSelectedImage] = useState<string | null>(null);
//   const [expanded, setExpanded] = useState<number | null>(null);

//   const toggleExpand = (id: number) => {
//     setExpanded((prev) => (prev === id ? null : id));
//   };

//   return (
//     <div className="overflow-x-auto">
//       <Table className="min-w-full border rounded-lg shadow-sm bg-white">
//         <TableCaption>Ангиллын жагсаалт</TableCaption>
//         <TableHeader>
//           <TableRow className="bg-gray-100">
//             <TableHead className="font-semibold text-gray-700">Категори</TableHead>
//             <TableHead className="font-semibold text-gray-700">Тайлбар</TableHead>
//             <TableHead className="font-semibold text-gray-700">Зураг</TableHead>
//             <TableHead className="font-semibold text-gray-700">Үйлдэл</TableHead>
//             <TableHead className="font-semibold text-gray-700 text-center">
//               Дэд ангилал
//             </TableHead>
//           </TableRow>
//         </TableHeader>

//         <TableBody>
//           {categories.length === 0 ? (
//             <TableRow>
//               <TableCell
//                 colSpan={5}
//                 className="text-center text-gray-500 italic py-6"
//               >
//                 Ангиллын мэдээлэл байхгүй байна
//               </TableCell>
//             </TableRow>
//           ) : (
//             categories.map((cat) => (
//               <Fragment key={cat.category_id}>
//                 {/* ✅ Category Row */}
//                 <TableRow
//                   className={`transition-all ${
//                     expanded === cat.category_id ? 'bg-gray-50' : ''
//                   }`}
//                 >
//                   <TableCell className="font-medium">
//                     {cat.category_name}
//                   </TableCell>
//                   <TableCell>{cat.description || '-'}</TableCell>
//                   <TableCell>
//                     {cat.category_image ? (
//                       <img
//                         src={`${process.env.NEXT_PUBLIC_API_URL}${cat.category_image}`}
//                         alt={cat.category_name}
//                         width={50}
//                         height={50}
//                         className="cursor-pointer rounded-md hover:scale-105 transition-transform"
//                         onClick={() =>
//                           setSelectedImage(
//                             `${process.env.NEXT_PUBLIC_API_URL}${cat.category_image}`
//                           )
//                         }
//                       />
//                     ) : (
//                       <span className="text-gray-400 italic text-sm">
//                         (зураг байхгүй)
//                       </span>
//                     )}
//                   </TableCell>

//                   {/* ✏️ Edit / Delete */}
//                   <TableCell>
//                     <div className="flex items-center gap-2">
//                       <button
//                         className="bg-orange-100 hover:bg-orange-300 text-gray-700 py-1 px-3 rounded text-xs transition"
//                         onClick={() => onEdit(cat)}
//                         title="Засах"
//                       >
//                         <Pencil size={16} />
//                       </button>

//                       <button
//                         className="bg-red-100 hover:bg-red-300 text-gray-700 py-1 px-3 rounded text-xs transition"
//                         onClick={() => onDelete && onDelete(cat.category_id)}
//                         title="Устгах"
//                       >
//                         <Trash size={16} />
//                       </button>
//                     </div>
//                   </TableCell>

//                   {/* 🔽 Expand */}
//                   <TableCell className="text-center">
//                     <button
//                       onClick={() => toggleExpand(cat.category_id)}
//                       className="bg-blue-100 hover:bg-blue-300 text-black py-1 px-2 rounded text-xs transition"
//                       title="Дэд ангилал харах"
//                     >
//                       {expanded === cat.category_id ? (
//                         <ChevronUp size={16} />
//                       ) : (
//                         <ChevronDown size={16} />
//                       )}
//                     </button>
//                   </TableCell>
//                 </TableRow>

//                 {/* 🔽 Expanded Subcategory List */}
//                 {expanded === cat.category_id && (
//                   <TableRow className="bg-gray-50">
//                     <TableCell colSpan={5}>
//                       {cat.subcategories?.length > 0 ? (
//                         <div className="p-3 border-l-2 border-blue-300">
//                           <h4 className="font-semibold mb-2 text-gray-700">
//                             Дэд ангиллууд:
//                           </h4>
//                           <ul className="list-disc list-inside space-y-1 text-gray-600">
//                             {cat.subcategories.map((sub) => (
//                               <li key={sub.id}>
//                                 <span className="font-medium">{sub.name}</span>
//                                 {sub.description && (
//                                   <span className="text-gray-500 text-sm ml-1">
//                                     — {sub.description}
//                                   </span>
//                                 )}
//                               </li>
//                             ))}
//                           </ul>
//                         </div>
//                       ) : (
//                         <div className="p-3 text-gray-500 italic text-center">
//                           Дэд ангилал алга байна
//                         </div>
//                       )}
//                     </TableCell>
//                   </TableRow>
//                 )}
//               </Fragment>
//             ))
//           )}
//         </TableBody>
//       </Table>

//       {/* 🖼️ Зураг томруулах modal */}
//       {selectedImage && (
//         <div
//           className="fixed inset-0 bg-black/70 flex justify-center items-center z-50"
//           onClick={() => setSelectedImage(null)}
//         >
//           <img
//             src={selectedImage}
//             alt="Category"
//             className="max-h-[80vh] max-w-[90vw] rounded-lg shadow-2xl border-4 border-white object-contain"
//           />
//         </div>
//       )}
//     </div>
//   );
// };

// export default CategoryTable;

