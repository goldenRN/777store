import HeaderClient from "@/components/HeaderClient";
import { getHeaderBrands, getHeaderCategories, getStoreInfo } from "@/lib/siteData";

export default async function Header() {
  const [storeInfo, categories, brands] = await Promise.all([
    getStoreInfo(),
    getHeaderCategories(),
    getHeaderBrands(),
  ]);

  return (
    <HeaderClient
      storeInfo={storeInfo}
      categories={categories.map((category) => ({
        category_id: category.id,
        category_name: category.category_name,
        subcategories: category.subcategories.map((subcategory) => ({
          id: subcategory.id,
          name: subcategory.name,
        })),
      }))}
      brands={brands}
    />
  );
}
