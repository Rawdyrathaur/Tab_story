-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('free', 'premium');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'free',
    "nextServerVersion" BIGINT NOT NULL DEFAULT 0,
    "purgeHorizon" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Record" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "collectionId" TEXT,
    "deletedByCollectionId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3) NOT NULL,
    "editedBy" TEXT NOT NULL,
    "serverVersion" BIGINT NOT NULL,
    CONSTRAINT "Record_pkey" PRIMARY KEY ("userId", "id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastServerVersion" BIGINT NOT NULL DEFAULT 0,
    "refreshTokenHash" TEXT,
    "pushSubscription" JSONB,
    CONSTRAINT "Device_pkey" PRIMARY KEY ("userId", "id")
);

-- CreateTable
CREATE TABLE "LimitHit" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Record_userId_serverVersion_idx" ON "Record"("userId", "serverVersion");
CREATE INDEX "Record_userId_type_isDeleted_idx" ON "Record"("userId", "type", "isDeleted");
CREATE INDEX "Record_userId_collectionId_isDeleted_idx" ON "Record"("userId", "collectionId", "isDeleted");
CREATE INDEX "LimitHit_userId_timestamp_idx" ON "LimitHit"("userId", "timestamp");

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LimitHit" ADD CONSTRAINT "LimitHit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
