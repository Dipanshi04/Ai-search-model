-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PREMIUM', 'NON_PREMIUM');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN "status" "CompanyStatus" NOT NULL DEFAULT 'NON_PREMIUM';
