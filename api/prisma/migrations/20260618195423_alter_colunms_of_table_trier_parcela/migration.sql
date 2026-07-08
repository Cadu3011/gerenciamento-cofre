/*
  Warnings:

  - You are about to drop the column `nomeCartao` on the `trierparcela` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `trierparcela` DROP COLUMN `nomeCartao`,
    ADD COLUMN `bandeira` VARCHAR(191) NULL;
