ALTER TABLE "AdminOrder"
  ADD COLUMN "payment_status" TEXT DEFAULT 'UNPAID',
  ADD COLUMN "payment_provider" TEXT DEFAULT 'qpay',
  ADD COLUMN "qpay_invoice_id" TEXT,
  ADD COLUMN "qpay_payment_id" TEXT,
  ADD COLUMN "qpay_sender_invoice_no" TEXT,
  ADD COLUMN "qpay_qr_text" TEXT,
  ADD COLUMN "qpay_qr_image" TEXT,
  ADD COLUMN "qpay_short_url" TEXT,
  ADD COLUMN "qpay_deeplink" JSONB,
  ADD COLUMN "payment_expires_at" TIMESTAMP(3),
  ADD COLUMN "paid_at" TIMESTAMP(3);
