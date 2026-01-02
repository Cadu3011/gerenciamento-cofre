-- CreateTable
CREATE TABLE `BalanceFisic` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `value_100_50` DECIMAL(9, 2) NOT NULL DEFAULT 0,
    `value_20` DECIMAL(9, 2) NOT NULL DEFAULT 0,
    `value_10` DECIMAL(9, 2) NOT NULL DEFAULT 0,
    `value_5` DECIMAL(9, 2) NOT NULL DEFAULT 0,
    `value_2` DECIMAL(9, 2) NOT NULL DEFAULT 0,
    `value_moedas` DECIMAL(9, 2) NOT NULL DEFAULT 0,
    `value_reserva` DECIMAL(9, 2) NOT NULL DEFAULT 0,
    `filialId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BalanceFisic` ADD CONSTRAINT `BalanceFisic_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
