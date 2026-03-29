-- Add order accept status to AdminProduct
ALTER TABLE "AdminProduct"
ADD COLUMN IF NOT EXISTS "order_accept_status" TEXT DEFAULT 'OPEN';
