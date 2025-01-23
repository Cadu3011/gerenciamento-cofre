/*
  Warnings:

  - Added the required column `filialId` to the `Movimentations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `movimentations` ADD COLUMN `filialId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Movimentations` ADD CONSTRAINT `Movimentations_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
