-- CreateTable
CREATE TABLE `TrierParcela` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `idTransacao` VARCHAR(191) NOT NULL,
    `idParcela` INTEGER NOT NULL,
    `documentoFiscal` INTEGER NULL,
    `nsuOrigem` VARCHAR(191) NULL,
    `nsuAdministradora` VARCHAR(191) NULL,
    `codigoAutorizacao` VARCHAR(191) NULL,
    `modalidadeVenda` VARCHAR(191) NULL,
    `prazoVenda` VARCHAR(191) NULL,
    `numeroParcela` INTEGER NOT NULL,
    `totalParcelas` INTEGER NOT NULL,
    `dataEmissao` DATE NOT NULL,
    `dataVencimento` DATE NOT NULL,
    `dataPagamento` DATE NULL,
    `valorParcela` DECIMAL(10, 2) NOT NULL,
    `valorTaxas` DECIMAL(10, 2) NOT NULL,
    `valorTotal` DECIMAL(10, 2) NOT NULL,
    `administradoraCartao` VARCHAR(191) NULL,
    `codigoCartao` INTEGER NULL,
    `nomeCartao` VARCHAR(191) NULL,
    `vendaId` INTEGER NULL,
    `statusConciliacao` ENUM('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'NAO_ENCONTRADO') NOT NULL DEFAULT 'PENDENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TrierParcela_idempotencyKey_key`(`idempotencyKey`),
    INDEX `TrierParcela_nsuOrigem_idx`(`nsuOrigem`),
    INDEX `TrierParcela_dataVencimento_idx`(`dataVencimento`),
    INDEX `TrierParcela_documentoFiscal_idx`(`documentoFiscal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RedeParcela` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `nsu` VARCHAR(191) NOT NULL,
    `saleSummaryNumber` INTEGER NULL,
    `companyNumber` VARCHAR(191) NULL,
    `saleDate` DATE NOT NULL,
    `expirationDate` DATE NOT NULL,
    `installmentNumber` INTEGER NOT NULL,
    `installmentQuantity` INTEGER NOT NULL,
    `saleAmount` DECIMAL(10, 2) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `discountAmount` DECIMAL(10, 2) NOT NULL,
    `netAmount` DECIMAL(10, 2) NOT NULL,
    `mdrAmount` DECIMAL(10, 2) NOT NULL,
    `mdrFee` DECIMAL(10, 2) NOT NULL,
    `vendaId` INTEGER NULL,
    `statusConciliacao` ENUM('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'NAO_ENCONTRADO') NOT NULL DEFAULT 'PENDENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RedeParcela_idempotencyKey_key`(`idempotencyKey`),
    INDEX `RedeParcela_nsu_idx`(`nsu`),
    INDEX `RedeParcela_expirationDate_idx`(`expirationDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConciliacaoParcela` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trierParcelaId` INTEGER NULL,
    `redeParcelaId` INTEGER NULL,
    `status` ENUM('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'NAO_ENCONTRADO') NOT NULL,
    `divergenciaValor` BOOLEAN NOT NULL DEFAULT false,
    `divergenciaVencimento` BOOLEAN NOT NULL DEFAULT false,
    `observacao` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ConciliacaoParcela_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Receivable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adquirente` VARCHAR(191) NOT NULL,
    `dataRecebimento` DATE NOT NULL,
    `valorEsperado` DECIMAL(12, 2) NOT NULL,
    `valorRecebido` DECIMAL(12, 2) NULL,
    `diferenca` DECIMAL(12, 2) NULL,
    `status` ENUM('ABERTO', 'FECHADO', 'ENVIADO_ERP', 'CONCILIADO', 'DIVERGENTE') NOT NULL DEFAULT 'ABERTO',
    `movimentoTrierId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Receivable_dataRecebimento_idx`(`dataRecebimento`),
    UNIQUE INDEX `Receivable_adquirente_dataRecebimento_key`(`adquirente`, `dataRecebimento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReceivableItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `receivableId` INTEGER NOT NULL,
    `redeParcelaId` INTEGER NULL,
    `trierParcelaId` INTEGER NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReceivableItem_receivableId_idx`(`receivableId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TrierParcela` ADD CONSTRAINT `TrierParcela_vendaId_fkey` FOREIGN KEY (`vendaId`) REFERENCES `TrierCartaoVendas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RedeParcela` ADD CONSTRAINT `RedeParcela_vendaId_fkey` FOREIGN KEY (`vendaId`) REFERENCES `RedeVenda`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoParcela` ADD CONSTRAINT `ConciliacaoParcela_trierParcelaId_fkey` FOREIGN KEY (`trierParcelaId`) REFERENCES `TrierParcela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoParcela` ADD CONSTRAINT `ConciliacaoParcela_redeParcelaId_fkey` FOREIGN KEY (`redeParcelaId`) REFERENCES `RedeParcela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceivableItem` ADD CONSTRAINT `ReceivableItem_receivableId_fkey` FOREIGN KEY (`receivableId`) REFERENCES `Receivable`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceivableItem` ADD CONSTRAINT `ReceivableItem_redeParcelaId_fkey` FOREIGN KEY (`redeParcelaId`) REFERENCES `RedeParcela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceivableItem` ADD CONSTRAINT `ReceivableItem_trierParcelaId_fkey` FOREIGN KEY (`trierParcelaId`) REFERENCES `TrierParcela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
