-- CreateEnum
CREATE TYPE "FileScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'ERROR');

-- AlterTable
ALTER TABLE "Mod" ADD COLUMN     "fileScanResult" TEXT,
ADD COLUMN     "fileScanStatus" "FileScanStatus",
ADD COLUMN     "fileScannedAt" TIMESTAMP(3);
