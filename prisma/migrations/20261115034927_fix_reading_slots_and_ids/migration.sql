/*
  Warnings:

  - The primary key for the `Reading` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Reading` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `slot` on the `Reading` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Slot" AS ENUM ('morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner');

-- AlterTable
ALTER TABLE "Reading" DROP CONSTRAINT "Reading_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "slot",
ADD COLUMN     "slot" "Slot" NOT NULL,
ADD CONSTRAINT "Reading_pkey" PRIMARY KEY ("id");

-- DropEnum
DROP TYPE "ReadingSlot";

-- CreateIndex
CREATE UNIQUE INDEX "Reading_userId_date_slot_key" ON "Reading"("userId", "date", "slot");
