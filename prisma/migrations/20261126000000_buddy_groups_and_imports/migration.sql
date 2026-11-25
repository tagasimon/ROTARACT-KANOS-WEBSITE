-- Buddy groups (small groups inside the club) on member records, and an IMPORT sign-in method
-- for attendance brought in from the old sign-in system (those rows are never emailed).

-- AlterEnum
ALTER TYPE "SignInMethod" ADD VALUE 'IMPORT';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "buddyGroupId" TEXT;

-- CreateTable
CREATE TABLE "buddy_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buddy_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buddy_groups_name_key" ON "buddy_groups"("name");

-- CreateIndex
CREATE INDEX "members_buddyGroupId_idx" ON "members"("buddyGroupId");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_buddyGroupId_fkey" FOREIGN KEY ("buddyGroupId") REFERENCES "buddy_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

