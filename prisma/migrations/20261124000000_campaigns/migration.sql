-- Fundraising campaigns (admin-managed) and their updates
-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'GOAL_REACHED', 'CLOSED');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "summary" TEXT,
    "story" TEXT,
    "beneficiary" TEXT,
    "imageId" TEXT,
    "goalAmount" DOUBLE PRECISION,
    "raisedAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "raisedAsOf" TIMESTAMP(3),
    "donateUrl" TEXT,
    "donateLabel" TEXT,
    "howToGive" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "source" TEXT,
    "sourceUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_updates" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_slug_key" ON "campaigns"("slug");

-- CreateIndex
CREATE INDEX "campaigns_publishStatus_featured_idx" ON "campaigns"("publishStatus", "featured");

-- CreateIndex
CREATE INDEX "campaign_updates_campaignId_date_idx" ON "campaign_updates"("campaignId", "date");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_updates" ADD CONSTRAINT "campaign_updates_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The club's current appeal. Facts come from the official fundraising page; the
-- amount raised is left empty until an admin enters it under Admin → Fundraising campaigns.
INSERT INTO "campaigns" ("id", "title", "slug", "tagline", "summary", "story", "beneficiary", "goalAmount", "currency", "donateUrl", "donateLabel", "status", "featured", "publishStatus", "source", "sourceUrl", "seoDescription", "updatedAt")
VALUES (
  'cmp_save_dr_katende',
  'Save Dr. Fredrick Katende',
  'save-dr-katende',
  'He has spent his life caring for others. Now he needs us.',
  'Dr. Fredrick Katende, our President-Elect, needs a kidney transplant. We are raising UGX 200 million for his medical bills and the transplant.',
  E'Dr. Fredrick Katende is a young medical doctor, a first-year Master of Medicine student in Anaesthesia at Makerere University, and the President-Elect of the Rotaract Club of Kampala North.\n\nFredrick has end-stage kidney disease. He depends on dialysis, and he needs a kidney transplant.\n\nThe club, his family and his friends are raising **UGX 200 million** to cover his ongoing medical bills, the transplant and the treatment that goes with it.\n\n## How you can help\n\n- **Give** on the official fundraising page. Every contribution counts, whatever its size.\n- **Share** this appeal with your family, friends, colleagues and networks. If you cannot give, sharing may reach someone who can.\n- **Keep Fredrick in your thoughts and prayers.**\n\nThank you for standing with one of our own.',
  'Dr. Fredrick Katende',
  200000000,
  'UGX',
  'https://www.gofundme.com/f/save-dr-fredrick-katende-kidney-transplant',
  'Donate now',
  'ACTIVE',
  true,
  'PUBLISHED',
  'GoFundMe: Save Dr Fredrick Katende – Kidney Transplant',
  'https://www.gofundme.com/f/save-dr-fredrick-katende-kidney-transplant',
  'Dr. Fredrick Katende, President-Elect of the Rotaract Club of Kampala North, needs a kidney transplant. Help us raise UGX 200 million.',
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;
