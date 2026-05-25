CREATE TABLE IF NOT EXISTS "UserNotification" (
  "id" SERIAL NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'order_arrived',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "order_id" INTEGER,
  "order_item_id" INTEGER,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserNotification_user_id_is_read_created_at_idx"
  ON "UserNotification"("user_id", "is_read", "created_at");

CREATE INDEX IF NOT EXISTS "UserNotification_order_id_idx"
  ON "UserNotification"("order_id");

CREATE INDEX IF NOT EXISTS "UserNotification_order_item_id_idx"
  ON "UserNotification"("order_item_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserNotification_user_id_fkey'
  ) THEN
    ALTER TABLE "UserNotification"
    ADD CONSTRAINT "UserNotification_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
