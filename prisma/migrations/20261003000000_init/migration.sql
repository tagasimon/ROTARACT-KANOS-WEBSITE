-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'CLUB_ADMIN', 'ATTENDANCE_OFFICER', 'EDITOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "Verification" AS ENUM ('VERIFIED', 'NEEDS_VERIFICATION', 'CONFLICTING', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'ALUMNI', 'INACTIVE', 'HONORARY', 'PENDING');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('MEMBER', 'ROTARIAN', 'DISTRICT_LEADER', 'PARTNER_CONTACT', 'COMMUNITY_LEADER', 'GUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('ROTARACT_CLUB', 'ROTARY_CLUB', 'ROTARACT_DISTRICT', 'ROTARY_DISTRICT', 'ROTARY_INTERNATIONAL', 'NGO', 'CORPORATE', 'GOVERNMENT', 'SCHOOL', 'COMMUNITY', 'MEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "RoleCategory" AS ENUM ('BOARD', 'COMMITTEE_CHAIR', 'DISTRICT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('IDEA', 'PLANNING', 'FUNDRAISING', 'IMPLEMENTATION', 'ONGOING', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "MilestoneStage" AS ENUM ('NEED', 'IDEA', 'PLANNING', 'FUNDRAISING', 'PARTNERSHIP', 'IMPLEMENTATION', 'MILESTONE', 'COMPLETION', 'IMPACT', 'UPDATE');

-- CreateEnum
CREATE TYPE "PhotoPhase" AS ENUM ('BEFORE', 'DURING', 'AFTER', 'CURRENT');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CLUB_MEETING', 'FELLOWSHIP', 'SERVICE_PROJECT', 'COMMUNITY_OUTREACH', 'PROFESSIONAL_DEVELOPMENT', 'CAREER', 'TRAINING', 'FUNDRAISER', 'SOCIAL', 'SPORTS', 'NETWORKING', 'INDUCTION', 'INSTALLATION', 'DISTRICT_CONFERENCE', 'DISTRICT_ASSEMBLY', 'DISTRICT_TRAINING', 'LEADERSHIP', 'OFFICIAL_VISIT', 'ROTARACT_DISTRICT_EVENT', 'INTERNATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'TENTATIVE', 'POSTPONED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'REPORTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContentCategory" AS ENUM ('ANNOUNCEMENT', 'PROJECT_UPDATE', 'EVENT', 'PHOTO_STORY', 'VIDEO', 'ACHIEVEMENT', 'FELLOWSHIP', 'MEMBER_SPOTLIGHT', 'LEADERSHIP_UPDATE', 'PROFESSIONAL_DEVELOPMENT', 'COMMUNITY_SERVICE');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('X', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'TIKTOK', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('UPLOAD', 'YOUTUBE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "AlbumCategory" AS ENUM ('GENERAL', 'PROJECT', 'EVENT', 'FELLOWSHIP', 'COMMUNITY_SERVICE', 'PROFESSIONAL_DEVELOPMENT', 'DISTRICT_VISIT', 'CONFERENCE', 'INSTALLATION', 'INDUCTION');

-- CreateEnum
CREATE TYPE "HistoryKind" AS ENUM ('FORMATION', 'CHARTER', 'PRESIDENT', 'PROJECT', 'INITIATIVE', 'TRANSITION', 'EVENT', 'AWARD', 'PARTNERSHIP', 'MOMENT', 'CURRENT');

-- CreateEnum
CREATE TYPE "FeedKind" AS ENUM ('ICS', 'RSS', 'JSON_FEED', 'MANUAL');

-- CreateEnum
CREATE TYPE "FeedTrust" AS ENUM ('TRUSTED', 'REVIEW');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('QR_ACCOUNT', 'QR_PIN', 'MANUAL');

-- CreateEnum
CREATE TYPE "InquiryType" AS ENUM ('ATTEND', 'VOLUNTEER', 'PARTNER', 'SUPPORT_PROJECT', 'JOIN', 'CONTACT');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLOSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "memberId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rotaract_years" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "theme" TEXT,
    "riTheme" TEXT,
    "summary" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "coverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rotaract_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people_profiles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PersonType" NOT NULL DEFAULT 'MEMBER',
    "honorific" TEXT,
    "photoId" TEXT,
    "professionalTitle" TEXT,
    "organization" TEXT,
    "bio" TEXT,
    "interests" TEXT,
    "expertise" TEXT,
    "linkedin" TEXT,
    "x" TEXT,
    "instagram" TEXT,
    "website" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "externalId" TEXT,
    "discoveredAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "memberNumber" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "pinHash" TEXT,
    "membershipDate" TIMESTAMP(3),
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "focus" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "committees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_memberships" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "yearId" TEXT,
    "role" TEXT,

    CONSTRAINT "committee_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leadership_roles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "RoleCategory" NOT NULL DEFAULT 'BOARD',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "leadership_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leadership_assignments" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "committeeId" TEXT,
    "customTitle" TEXT,
    "highlights" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "discoveredAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leadership_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortName" TEXT,
    "type" "OrgType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "website" TEXT,
    "logoId" TEXT,
    "isSelf" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "summary" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "need" TEXT,
    "idea" TEXT,
    "beginning" TEXT,
    "impact" TEXT,
    "today" TEXT,
    "quote" TEXT,
    "quoteAttribution" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "locationName" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "beneficiaries" TEXT,
    "coverId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "yearId" TEXT,
    "leadId" TEXT,
    "committeeId" TEXT,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED',
    "source" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "externalId" TEXT,
    "discoveredAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_milestones" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "dateLabel" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stage" "MilestoneStage" NOT NULL DEFAULT 'MILESTONE',
    "imageId" TEXT,
    "videoUrl" TEXT,
    "eventId" TEXT,
    "yearId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "discoveredAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_metrics" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "impactKey" TEXT,
    "date" TIMESTAMP(3),
    "showInImpact" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "sourceUrl" TEXT,
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,

    CONSTRAINT "project_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_partners" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT,
    "description" TEXT,
    "sourceUrl" TEXT,
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',

    CONSTRAINT "project_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_team_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Rotaractor',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "venue" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "onlineUrl" TEXT,
    "organizerId" TEXT,
    "type" "EventType" NOT NULL DEFAULT 'OTHER',
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "projectId" TEXT,
    "yearId" TEXT,
    "coverId" TEXT,
    "registrationUrl" TEXT,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED',
    "mergedIntoId" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "externalId" TEXT,
    "importedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_sources" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "feedId" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "externalId" TEXT,
    "rawTitle" TEXT,
    "rawData" JSONB,
    "firstImported" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_feeds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "FeedKind" NOT NULL DEFAULT 'ICS',
    "trust" "FeedTrust" NOT NULL DEFAULT 'REVIEW',
    "organizerId" TEXT,
    "defaultType" "EventType" NOT NULL DEFAULT 'OTHER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastFoundCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_visits" (
    "id" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorTitle" TEXT NOT NULL,
    "personId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "venue" TEXT,
    "status" "VisitStatus" NOT NULL DEFAULT 'TENTATIVE',
    "summary" TEXT,
    "yearId" TEXT,
    "eventId" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "discoveredAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "district_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT,
    "category" "ContentCategory" NOT NULL DEFAULT 'ANNOUNCEMENT',
    "coverId" TEXT,
    "authorName" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "yearId" TEXT,
    "projectId" TEXT,
    "eventId" TEXT,
    "socialPostId" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "discoveredAt" TIMESTAMP(3),
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "content" TEXT,
    "imageId" TEXT,
    "imageUrl" TEXT,
    "postedAt" TIMESTAMP(3),
    "organizationId" TEXT,
    "category" "ContentCategory" NOT NULL DEFAULT 'ANNOUNCEMENT',
    "projectId" TEXT,
    "eventId" TEXT,
    "yearId" TEXT,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'IN_REVIEW',
    "showInFeed" BOOLEAN NOT NULL DEFAULT true,
    "convertedTo" JSONB,
    "externalId" TEXT,
    "sourceUrl" TEXT,
    "source" TEXT,
    "sourceType" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "provider" "VideoProvider" NOT NULL DEFAULT 'UPLOAD',
    "storageKey" TEXT,
    "url" TEXT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "variants" JSONB,
    "title" TEXT,
    "alt" TEXT,
    "caption" TEXT,
    "description" TEXT,
    "credit" TEXT,
    "date" TIMESTAMP(3),
    "phase" "PhotoPhase",
    "albumId" TEXT,
    "projectId" TEXT,
    "eventId" TEXT,
    "yearId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "sourceUrl" TEXT,
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_albums" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "AlbumCategory" NOT NULL DEFAULT 'GENERAL',
    "date" TIMESTAMP(3),
    "coverId" TEXT,
    "yearId" TEXT,
    "projectId" TEXT,
    "eventId" TEXT,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED',
    "source" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "storageKey" TEXT,
    "url" TEXT,
    "mimeType" TEXT,
    "date" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "yearId" TEXT,
    "projectId" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "metricValue" DOUBLE PRECISION,
    "metricLabel" TEXT,
    "imageId" TEXT,
    "projectId" TEXT,
    "eventId" TEXT,
    "personId" TEXT,
    "yearId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED',
    "source" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "discoveredAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "history_entries" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "dateLabel" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "HistoryKind" NOT NULL DEFAULT 'MOMENT',
    "imageId" TEXT,
    "videoUrl" TEXT,
    "yearId" TEXT,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED',
    "source" TEXT,
    "sourceUrl" TEXT,
    "sourceType" TEXT,
    "discoveredAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "history_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impact_metrics" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "asOf" TIMESTAMP(3),
    "source" TEXT,
    "sourceUrl" TEXT,
    "verification" "Verification" NOT NULL DEFAULT 'NEEDS_VERIFICATION',

    CONSTRAINT "impact_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "EventType" NOT NULL DEFAULT 'CLUB_MEETING',
    "eventId" TEXT,
    "yearId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "token" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "rotating" BOOLEAN NOT NULL DEFAULT false,
    "rotationSeconds" INTEGER NOT NULL DEFAULT 30,
    "ipAllowlist" TEXT,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "countsTowardRate" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "CheckInMethod" NOT NULL DEFAULT 'QR_ACCOUNT',
    "ip" TEXT,
    "userAgent" TEXT,
    "deviceHash" TEXT,
    "excused" BOOLEAN NOT NULL DEFAULT false,
    "adjustedById" TEXT,
    "note" TEXT,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "type" "InquiryType" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "message" TEXT,
    "projectId" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT,
    "data" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "_PersonToSkill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PersonToSkill_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MilestonePeople" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MilestonePeople_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StoryPeople" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StoryPeople_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SocialPeople" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SocialPeople_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EventPeople" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventPeople_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MediaPeople" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MediaPeople_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MilestoneDocuments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MilestoneDocuments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_HistoryPeople" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_HistoryPeople_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_HistoryProjects" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_HistoryProjects_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_memberId_key" ON "users"("memberId");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "rotaract_years_label_key" ON "rotaract_years"("label");

-- CreateIndex
CREATE UNIQUE INDEX "rotaract_years_slug_key" ON "rotaract_years"("slug");

-- CreateIndex
CREATE INDEX "rotaract_years_startDate_idx" ON "rotaract_years"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "people_profiles_slug_key" ON "people_profiles"("slug");

-- CreateIndex
CREATE INDEX "people_profiles_name_idx" ON "people_profiles"("name");

-- CreateIndex
CREATE INDEX "people_profiles_type_idx" ON "people_profiles"("type");

-- CreateIndex
CREATE UNIQUE INDEX "members_personId_key" ON "members"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "members_memberNumber_key" ON "members"("memberNumber");

-- CreateIndex
CREATE INDEX "members_status_idx" ON "members"("status");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "committees_name_key" ON "committees"("name");

-- CreateIndex
CREATE UNIQUE INDEX "committees_slug_key" ON "committees"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "committee_memberships_committeeId_personId_yearId_key" ON "committee_memberships"("committeeId", "personId", "yearId");

-- CreateIndex
CREATE UNIQUE INDEX "leadership_roles_title_key" ON "leadership_roles"("title");

-- CreateIndex
CREATE UNIQUE INDEX "leadership_roles_slug_key" ON "leadership_roles"("slug");

-- CreateIndex
CREATE INDEX "leadership_assignments_yearId_idx" ON "leadership_assignments"("yearId");

-- CreateIndex
CREATE INDEX "leadership_assignments_personId_idx" ON "leadership_assignments"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_yearId_idx" ON "projects"("yearId");

-- CreateIndex
CREATE INDEX "project_milestones_projectId_date_idx" ON "project_milestones"("projectId", "date");

-- CreateIndex
CREATE INDEX "project_metrics_impactKey_idx" ON "project_metrics"("impactKey");

-- CreateIndex
CREATE UNIQUE INDEX "project_partners_projectId_organizationId_key" ON "project_partners"("projectId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "project_team_members_projectId_personId_role_key" ON "project_team_members"("projectId", "personId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_date_idx" ON "events"("date");

-- CreateIndex
CREATE INDEX "events_organizerId_idx" ON "events"("organizerId");

-- CreateIndex
CREATE INDEX "events_publishStatus_date_idx" ON "events"("publishStatus", "date");

-- CreateIndex
CREATE INDEX "events_externalId_idx" ON "events"("externalId");

-- CreateIndex
CREATE INDEX "event_sources_eventId_idx" ON "event_sources"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_sources_feedId_externalId_key" ON "event_sources"("feedId", "externalId");

-- CreateIndex
CREATE INDEX "district_visits_date_idx" ON "district_visits"("date");

-- CreateIndex
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");

-- CreateIndex
CREATE INDEX "stories_publishStatus_publishedAt_idx" ON "stories"("publishStatus", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "social_posts_url_key" ON "social_posts"("url");

-- CreateIndex
CREATE INDEX "social_posts_publishStatus_postedAt_idx" ON "social_posts"("publishStatus", "postedAt");

-- CreateIndex
CREATE INDEX "media_albumId_idx" ON "media"("albumId");

-- CreateIndex
CREATE INDEX "media_projectId_idx" ON "media"("projectId");

-- CreateIndex
CREATE INDEX "media_eventId_idx" ON "media"("eventId");

-- CreateIndex
CREATE INDEX "media_kind_date_idx" ON "media"("kind", "date");

-- CreateIndex
CREATE UNIQUE INDEX "photo_albums_slug_key" ON "photo_albums"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "documents_slug_key" ON "documents"("slug");

-- CreateIndex
CREATE INDEX "achievements_date_idx" ON "achievements"("date");

-- CreateIndex
CREATE INDEX "history_entries_date_idx" ON "history_entries"("date");

-- CreateIndex
CREATE UNIQUE INDEX "impact_metrics_key_key" ON "impact_metrics"("key");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_token_key" ON "attendance_sessions"("token");

-- CreateIndex
CREATE INDEX "attendance_sessions_startsAt_idx" ON "attendance_sessions"("startsAt");

-- CreateIndex
CREATE INDEX "attendance_records_memberId_idx" ON "attendance_records"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_sessionId_memberId_key" ON "attendance_records"("sessionId", "memberId");

-- CreateIndex
CREATE INDEX "inquiries_status_createdAt_idx" ON "inquiries"("status", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "_PersonToSkill_B_index" ON "_PersonToSkill"("B");

-- CreateIndex
CREATE INDEX "_MilestonePeople_B_index" ON "_MilestonePeople"("B");

-- CreateIndex
CREATE INDEX "_StoryPeople_B_index" ON "_StoryPeople"("B");

-- CreateIndex
CREATE INDEX "_SocialPeople_B_index" ON "_SocialPeople"("B");

-- CreateIndex
CREATE INDEX "_EventPeople_B_index" ON "_EventPeople"("B");

-- CreateIndex
CREATE INDEX "_MediaPeople_B_index" ON "_MediaPeople"("B");

-- CreateIndex
CREATE INDEX "_MilestoneDocuments_B_index" ON "_MilestoneDocuments"("B");

-- CreateIndex
CREATE INDEX "_HistoryPeople_B_index" ON "_HistoryPeople"("B");

-- CreateIndex
CREATE INDEX "_HistoryProjects_B_index" ON "_HistoryProjects"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotaract_years" ADD CONSTRAINT "rotaract_years_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people_profiles" ADD CONSTRAINT "people_profiles_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_memberships" ADD CONSTRAINT "committee_memberships_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_memberships" ADD CONSTRAINT "committee_memberships_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_memberships" ADD CONSTRAINT "committee_memberships_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadership_assignments" ADD CONSTRAINT "leadership_assignments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadership_assignments" ADD CONSTRAINT "leadership_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "leadership_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadership_assignments" ADD CONSTRAINT "leadership_assignments_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadership_assignments" ADD CONSTRAINT "leadership_assignments_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "people_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_metrics" ADD CONSTRAINT "project_metrics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_partners" ADD CONSTRAINT "project_partners_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_partners" ADD CONSTRAINT "project_partners_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sources" ADD CONSTRAINT "event_sources_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sources" ADD CONSTRAINT "event_sources_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "event_feeds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_feeds" ADD CONSTRAINT "event_feeds_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_visits" ADD CONSTRAINT "district_visits_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_visits" ADD CONSTRAINT "district_visits_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_visits" ADD CONSTRAINT "district_visits_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "social_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "photo_albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_albums" ADD CONSTRAINT "photo_albums_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history_entries" ADD CONSTRAINT "history_entries_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history_entries" ADD CONSTRAINT "history_entries_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "rotaract_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonToSkill" ADD CONSTRAINT "_PersonToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "people_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonToSkill" ADD CONSTRAINT "_PersonToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestonePeople" ADD CONSTRAINT "_MilestonePeople_A_fkey" FOREIGN KEY ("A") REFERENCES "people_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestonePeople" ADD CONSTRAINT "_MilestonePeople_B_fkey" FOREIGN KEY ("B") REFERENCES "project_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoryPeople" ADD CONSTRAINT "_StoryPeople_A_fkey" FOREIGN KEY ("A") REFERENCES "people_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StoryPeople" ADD CONSTRAINT "_StoryPeople_B_fkey" FOREIGN KEY ("B") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SocialPeople" ADD CONSTRAINT "_SocialPeople_A_fkey" FOREIGN KEY ("A") REFERENCES "people_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SocialPeople" ADD CONSTRAINT "_SocialPeople_B_fkey" FOREIGN KEY ("B") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventPeople" ADD CONSTRAINT "_EventPeople_A_fkey" FOREIGN KEY ("A") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventPeople" ADD CONSTRAINT "_EventPeople_B_fkey" FOREIGN KEY ("B") REFERENCES "people_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MediaPeople" ADD CONSTRAINT "_MediaPeople_A_fkey" FOREIGN KEY ("A") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MediaPeople" ADD CONSTRAINT "_MediaPeople_B_fkey" FOREIGN KEY ("B") REFERENCES "people_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneDocuments" ADD CONSTRAINT "_MilestoneDocuments_A_fkey" FOREIGN KEY ("A") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneDocuments" ADD CONSTRAINT "_MilestoneDocuments_B_fkey" FOREIGN KEY ("B") REFERENCES "project_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HistoryPeople" ADD CONSTRAINT "_HistoryPeople_A_fkey" FOREIGN KEY ("A") REFERENCES "history_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HistoryPeople" ADD CONSTRAINT "_HistoryPeople_B_fkey" FOREIGN KEY ("B") REFERENCES "people_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HistoryProjects" ADD CONSTRAINT "_HistoryProjects_A_fkey" FOREIGN KEY ("A") REFERENCES "history_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HistoryProjects" ADD CONSTRAINT "_HistoryProjects_B_fkey" FOREIGN KEY ("B") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

