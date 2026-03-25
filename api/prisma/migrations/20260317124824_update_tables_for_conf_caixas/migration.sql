-- CreateTable
CREATE TABLE `SalesDin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sale_date` DATETIME(3) NOT NULL,
    `financeiroMovimentacaoId` INTEGER NOT NULL,
    `filialId` INTEGER NOT NULL,
    `numNota` INTEGER NOT NULL,
    `numCaixa` INTEGER NOT NULL,
    `tipo` ENUM('REC_CREDIARIO', 'REC_VENDA') NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `moveId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiferencaCaixa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `filialId` INTEGER NOT NULL,
    `data` DATETIME(3) NULL,
    `caixa` VARCHAR(191) NULL,
    `operador` VARCHAR(191) NULL,
    `total_vendas_dinheiro` DECIMAL(10, 2) NULL,
    `valor_recebido` DECIMAL(10, 2) NULL,
    `sobra` DECIMAL(10, 2) NULL,
    `falta` DECIMAL(10, 2) NULL,
    `diferenca` DECIMAL(10, 2) NULL,
    `status` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SalesDin` ADD CONSTRAINT `SalesDin_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesDin` ADD CONSTRAINT `SalesDin_moveId_fkey` FOREIGN KEY (`moveId`) REFERENCES `Movimentations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiferencaCaixa` ADD CONSTRAINT `DiferencaCaixa_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
