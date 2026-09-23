/*
  Warnings:

  - You are about to drop the `receivableitem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `receivableitem` DROP FOREIGN KEY `ReceivableItem_cieloParcelaId_fkey`;

-- DropForeignKey
ALTER TABLE `receivableitem` DROP FOREIGN KEY `ReceivableItem_receivableId_fkey`;

-- DropForeignKey
ALTER TABLE `receivableitem` DROP FOREIGN KEY `ReceivableItem_redeParcelaId_fkey`;

-- DropForeignKey
ALTER TABLE `receivableitem` DROP FOREIGN KEY `ReceivableItem_trierParcelaId_fkey`;

-- AlterTable
ALTER TABLE `cieloparcela` ADD COLUMN `receivableId` INTEGER NULL;

-- AlterTable
ALTER TABLE `redeparcela` ADD COLUMN `receivableId` INTEGER NULL;

-- AlterTable
ALTER TABLE `trierparcela` ADD COLUMN `receivableId` INTEGER NULL;

-- DropTable
DROP TABLE `receivableitem`;

-- CreateIndex
CREATE INDEX `CieloParcela_receivableId_idx` ON `CieloParcela`(`receivableId`);

-- CreateIndex
CREATE INDEX `RedeParcela_receivableId_idx` ON `RedeParcela`(`receivableId`);

-- AddForeignKey
ALTER TABLE `TrierParcela` ADD CONSTRAINT `TrierParcela_receivableId_fkey` FOREIGN KEY (`receivableId`) REFERENCES `Receivable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RedeParcela` ADD CONSTRAINT `RedeParcela_receivableId_fkey` FOREIGN KEY (`receivableId`) REFERENCES `Receivable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CieloParcela` ADD CONSTRAINT `CieloParcela_receivableId_fkey` FOREIGN KEY (`receivableId`) REFERENCES `Receivable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
