-- CreateTable
CREATE TABLE "SessionCostSnapshot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "campaignId" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,6) NOT NULL,
    "sessionStartedAt" TIMESTAMP(3) NOT NULL,
    "sessionEndedAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionCostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignCostAggregate" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignCostAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionCostSnapshot_sessionId_key" ON "SessionCostSnapshot"("sessionId");

-- CreateIndex
CREATE INDEX "SessionCostSnapshot_campaignId_idx" ON "SessionCostSnapshot"("campaignId");

-- CreateIndex
CREATE INDEX "SessionCostSnapshot_sessionId_idx" ON "SessionCostSnapshot"("sessionId");

-- CreateIndex
CREATE INDEX "SessionCostSnapshot_sessionStartedAt_idx" ON "SessionCostSnapshot"("sessionStartedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignCostAggregate_campaignId_key" ON "CampaignCostAggregate"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignCostAggregate_campaignId_idx" ON "CampaignCostAggregate"("campaignId");

-- AddForeignKey
ALTER TABLE "SessionCostSnapshot" ADD CONSTRAINT "SessionCostSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCostAggregate" ADD CONSTRAINT "CampaignCostAggregate_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

