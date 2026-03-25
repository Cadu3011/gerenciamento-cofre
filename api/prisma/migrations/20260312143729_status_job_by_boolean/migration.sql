/*
  Warnings:

  - You are about to alter the column `status` on the `jobs` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(5))` to `TinyInt`.

*/
-- AlterTable
ALTER TABLE `jobs` MODIFY `status` BOOLEAN NOT NULL;
