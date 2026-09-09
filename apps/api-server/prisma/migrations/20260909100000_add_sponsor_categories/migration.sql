-- CreateTable
CREATE TABLE "sponsor_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "always_separate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsor_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sponsor_categories_name_key" ON "sponsor_categories"("name");

-- AlterTable
ALTER TABLE "sponsors" ADD COLUMN "category_id" TEXT;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "sponsor_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Starter categories — editable/extendable from the admin panel afterward.
INSERT INTO "sponsor_categories" ("id", "name", "display_order", "always_separate", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Title Sponsor', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Hydration Partner', 1, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Food Partner', 2, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Snacking Partner', 3, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Real Estate Partner', 4, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Community Partner', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Plantation Partner', 6, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Aqua Partner', 7, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CSR Partner', 8, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
