-- Add arrival status and cargo fee to AdminProduct
ALTER TABLE "AdminProduct"
ADD COLUMN IF NOT EXISTS "arrival_status" TEXT DEFAULT 'Хүлээгдэж буй',
ADD COLUMN IF NOT EXISTS "cargo_fee" INT;
