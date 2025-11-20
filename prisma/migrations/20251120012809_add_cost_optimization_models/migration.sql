-- CreateEnum
CREATE TYPE "KnowledgeCategory" AS ENUM ('LOCATION', 'NPC', 'ITEM', 'LORE', 'FACTION', 'QUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "MechanicsCategory" AS ENUM ('COMBAT', 'SKILL_CHECK', 'MAGIC', 'SOCIAL', 'EXPLORATION', 'REST', 'OTHER');

-- CreateTable
CREATE TABLE "SessionState" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "currentLocation" TEXT,
    "activeNPCs" JSONB,
    "ongoingQuests" JSONB,
    "partyConditions" JSONB,
    "recentEvents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSummary" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messageRangeStart" INTEGER NOT NULL,
    "messageRangeEnd" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "keyEvents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignKnowledge" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "category" "KnowledgeCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" JSONB,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToneProfile" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB,
    "toneRules" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToneProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MechanicsRule" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "category" "MechanicsCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MechanicsRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionState_sessionId_key" ON "SessionState"("sessionId");

-- CreateIndex
CREATE INDEX "SessionState_sessionId_idx" ON "SessionState"("sessionId");

-- CreateIndex
CREATE INDEX "SessionSummary_sessionId_idx" ON "SessionSummary"("sessionId");

-- CreateIndex
CREATE INDEX "SessionSummary_messageRangeEnd_idx" ON "SessionSummary"("messageRangeEnd");

-- CreateIndex
CREATE INDEX "CampaignKnowledge_campaignId_idx" ON "CampaignKnowledge"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignKnowledge_category_idx" ON "CampaignKnowledge"("category");

-- CreateIndex
CREATE INDEX "ToneProfile_campaignId_idx" ON "ToneProfile"("campaignId");

-- CreateIndex
CREATE INDEX "ToneProfile_priority_idx" ON "ToneProfile"("priority");

-- CreateIndex
CREATE INDEX "MechanicsRule_campaignId_idx" ON "MechanicsRule"("campaignId");

-- CreateIndex
CREATE INDEX "MechanicsRule_category_idx" ON "MechanicsRule"("category");

-- AddForeignKey
ALTER TABLE "SessionState" ADD CONSTRAINT "SessionState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSummary" ADD CONSTRAINT "SessionSummary_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignKnowledge" ADD CONSTRAINT "CampaignKnowledge_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToneProfile" ADD CONSTRAINT "ToneProfile_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MechanicsRule" ADD CONSTRAINT "MechanicsRule_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
