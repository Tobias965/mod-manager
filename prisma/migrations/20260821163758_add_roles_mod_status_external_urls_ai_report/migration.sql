-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'CREATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ModStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "loader" TEXT NOT NULL,
    "version" TEXT NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "externalUrl" TEXT,
    "status" "ModStatus" NOT NULL DEFAULT 'PENDING',
    "gameId" TEXT NOT NULL,

    CONSTRAINT "Mod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModDependency" (
    "modId" TEXT NOT NULL,
    "dependencyId" TEXT NOT NULL,

    CONSTRAINT "ModDependency_pkey" PRIMARY KEY ("modId","dependencyId")
);

-- CreateTable
CREATE TABLE "ModIncompatibility" (
    "modId" TEXT NOT NULL,
    "incompatibleId" TEXT NOT NULL,

    CONSTRAINT "ModIncompatibility_pkey" PRIMARY KEY ("modId","incompatibleId")
);

-- CreateTable
CREATE TABLE "Modpack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aiReport" JSONB,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Modpack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModpackMod" (
    "modpackId" TEXT NOT NULL,
    "modId" TEXT NOT NULL,

    CONSTRAINT "ModpackMod_pkey" PRIMARY KEY ("modpackId","modId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModDependency" ADD CONSTRAINT "ModDependency_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModDependency" ADD CONSTRAINT "ModDependency_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "Mod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModIncompatibility" ADD CONSTRAINT "ModIncompatibility_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModIncompatibility" ADD CONSTRAINT "ModIncompatibility_incompatibleId_fkey" FOREIGN KEY ("incompatibleId") REFERENCES "Mod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modpack" ADD CONSTRAINT "Modpack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModpackMod" ADD CONSTRAINT "ModpackMod_modpackId_fkey" FOREIGN KEY ("modpackId") REFERENCES "Modpack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModpackMod" ADD CONSTRAINT "ModpackMod_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
