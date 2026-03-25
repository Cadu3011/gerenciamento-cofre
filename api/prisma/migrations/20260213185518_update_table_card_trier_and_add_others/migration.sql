/*
  Warnings:

  - You are about to alter the column `hora` on the `triercartaovendas` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Time(0)`.

*/
-- AlterTable
ALTER TABLE `triercartaovendas` ADD COLUMN `statusConciliacao` ENUM('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
    MODIFY `hora` TIME(0) NOT NULL,
    MODIFY `dataEmissao` DATE NOT NULL,
    MODIFY `dataPagamento` DATE NULL,
    MODIFY `dataVencimento` DATE NULL;

-- CreateTable
CREATE TABLE `RedeVenda` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `nsu` VARCHAR(191) NULL,
    `autorizacao` VARCHAR(191) NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `bandeira` VARCHAR(191) NULL,
    `modalidade` VARCHAR(191) NULL,
    `dataAutorizacao` DATETIME(0) NOT NULL,
    `filialId` INTEGER NOT NULL,
    `statusConciliacao` ENUM('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',

    UNIQUE INDEX `RedeVenda_idempotencyKey_key`(`idempotencyKey`),
    INDEX `RedeVenda_filialId_dataAutorizacao_idx`(`filialId`, `dataAutorizacao`),
    INDEX `RedeVenda_valor_dataAutorizacao_idx`(`valor`, `dataAutorizacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conciliacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `filialId` INTEGER NOT NULL,
    `status` ENUM('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'CANCELADO') NOT NULL DEFAULT 'CONCILIADO',
    `metodo` ENUM('AUTO', 'MANUAL') NOT NULL,
    `motivo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` INTEGER NULL,

    INDEX `Conciliacao_filialId_createdAt_idx`(`filialId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConciliacaoItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conciliacaoId` INTEGER NOT NULL,
    `origem` ENUM('TRIER', 'REDE') NOT NULL,
    `trierId` INTEGER NULL,
    `redeId` INTEGER NULL,
    `valor` DECIMAL(10, 2) NOT NULL,

    INDEX `ConciliacaoItem_trierId_idx`(`trierId`),
    INDEX `ConciliacaoItem_redeId_idx`(`redeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `TrierCartaoVendas_filialId_dataEmissao_hora_idx` ON `TrierCartaoVendas`(`filialId`, `dataEmissao`, `hora`);

-- CreateIndex
CREATE INDEX `TrierCartaoVendas_valor_dataEmissao_hora_idx` ON `TrierCartaoVendas`(`valor`, `dataEmissao`, `hora`);

-- AddForeignKey
ALTER TABLE `RedeVenda` ADD CONSTRAINT `RedeVenda_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conciliacao` ADD CONSTRAINT `Conciliacao_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoItem` ADD CONSTRAINT `ConciliacaoItem_conciliacaoId_fkey` FOREIGN KEY (`conciliacaoId`) REFERENCES `Conciliacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoItem` ADD CONSTRAINT `ConciliacaoItem_trierId_fkey` FOREIGN KEY (`trierId`) REFERENCES `TrierCartaoVendas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoItem` ADD CONSTRAINT `ConciliacaoItem_redeId_fkey` FOREIGN KEY (`redeId`) REFERENCES `RedeVenda`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
