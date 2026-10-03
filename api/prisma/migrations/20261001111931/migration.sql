-- AlterTable
ALTER TABLE `trierparcela` ADD COLUMN `documentoFiscalEstorno` INTEGER NULL;

-- CreateIndex
CREATE INDEX `TrierParcela_filialId_documentoFiscal_idx` ON `TrierParcela`(`filialId`, `documentoFiscal`);
