CREATE TABLE "AdminPromo" (
    "id" SERIAL NOT NULL,
    "badge" TEXT,
    "title" TEXT,
    "subtitle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminPromo_pkey" PRIMARY KEY ("id")
);
