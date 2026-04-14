/*
  Warnings:

  - Added the required column `dataReferencia` to the `ConciliacaoItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `conciliacaoitem` ADD COLUMN `dataReferencia` DATE NOT NULL;
