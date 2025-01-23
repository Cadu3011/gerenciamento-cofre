-- AlterTable
ALTER TABLE `dailybalance` ADD COLUMN `filialId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `DailyBalance` ADD CONSTRAINT `DailyBalance_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
