export type SubCategory = {
  id: number;
  name: string;
  description?: string | null;
};

export type Category = {
  category_id: number;
  category_name: string;
  category_image?: string | null;
  description?: string | null;
  subcategories?: SubCategory[];
};
