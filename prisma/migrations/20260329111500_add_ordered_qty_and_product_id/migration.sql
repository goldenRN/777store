-- Add ordered quantity to AdminProduct
ALTER TABLE "AdminProduct"
ADD COLUMN IF NOT EXISTS "ordered_qty" INT DEFAULT 0;

-- Add product_id to AdminOrderItem
ALTER TABLE "AdminOrderItem"
ADD COLUMN IF NOT EXISTS "product_id" INT;

-- Add FK for product_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AdminOrderItem_product_id_fkey'
  ) THEN
    ALTER TABLE "AdminOrderItem"
    ADD CONSTRAINT "AdminOrderItem_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "AdminProduct"("id") ON DELETE SET NULL;
  END IF;
END $$;
