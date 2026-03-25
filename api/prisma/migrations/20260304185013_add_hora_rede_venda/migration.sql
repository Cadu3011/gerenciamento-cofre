/*
  Warnings:

  - Added the required column `horaVenda` to the `RedeVenda` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `redevenda` ADD COLUMN `horaVenda` TIME(0) NOT NULL;

-- AddForeignKey
ALTER TABLE `RedeVenda` ADD CONSTRAINT `RedeVenda_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
