-- CreateEnum
CREATE TYPE "ShareAccess" AS ENUM ('view', 'copy');

-- CreateTable
CREATE TABLE "note_shares" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "slug" VARCHAR(24) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "access" "ShareAccess" NOT NULL DEFAULT 'view',
    "passwordHash" VARCHAR(255),
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "note_shares_noteId_key" ON "note_shares"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "note_shares_slug_key" ON "note_shares"("slug");

-- CreateIndex
CREATE INDEX "note_shares_slug_isActive_idx" ON "note_shares"("slug", "isActive");

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
