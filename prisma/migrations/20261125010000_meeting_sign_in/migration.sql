-- One permanent QR code for meeting sign-in (members, visiting Rotarians and Rotaractors, prospects).
-- Replaces the old per-session QR attendance. The club confirmed the old tables held no records to keep, so they are dropped.
-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('WEEKLY', 'GATHERING', 'SPECIAL');

-- CreateEnum
CREATE TYPE "Affiliation" AS ENUM ('ROTARIAN', 'ROTARACTOR', 'PROSPECT');

-- CreateEnum
CREATE TYPE "SignInMethod" AS ENUM ('QR', 'MANUAL');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- DropForeignKey
ALTER TABLE "attendance_sessions" DROP CONSTRAINT "attendance_sessions_eventId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_sessions" DROP CONSTRAINT "attendance_sessions_yearId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_sessions" DROP CONSTRAINT "attendance_sessions_createdById_fkey";

-- DropForeignKey
ALTER TABLE "attendance_records" DROP CONSTRAINT "attendance_records_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_records" DROP CONSTRAINT "attendance_records_memberId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_records" DROP CONSTRAINT "attendance_records_adjustedById_fkey";

-- DropTable
DROP TABLE "attendance_sessions";

-- DropTable
DROP TABLE "attendance_records";

-- DropEnum
DROP TYPE "CheckInMethod";

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "MeetingType" NOT NULL DEFAULT 'WEEKLY',
    "date" TIMESTAMP(3) NOT NULL,
    "day" DATE NOT NULL,
    "venue" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_attendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "memberId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "affiliation" "Affiliation",
    "clubName" TEXT,
    "method" "SignInMethod" NOT NULL DEFAULT 'QR',
    "recordedById" TEXT,
    "emailStatus" "EmailStatus",
    "emailSentAt" TIMESTAMP(3),
    "emailError" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meetings_day_key" ON "meetings"("day");

-- CreateIndex
CREATE INDEX "meetings_date_idx" ON "meetings"("date");

-- CreateIndex
CREATE INDEX "meeting_attendance_meetingId_idx" ON "meeting_attendance"("meetingId");

-- CreateIndex
CREATE INDEX "meeting_attendance_meetingId_email_idx" ON "meeting_attendance"("meetingId", "email");

-- CreateIndex
CREATE INDEX "meeting_attendance_meetingId_phone_idx" ON "meeting_attendance"("meetingId", "phone");

-- CreateIndex
CREATE INDEX "meeting_attendance_memberId_idx" ON "meeting_attendance"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_attendance_meetingId_memberId_key" ON "meeting_attendance"("meetingId", "memberId");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

