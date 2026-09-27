/*
  Warnings:

  - You are about to drop the column `merchantId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to alter the column `action` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `resourceType` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `resourceId` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `requestPath` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `requestMethod` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `title` on the `notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `link` on the `notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `linkLabel` on the `notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `token` on the `push_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `deviceName` on the `push_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `deviceId` on the `push_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `osVersion` on the `push_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `appVersion` on the `push_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `manufacturer` on the `push_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `model` on the `push_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `identifier` on the `verification_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `tokenHash` on the `verification_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `ipAddress` on the `verification_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(45)`.
  - You are about to alter the column `device` on the `verification_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.

*/
-- CreateEnum
CREATE TYPE "SyncEntity" AS ENUM ('folders', 'notes');

-- DropIndex
DROP INDEX "audit_logs_merchantId_action_createdAt_idx";

-- DropIndex
DROP INDEX "audit_logs_merchantId_createdAt_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "merchantId",
ALTER COLUMN "action" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "resourceType" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "resourceId" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "requestPath" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "requestMethod" SET DATA TYPE VARCHAR(10);

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "title" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "link" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "linkLabel" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "push_tokens" ALTER COLUMN "token" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "deviceName" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "deviceId" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "osVersion" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "appVersion" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "manufacturer" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "model" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "verification_tokens" ALTER COLUMN "identifier" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "tokenHash" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "ipAddress" SET DATA TYPE VARCHAR(45),
ALTER COLUMN "device" SET DATA TYPE VARCHAR(100);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL DEFAULT '',
    "color" VARCHAR(30) NOT NULL DEFAULT '#3b82f6',
    "icon" VARCHAR(50) NOT NULL DEFAULT 'folder',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "pinCode" VARCHAR(20),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "title" VARCHAR(255) NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mutationId" VARCHAR(150) NOT NULL,
    "entity" "SyncEntity" NOT NULL,
    "entityId" VARCHAR(100) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'applied',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "folders_userId_updatedAt_idx" ON "folders"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "folders_userId_deletedAt_idx" ON "folders"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "notes_userId_updatedAt_idx" ON "notes"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "notes_userId_deletedAt_idx" ON "notes"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "notes_userId_folderId_idx" ON "notes"("userId", "folderId");

-- CreateIndex
CREATE INDEX "sync_logs_userId_entity_entityId_idx" ON "sync_logs"("userId", "entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "sync_logs_userId_mutationId_key" ON "sync_logs"("userId", "mutationId");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
