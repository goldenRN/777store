/*
  Warnings:

  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AdminCategory" (
    "id" SERIAL NOT NULL,
    "category_name" TEXT NOT NULL,
    "description" TEXT,
    "category_image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSubCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminBrand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUnit" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminStatus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminBanner" (
    "id" SERIAL NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminProduct" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "discount_price" INTEGER,
    "stock" INTEGER NOT NULL,
    "material" TEXT,
    "category_id" INTEGER,
    "subcategory_id" INTEGER,
    "brand_id" INTEGER,
    "unit_id" INTEGER,
    "status_id" INTEGER,
    "type_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminProductImage" (
    "id" SERIAL NOT NULL,
    "image_url" TEXT NOT NULL,
    "public_id" TEXT,
    "product_id" INTEGER,
    "product_variant_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminProductVariant" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sku" TEXT,
    "attribute" JSONB,
    "price" INTEGER,
    "stock" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminOrder" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone1" TEXT NOT NULL,
    "phone2" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminOrderItem" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "AdminOrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AdminSubCategory" ADD CONSTRAINT "AdminSubCategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "AdminCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProduct" ADD CONSTRAINT "AdminProduct_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "AdminCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProduct" ADD CONSTRAINT "AdminProduct_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "AdminSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProduct" ADD CONSTRAINT "AdminProduct_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "AdminBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProduct" ADD CONSTRAINT "AdminProduct_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "AdminUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProduct" ADD CONSTRAINT "AdminProduct_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "AdminStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProduct" ADD CONSTRAINT "AdminProduct_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "AdminType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProductImage" ADD CONSTRAINT "AdminProductImage_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "AdminProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProductImage" ADD CONSTRAINT "AdminProductImage_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "AdminProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProductVariant" ADD CONSTRAINT "AdminProductVariant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "AdminProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminOrderItem" ADD CONSTRAINT "AdminOrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "AdminOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
