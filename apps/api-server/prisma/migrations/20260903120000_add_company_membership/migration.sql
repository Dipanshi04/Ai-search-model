-- AlterTable
ALTER TABLE "companies" ADD COLUMN "membership_start_date" TIMESTAMP(3),
ADD COLUMN "membership_end_date" TIMESTAMP(3),
ADD COLUMN "renewal_pending" BOOLEAN NOT NULL DEFAULT false;
