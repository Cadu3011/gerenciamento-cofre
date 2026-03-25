/*
  Warnings:

  - Added the required column `dataPagamento` to the `TrierCartaoVendas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dataVencimento` to the `TrierCartaoVendas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `triercartaovendas` ADD COLUMN `dataPagamento` VARCHAR(191) NOT NULL,
    ADD COLUMN `dataVencimento` VARCHAR(191) NOT NULL;
