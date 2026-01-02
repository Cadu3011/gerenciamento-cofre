/*
  Warnings:

  - Added the required column `codigoTransacao` to the `CartaoVendas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cartaovendas` ADD COLUMN `codigoTransacao` VARCHAR(191) NOT NULL;
