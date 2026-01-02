-- AlterTable
ALTER TABLE `movimentations` ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `idTrier` INTEGER NULL,
    ADD COLUMN `status` ENUM('SINCRONIZADO', 'PENDENTE') NULL;
