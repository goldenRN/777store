/*
  Warnings:

  - Made the column `ordered_qty` on table `AdminProduct` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AdminOrderItem" DROP CONSTRAINT "AdminOrderItem_product_id_fkey";

-- AlterTable
ALTER TABLE "AdminProduct" ALTER COLUMN "ordered_qty" SET NOT NULL;

-- AlterTable
ALTER TABLE "AdminStoreInfo" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "AdminOrderItem" ADD CONSTRAINT "AdminOrderItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "AdminProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
