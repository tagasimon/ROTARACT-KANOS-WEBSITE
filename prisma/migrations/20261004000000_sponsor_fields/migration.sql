-- Sponsor & donor fields on projects
ALTER TABLE "projects" ADD COLUMN "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "projects" ADD COLUMN "supportNeeds" TEXT;
ALTER TABLE "projects" ADD COLUMN "fundingGoal" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN "fundingRaised" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN "fundingCurrency" TEXT DEFAULT 'UGX';
