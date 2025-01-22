-- AlterTable
ALTER TABLE `user` ADD COLUMN `filialId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Filial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
