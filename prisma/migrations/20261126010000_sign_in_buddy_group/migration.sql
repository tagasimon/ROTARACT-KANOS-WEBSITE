-- The buddy group a member picks on the sign-in form, kept on their sign-in.

-- AlterTable
ALTER TABLE "meeting_attendance" ADD COLUMN     "buddyGroupId" TEXT;

-- CreateIndex
CREATE INDEX "meeting_attendance_buddyGroupId_idx" ON "meeting_attendance"("buddyGroupId");

-- AddForeignKey
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_buddyGroupId_fkey" FOREIGN KEY ("buddyGroupId") REFERENCES "buddy_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

