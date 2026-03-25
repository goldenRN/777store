-- AlterTable
ALTER TABLE "AdminOrder" ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "AdminOrderItem" ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "AdminProduct" ADD COLUMN     "duration_hours" INTEGER;

-- AlterTable
ALTER TABLE "AdminType" ADD COLUMN     "has_duration" BOOLEAN NOT NULL DEFAULT false;
