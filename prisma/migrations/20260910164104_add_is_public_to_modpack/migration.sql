/*
  Warnings:

  - Added the required column `updatedAt` to the `Modpack` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Modpack" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "FileScanStatus";

-- CreateIndex
CREATE INDEX "Modpack_isPublic_idx" ON "Modpack"("isPublic");
