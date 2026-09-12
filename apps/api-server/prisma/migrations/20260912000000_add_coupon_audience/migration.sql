-- CreateEnum
CREATE TYPE "CouponAudience" AS ENUM ('ALL', 'PREMIUM_ONLY');

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN "audience" "CouponAudience" NOT NULL DEFAULT 'ALL';
