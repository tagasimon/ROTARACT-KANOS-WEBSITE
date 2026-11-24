-- Admin-managed before/after comparisons for projects (two or three stages, several per project)
-- CreateTable
CREATE TABLE "project_comparisons" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "beforeId" TEXT,
    "duringId" TEXT,
    "afterId" TEXT,
    "beforeLabel" TEXT NOT NULL DEFAULT 'Before',
    "duringLabel" TEXT NOT NULL DEFAULT 'During',
    "afterLabel" TEXT NOT NULL DEFAULT 'After',
    "beforeDate" TIMESTAMP(3),
    "duringDate" TIMESTAMP(3),
    "afterDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_comparisons_projectId_sortOrder_idx" ON "project_comparisons"("projectId", "sortOrder");

-- AddForeignKey
ALTER TABLE "project_comparisons" ADD CONSTRAINT "project_comparisons_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comparisons" ADD CONSTRAINT "project_comparisons_beforeId_fkey" FOREIGN KEY ("beforeId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comparisons" ADD CONSTRAINT "project_comparisons_duringId_fkey" FOREIGN KEY ("duringId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comparisons" ADD CONSTRAINT "project_comparisons_afterId_fkey" FOREIGN KEY ("afterId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

