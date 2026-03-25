/*
  Warnings:

  - You are about to alter the column `dataEmissao` on the `triercartaovendas` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(0)`.
  - You are about to alter the column `dataPagamento` on the `triercartaovendas` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(0)`.
  - You are about to alter the column `dataVencimento` on the `triercartaovendas` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(0)`.

*/
-- AlterTable
ALTER TABLE `triercartaovendas` MODIFY `dataEmissao` DATETIME(0) NOT NULL,
    MODIFY `dataPagamento` DATETIME(0) NULL,
    MODIFY `dataVencimento` DATETIME(0) NULL;
