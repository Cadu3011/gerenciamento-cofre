-- AddForeignKey
ALTER TABLE `Conciliacao` ADD CONSTRAINT `Conciliacao_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
