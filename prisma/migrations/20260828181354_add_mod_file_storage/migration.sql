/*
  Warnings:

  - You are about to drop the column `affectedFiles` on the `Mod` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Mod" DROP COLUMN "affectedFiles",
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "storageKey" TEXT;
