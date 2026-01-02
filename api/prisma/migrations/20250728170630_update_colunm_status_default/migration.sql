/*
  Warnings:

  - Made the column `status` on table `movimentations` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `movimentations` MODIFY `status` ENUM('SINCRONIZADO', 'PENDENTE') NOT NULL DEFAULT 'PENDENTE';
