/*
  Warnings:

  - You are about to drop the column `trierParcelaId` on the `conciliacaoparcela` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `conciliacaoparcela` DROP FOREIGN KEY `ConciliacaoParcela_trierParcelaId_fkey`;

-- DropIndex
DROP INDEX `ConciliacaoParcela_trierParcelaId_key` ON `conciliacaoparcela`;

-- AlterTable
ALTER TABLE `conciliacaoparcela` DROP COLUMN `trierParcelaId`;

-- CreateTable
CREATE TABLE `ConciliacaoParcelaTrier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conciliacaoParcelaId` INTEGER NOT NULL,
    `trierParcelaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ConciliacaoParcelaTrier_trierParcelaId_idx`(`trierParcelaId`),
    UNIQUE INDEX `ConciliacaoParcelaTrier_conciliacaoParcelaId_trierParcelaId_key`(`conciliacaoParcelaId`, `trierParcelaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConciliacaoParcelaTrier` ADD CONSTRAINT `ConciliacaoParcelaTrier_conciliacaoParcelaId_fkey` FOREIGN KEY (`conciliacaoParcelaId`) REFERENCES `ConciliacaoParcela`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoParcelaTrier` ADD CONSTRAINT `ConciliacaoParcelaTrier_trierParcelaId_fkey` FOREIGN KEY (`trierParcelaId`) REFERENCES `TrierParcela`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
