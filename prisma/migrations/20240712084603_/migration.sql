/*
  Warnings:

  - You are about to drop the column `isChecked` on the `Checklist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Checklist" DROP COLUMN "isChecked";

-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT false;
