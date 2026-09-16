/*
  Warnings:

  - You are about to drop the column `fileScanResult` on the `Mod` table. All the data in the column will be lost.
  - You are about to drop the column `fileScanStatus` on the `Mod` table. All the data in the column will be lost.
  - You are about to drop the column `fileScannedAt` on the `Mod` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Mod" DROP COLUMN "fileScanResult",
DROP COLUMN "fileScanStatus",
DROP COLUMN "fileScannedAt",
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Mod_authorId_idx" ON "Mod"("authorId");

-- CreateIndex
CREATE INDEX "Mod_deletedAt_idx" ON "Mod"("deletedAt");

-- CreateIndex
CREATE INDEX "Mod_authorId_deletedAt_idx" ON "Mod"("authorId", "deletedAt");
