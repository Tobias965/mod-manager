/*
  Warnings:

  - Added the required column `gameId` to the `Modpack` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Modpack" ADD COLUMN     "gameId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Modpack" ADD CONSTRAINT "Modpack_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
