/*
  Warnings:

  - You are about to drop the column `cieloParcelaId` on the `conciliacaoparcela` table. All the data in the column will be lost.
  - You are about to drop the column `divergenciaBandeira` on the `conciliacaoparcela` table. All the data in the column will be lost.
  - You are about to drop the column `divergenciaModalidade` on the `conciliacaoparcela` table. All the data in the column will be lost.
  - You are about to drop the column `divergenciaParcelas` on the `conciliacaoparcela` table. All the data in the column will be lost.
  - You are about to drop the column `divergenciaValor` on the `conciliacaoparcela` table. All the data in the column will be lost.
  - You are about to drop the column `divergenciaValorLiquido` on the `conciliacaoparcela` table. All the data in the column will be lost.
  - You are about to drop the column `divergenciaVencimento` on the `conciliacaoparcela` table. All the data in the column will be lost.
  - You are about to drop the column `redeParcelaId` on the `conciliacaoparcela` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[trierParcelaId]` on the table `ConciliacaoParcela` will be added. If there are existing duplicate values, this will fail.
  - Made the column `trierParcelaId` on table `conciliacaoparcela` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `conciliacaoparcela` DROP FOREIGN KEY `ConciliacaoParcela_cieloParcelaId_fkey`;

-- DropForeignKey
ALTER TABLE `conciliacaoparcela` DROP FOREIGN KEY `ConciliacaoParcela_redeParcelaId_fkey`;

-- DropForeignKey
ALTER TABLE `conciliacaoparcela` DROP FOREIGN KEY `ConciliacaoParcela_trierParcelaId_fkey`;

-- DropIndex
DROP INDEX `ConciliacaoParcela_cieloParcelaId_fkey` ON `conciliacaoparcela`;

-- DropIndex
DROP INDEX `ConciliacaoParcela_redeParcelaId_fkey` ON `conciliacaoparcela`;

-- DropIndex
DROP INDEX `ConciliacaoParcela_trierParcelaId_fkey` ON `conciliacaoparcela`;

-- AlterTable
ALTER TABLE `conciliacaoparcela` DROP COLUMN `cieloParcelaId`,
    DROP COLUMN `divergenciaBandeira`,
    DROP COLUMN `divergenciaModalidade`,
    DROP COLUMN `divergenciaParcelas`,
    DROP COLUMN `divergenciaValor`,
    DROP COLUMN `divergenciaValorLiquido`,
    DROP COLUMN `divergenciaVencimento`,
    DROP COLUMN `redeParcelaId`,
    MODIFY `trierParcelaId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `ConciliacaoParcelaItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conciliacaoParcelaId` INTEGER NOT NULL,
    `redeParcelaId` INTEGER NULL,
    `cieloParcelaId` INTEGER NULL,
    `tipoMatch` ENUM('NSU', 'VALOR', 'VALOR_DATA', 'MANUAL', 'VENDA_CONCILIADA') NOT NULL,
    `divergenciaValor` BOOLEAN NOT NULL DEFAULT false,
    `divergenciaVencimento` BOOLEAN NOT NULL DEFAULT false,
    `divergenciaValorLiquido` BOOLEAN NOT NULL DEFAULT false,
    `divergenciaParcelas` BOOLEAN NOT NULL DEFAULT false,
    `divergenciaModalidade` BOOLEAN NOT NULL DEFAULT false,
    `divergenciaBandeira` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ConciliacaoParcelaItem_conciliacaoParcelaId_idx`(`conciliacaoParcelaId`),
    INDEX `ConciliacaoParcelaItem_redeParcelaId_idx`(`redeParcelaId`),
    INDEX `ConciliacaoParcelaItem_cieloParcelaId_idx`(`cieloParcelaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `ConciliacaoParcela_trierParcelaId_key` ON `ConciliacaoParcela`(`trierParcelaId`);

-- AddForeignKey
ALTER TABLE `ConciliacaoParcela` ADD CONSTRAINT `ConciliacaoParcela_trierParcelaId_fkey` FOREIGN KEY (`trierParcelaId`) REFERENCES `TrierParcela`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoParcelaItem` ADD CONSTRAINT `ConciliacaoParcelaItem_conciliacaoParcelaId_fkey` FOREIGN KEY (`conciliacaoParcelaId`) REFERENCES `ConciliacaoParcela`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoParcelaItem` ADD CONSTRAINT `ConciliacaoParcelaItem_redeParcelaId_fkey` FOREIGN KEY (`redeParcelaId`) REFERENCES `RedeParcela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoParcelaItem` ADD CONSTRAINT `ConciliacaoParcelaItem_cieloParcelaId_fkey` FOREIGN KEY (`cieloParcelaId`) REFERENCES `CieloParcela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
