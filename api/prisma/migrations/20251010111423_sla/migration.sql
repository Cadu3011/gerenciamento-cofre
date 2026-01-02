-- AlterTable
ALTER TABLE `filial` ADD COLUMN `idCielo` INTEGER NULL,
    ADD COLUMN `idRede` INTEGER NULL;

-- CreateTable
CREATE TABLE `CartaoVendas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dataVenda` DATETIME(3) NOT NULL,
    `valorBruto` DECIMAL(65, 30) NOT NULL,
    `valorLiquido` DECIMAL(65, 30) NOT NULL,
    `taxaAdministrativa` DECIMAL(65, 30) NOT NULL,
    `modalidade` VARCHAR(191) NOT NULL,
    `bandeira` VARCHAR(191) NOT NULL,
    `estabelecimento` VARCHAR(191) NOT NULL,
    `nsu` VARCHAR(191) NOT NULL,
    `codigoAutorizacao` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
