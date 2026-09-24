-- CreateIndex
CREATE INDEX `CieloParcela_filialId_dataVenda_idx` ON `CieloParcela`(`filialId`, `dataVenda`);

-- CreateIndex
CREATE INDEX `ConciliacaoParcelaItem_conciliacaoParcelaId_origem_idx` ON `ConciliacaoParcelaItem`(`conciliacaoParcelaId`, `origem`);

-- CreateIndex
CREATE INDEX `ConciliacaoParcelaObservacao_conciliacaoParcelaId_tipo_idx` ON `ConciliacaoParcelaObservacao`(`conciliacaoParcelaId`, `tipo`);

-- CreateIndex
CREATE INDEX `RedeParcela_filialId_dataVenda_idx` ON `RedeParcela`(`filialId`, `dataVenda`);

-- CreateIndex
CREATE INDEX `TrierParcela_filialId_dataEmissao_idx` ON `TrierParcela`(`filialId`, `dataEmissao`);

-- RenameIndex
ALTER TABLE `trierparcela` RENAME INDEX `TrierParcela_vendaId_fkey` TO `TrierParcela_vendaId_idx`;
