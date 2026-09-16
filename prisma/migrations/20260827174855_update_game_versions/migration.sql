/*
  Warnings:

  - You are about to drop the column `targetGameVersion` on the `Mod` table. All the data in the column will be lost.
  - Added the required column `gameVersionId` to the `Mod` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Mod" DROP COLUMN "targetGameVersion",
ADD COLUMN     "gameVersionId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_gameVersionId_fkey" FOREIGN KEY ("gameVersionId") REFERENCES "GameVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
