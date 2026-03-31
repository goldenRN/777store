CREATE TABLE IF NOT EXISTS "AdminStoreInfo" (
  "id" SERIAL PRIMARY KEY,
  "working_hours" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "facebook_url" TEXT,
  "address" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
