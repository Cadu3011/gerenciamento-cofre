/*
  Warnings:

  - Added the required column `dataVencimento` to the `ReceivableItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `conciliacaoparcela` ADD COLUMN `cieloParcelaId` INTEGER NULL;

-- AlterTable
ALTER TABLE `receivableitem` ADD COLUMN `cieloParcelaId` INTEGER NULL,
    ADD COLUMN `dataVencimento` DATE NOT NULL;

-- CreateTable
CREATE TABLE `CieloParcela` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `filialId` INTEGER NOT NULL,
    `codigoTransacao` VARCHAR(191) NOT NULL,
    `codigoAutorizacao` VARCHAR(191) NULL,
    `nsu` VARCHAR(191) NULL,
    `dataVenda` DATE NOT NULL,
    `dataVencimento` DATE NOT NULL,
    `parcela` INTEGER NOT NULL,
    `totalParcelas` INTEGER NOT NULL,
    `modalidade` VARCHAR(191) NULL,
    `bandeira` VARCHAR(191) NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `valorLiquido` DECIMAL(10, 2) NOT NULL,
    `taxaAdministrativa` DECIMAL(10, 2) NOT NULL,
    `vendaId` INTEGER NULL,
    `statusConciliacao` ENUM('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'NAO_ENCONTRADO') NOT NULL DEFAULT 'PENDENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CieloParcela_idempotencyKey_key`(`idempotencyKey`),
    INDEX `CieloParcela_codigoTransacao_idx`(`codigoTransacao`),
    INDEX `CieloParcela_codigoAutorizacao_idx`(`codigoAutorizacao`),
    INDEX `CieloParcela_nsu_idx`(`nsu`),
    INDEX `CieloParcela_dataVencimento_idx`(`dataVencimento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CieloParcela` ADD CONSTRAINT `CieloParcela_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CieloParcela` ADD CONSTRAINT `CieloParcela_vendaId_fkey` FOREIGN KEY (`vendaId`) REFERENCES `CartaoVendas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoParcela` ADD CONSTRAINT `ConciliacaoParcela_cieloParcelaId_fkey` FOREIGN KEY (`cieloParcelaId`) REFERENCES `CieloParcela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceivableItem` ADD CONSTRAINT `ReceivableItem_cieloParcelaId_fkey` FOREIGN KEY (`cieloParcelaId`) REFERENCES `CieloParcela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
