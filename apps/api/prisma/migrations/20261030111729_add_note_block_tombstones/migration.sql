-- AlterTable
ALTER TABLE "note_blocks" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "note_blocks_noteId_deletedAt_idx" ON "note_blocks"("noteId", "deletedAt");
