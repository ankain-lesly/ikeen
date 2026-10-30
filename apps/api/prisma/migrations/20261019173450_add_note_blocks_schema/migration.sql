-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('text', 'list', 'media');

-- AlterEnum
ALTER TYPE "SyncEntity" ADD VALUE 'note_blocks';

-- CreateTable
CREATE TABLE "note_blocks" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "type" "BlockType" NOT NULL DEFAULT 'text',
    "position" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "note_blocks_noteId_position_idx" ON "note_blocks"("noteId", "position");

-- AddForeignKey
ALTER TABLE "note_blocks" ADD CONSTRAINT "note_blocks_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
