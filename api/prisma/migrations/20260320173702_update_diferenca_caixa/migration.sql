-- CreateIndex
CREATE INDEX `idx_dashboard` ON `DiferencaCaixa`(`filialId`, `data`, `operador`);

-- CreateIndex
CREATE INDEX `DiferencaCaixa_filialId_data_idx` ON `DiferencaCaixa`(`filialId`, `data`);
