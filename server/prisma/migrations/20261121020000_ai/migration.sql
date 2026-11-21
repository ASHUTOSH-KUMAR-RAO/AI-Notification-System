-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('PENDING', 'DONE', 'FALLBACK', 'FAILED');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "aiPriorityReason" TEXT,
ADD COLUMN     "aiStatus" "AiStatus" NOT NULL DEFAULT 'DONE',
ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "categorySetByUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "groupKey" TEXT,
ADD COLUMN     "isSpam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prioritySetByUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spamReviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spamScore" DOUBLE PRECISION,
ADD COLUMN     "summary" TEXT;

-- CreateTable
CREATE TABLE "NotificationGroup" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "groupKey" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationGroup_userId_groupKey_key" ON "NotificationGroup"("userId", "groupKey");

-- CreateIndex
CREATE INDEX "Notification_userId_groupKey_idx" ON "Notification"("userId", "groupKey");

-- AddForeignKey
ALTER TABLE "NotificationGroup" ADD CONSTRAINT "NotificationGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: every existing notification starts as its own group.
UPDATE "Notification" SET "groupKey" = "id"::text WHERE "groupKey" IS NULL;
