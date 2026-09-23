-- AddForeignKey
ALTER TABLE `Receivable` ADD CONSTRAINT `Receivable_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
