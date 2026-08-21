-- CreateTable
CREATE TABLE "bulk_registrations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "company_name" TEXT NOT NULL,
    "hr_name" TEXT NOT NULL,
    "hr_email" TEXT NOT NULL,
    "hr_password_hash" TEXT NOT NULL,
    "number_of_registrations" INTEGER NOT NULL,
    "payment_completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bulk_registrations_hr_email_key" ON "bulk_registrations"("hr_email");

-- AddForeignKey
ALTER TABLE "bulk_registrations" ADD CONSTRAINT "bulk_registrations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
