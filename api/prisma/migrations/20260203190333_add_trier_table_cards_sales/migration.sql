-- CreateTable
CREATE TABLE `TrierCartaoVendas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `documentoFiscal` INTEGER NOT NULL,
    `valor` DECIMAL(65, 30) NOT NULL,
    `modalidade` VARCHAR(191) NULL,
    `hora` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `filialId` INTEGER NOT NULL,
    `bandeira` VARCHAR(191) NOT NULL,
    `dataEmissao` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TrierCartaoVendas` ADD CONSTRAINT `TrierCartaoVendas_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
