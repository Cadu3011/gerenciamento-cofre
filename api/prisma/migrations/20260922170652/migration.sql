-- CreateTable
CREATE TABLE `FatoCartaoVendas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `data` DATE NOT NULL,
    `filialId` INTEGER NOT NULL,
    `adquirente` ENUM('TRIER', 'REDE', 'CIELO') NOT NULL,
    `bandeira` VARCHAR(80) NOT NULL DEFAULT '',
    `valorBruto` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `valorLiquido` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `taxa` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `quantidade` INTEGER NOT NULL DEFAULT 0,
    `valorConciliado` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `valorDivergente` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `valorPendente` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `qtdConciliado` INTEGER NOT NULL DEFAULT 0,
    `qtdDivergente` INTEGER NOT NULL DEFAULT 0,
    `qtdPendente` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FatoCartaoVendas_filialId_data_idx`(`filialId`, `data`),
    INDEX `FatoCartaoVendas_data_adquirente_idx`(`data`, `adquirente`),
    UNIQUE INDEX `FatoCartaoVendas_data_filialId_adquirente_bandeira_key`(`data`, `filialId`, `adquirente`, `bandeira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FatoCartaoVendas` ADD CONSTRAINT `FatoCartaoVendas_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
