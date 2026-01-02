/*
  Warnings:

  - Added the required column `timeVenda` to the `CartaoVendas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cartaovendas` ADD COLUMN `timeVenda` VARCHAR(191) NOT NULL,
    MODIFY `dataVenda` VARCHAR(191) NOT NULL;
