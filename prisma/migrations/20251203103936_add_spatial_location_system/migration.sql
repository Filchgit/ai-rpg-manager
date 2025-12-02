-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('OBSTACLE', 'POI', 'DOOR', 'FURNITURE', 'TERRAIN', 'HAZARD');

-- CreateEnum
CREATE TYPE "CoverLevel" AS ENUM ('NONE', 'HALF', 'THREE_QUARTERS', 'FULL');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('MELEE', 'RANGED', 'SPELL', 'CONVERSATION', 'PERCEPTION', 'CUSTOM');

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minX" DOUBLE PRECISION NOT NULL,
    "maxX" DOUBLE PRECISION NOT NULL,
    "minY" DOUBLE PRECISION NOT NULL,
    "maxY" DOUBLE PRECISION NOT NULL,
    "minZ" DOUBLE PRECISION NOT NULL,
    "maxZ" DOUBLE PRECISION NOT NULL,
    "unitType" TEXT NOT NULL DEFAULT 'meters',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationFeature" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" "FeatureType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,
    "blocksMovement" BOOLEAN NOT NULL DEFAULT false,
    "blocksVision" BOOLEAN NOT NULL DEFAULT false,
    "providesCover" "CoverLevel" NOT NULL DEFAULT 'NONE',
    "elevation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterPosition" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "locationId" TEXT,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "z" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "facing" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovementRule" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxDistance" DOUBLE PRECISION NOT NULL,
    "interactionType" "InteractionType" NOT NULL,
    "requiresLineOfSight" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovementRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Location_campaignId_idx" ON "Location"("campaignId");

-- CreateIndex
CREATE INDEX "LocationFeature_locationId_idx" ON "LocationFeature"("locationId");

-- CreateIndex
CREATE INDEX "LocationFeature_type_idx" ON "LocationFeature"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterPosition_characterId_key" ON "CharacterPosition"("characterId");

-- CreateIndex
CREATE INDEX "CharacterPosition_characterId_idx" ON "CharacterPosition"("characterId");

-- CreateIndex
CREATE INDEX "CharacterPosition_locationId_idx" ON "CharacterPosition"("locationId");

-- CreateIndex
CREATE INDEX "MovementRule_campaignId_idx" ON "MovementRule"("campaignId");

-- CreateIndex
CREATE INDEX "MovementRule_interactionType_idx" ON "MovementRule"("interactionType");

-- AlterTable
ALTER TABLE "SessionState" ADD COLUMN "locationId" TEXT;

-- CreateIndex
CREATE INDEX "SessionState_locationId_idx" ON "SessionState"("locationId");

-- AddForeignKey
ALTER TABLE "SessionState" ADD CONSTRAINT "SessionState_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationFeature" ADD CONSTRAINT "LocationFeature_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterPosition" ADD CONSTRAINT "CharacterPosition_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterPosition" ADD CONSTRAINT "CharacterPosition_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementRule" ADD CONSTRAINT "MovementRule_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

