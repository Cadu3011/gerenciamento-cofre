-- AlterTable
ALTER TABLE `conciliacaoparcela` ADD COLUMN `divergenciaBandeira` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `divergenciaModalidade` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `divergenciaParcelas` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `divergenciaValorLiquido` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `tipoMatch` ENUM('NSU', 'VALOR', 'VALOR_DATA', 'MANUAL', 'VENDA_CONCILIADA') NULL;
