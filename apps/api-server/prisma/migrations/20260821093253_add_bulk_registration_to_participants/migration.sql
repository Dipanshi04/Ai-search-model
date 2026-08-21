-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "bulk_registration_id" TEXT;

-- CreateIndex
CREATE INDEX "participants_bulk_registration_id_idx" ON "participants"("bulk_registration_id");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_bulk_registration_id_fkey" FOREIGN KEY ("bulk_registration_id") REFERENCES "bulk_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
