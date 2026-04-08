-- AlterTable
ALTER TABLE `cartaovendas` ADD COLUMN `statusConciliacao` ENUM('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE';

-- AlterTable
ALTER TABLE `conciliacaogrupo` ADD COLUMN `valorCielo` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `conciliacaoitem` ADD COLUMN `cieloId` INTEGER NULL,
    MODIFY `origem` ENUM('TRIER', 'REDE', 'CIELO') NOT NULL;

-- CreateIndex
CREATE INDEX `CartaoVendas_valorBruto_dataVenda_idx` ON `CartaoVendas`(`valorBruto`, `dataVenda`);

-- CreateIndex
CREATE INDEX `ConciliacaoItem_cieloId_idx` ON `ConciliacaoItem`(`cieloId`);

-- AddForeignKey
ALTER TABLE `ConciliacaoItem` ADD CONSTRAINT `ConciliacaoItem_cieloId_fkey` FOREIGN KEY (`cieloId`) REFERENCES `CartaoVendas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
