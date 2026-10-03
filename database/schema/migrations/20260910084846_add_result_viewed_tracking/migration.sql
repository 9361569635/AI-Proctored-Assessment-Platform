-- AlterTable
ALTER TABLE "Shortlisting" ADD COLUMN     "resultViewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resultViewedAt" TIMESTAMP(3),
ALTER COLUMN "finalStatus" SET DEFAULT 'UNDER_REVIEW';
