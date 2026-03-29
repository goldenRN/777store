-- Add order delivery and kind fields
ALTER TABLE "AdminOrder"
ADD COLUMN IF NOT EXISTS "order_kind" TEXT DEFAULT 'ready',
ADD COLUMN IF NOT EXISTS "delivery_method" TEXT,
ADD COLUMN IF NOT EXISTS "delivery_name" TEXT,
ADD COLUMN IF NOT EXISTS "delivery_phone" TEXT,
ADD COLUMN IF NOT EXISTS "delivery_address" TEXT;
