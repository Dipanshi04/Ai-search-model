-- CreateTable
CREATE TABLE "bulk_inquiries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company_name" TEXT NOT NULL,
    "pass_count" INTEGER,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_inquiries_pkey" PRIMARY KEY ("id")
);
