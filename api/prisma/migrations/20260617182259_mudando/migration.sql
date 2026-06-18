/*
  Warnings:

  - You are about to drop the column `companyNumber` on the `redeparcela` table. All the data in the column will be lost.
  - Added the required column `filialId` to the `RedeParcela` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `redeparcela` DROP COLUMN `companyNumber`,
    ADD COLUMN `filialId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `RedeParcela` ADD CONSTRAINT `RedeParcela_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
