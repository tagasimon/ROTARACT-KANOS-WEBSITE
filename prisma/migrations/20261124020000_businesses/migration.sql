-- Member businesses and corporate members directory
-- CreateEnum
CREATE TYPE "BusinessKind" AS ENUM ('MEMBER_BUSINESS', 'CORPORATE_MEMBER');

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "BusinessKind" NOT NULL DEFAULT 'MEMBER_BUSINESS',
    "category" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "services" TEXT,
    "logoId" TEXT,
    "coverId" TEXT,
    "location" TEXT,
    "website" TEXT,
    "contactUrl" TEXT,
    "linkedin" TEXT,
    "x" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "ownerId" TEXT,
    "ownerRole" TEXT,
    "memberSince" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");

-- CreateIndex
CREATE INDEX "businesses_publishStatus_kind_idx" ON "businesses"("publishStatus", "kind");

-- CreateIndex
CREATE INDEX "businesses_category_idx" ON "businesses"("category");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "people_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

