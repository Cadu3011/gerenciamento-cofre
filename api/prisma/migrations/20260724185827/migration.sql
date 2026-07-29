/*
  Warnings:

  - You are about to drop the column `divergenciaBandeira` on the `conciliacaoparcelaitem` table. All the data in the column will be lost.
  - You are about to drop the column `divergenciaModalidade` on the `conciliacaoparcelaitem` table. All the data in the column will be lost.
  - You are about to drop the column `divergenciaParcelas` on the `conciliacaoparcelaitem` table. All the data in the column will be lost.
  - You are about to drop the column `divergenciaValor` on the `conciliacaoparcelaitem` table. All the data in the column will be lost.
  - You are about to drop the column `divergenciaValorLiquido` on the `conciliacaoparcelaitem` table. All the data in the column will be lost.
  - You are about to drop the column `divergenciaVencimento` on the `conciliacaoparcelaitem` table. All the data in the column will be lost.
  - You are about to drop the column `idempotencyKey` on the `conciliacaoparcelaitem` table. All the data in the column will be lost.
  - You are about to drop the column `tipoMatch` on the `conciliacaoparcelaitem` table. All the data in the column will be lost.
  - You are about to drop the `conciliacaoparcelatrier` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `conciliacaoLoteId` to the `ConciliacaoParcela` table without a default value. This is not possible if the table is not empty.
  - Added the required column `origem` to the `ConciliacaoParcelaItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `conciliacaoparcelatrier` DROP FOREIGN KEY `ConciliacaoParcelaTrier_conciliacaoParcelaId_fkey`;

-- DropForeignKey
ALTER TABLE `conciliacaoparcelatrier` DROP FOREIGN KEY `ConciliacaoParcelaTrier_trierParcelaId_fkey`;

-- DropIndex
DROP INDEX `ConciliacaoParcelaItem_idempotencyKey_key` ON `conciliacaoparcelaitem`;

-- AlterTable
ALTER TABLE `conciliacaoparcela` ADD COLUMN `conciliacaoLoteId` INTEGER NOT NULL,
    ADD COLUMN `score` INTEGER NULL;

-- AlterTable
ALTER TABLE `conciliacaoparcelaitem` DROP COLUMN `divergenciaBandeira`,
    DROP COLUMN `divergenciaModalidade`,
    DROP COLUMN `divergenciaParcelas`,
    DROP COLUMN `divergenciaValor`,
    DROP COLUMN `divergenciaValorLiquido`,
    DROP COLUMN `divergenciaVencimento`,
    DROP COLUMN `idempotencyKey`,
    DROP COLUMN `tipoMatch`,
    ADD COLUMN `origem` ENUM('TRIER', 'REDE', 'CIELO') NOT NULL,
    ADD COLUMN `trierParcelaId` INTEGER NULL;

-- DropTable
DROP TABLE `conciliacaoparcelatrier`;

-- CreateTable
CREATE TABLE `ConciliacaoLote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periodoInicial` DATE NOT NULL,
    `periodoFinal` DATE NOT NULL,
    `algoritmoVersao` VARCHAR(191) NOT NULL,
    `totalGrupos` INTEGER NOT NULL DEFAULT 0,
    `conciliados` INTEGER NOT NULL DEFAULT 0,
    `divergentes` INTEGER NOT NULL DEFAULT 0,
    `pendentes` INTEGER NOT NULL DEFAULT 0,

    INDEX `ConciliacaoLote_periodoInicial_periodoFinal_idx`(`periodoInicial`, `periodoFinal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConciliacaoParcelaObservacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conciliacaoParcelaId` INTEGER NOT NULL,
    `tipo` ENUM('PARCELAS_NAO_ENCONTRADAS', 'DIVERGENCIA_VALOR', 'DIVERGENCIA_VENCIMENTO', 'DIVERGENCIA_VALOR_LIQUIDO', 'DIVERGENCIA_QUANTIDADE_PARCELAS') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ConciliacaoParcela_tipoMatch_idx` ON `ConciliacaoParcela`(`tipoMatch`);

-- CreateIndex
CREATE INDEX `ConciliacaoParcelaItem_trierParcelaId_idx` ON `ConciliacaoParcelaItem`(`trierParcelaId`);

-- AddForeignKey
ALTER TABLE `ConciliacaoParcela` ADD CONSTRAINT `ConciliacaoParcela_conciliacaoLoteId_fkey` FOREIGN KEY (`conciliacaoLoteId`) REFERENCES `ConciliacaoLote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoParcelaItem` ADD CONSTRAINT `ConciliacaoParcelaItem_trierParcelaId_fkey` FOREIGN KEY (`trierParcelaId`) REFERENCES `TrierParcela`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoParcelaObservacao` ADD CONSTRAINT `ConciliacaoParcelaObservacao_conciliacaoParcelaId_fkey` FOREIGN KEY (`conciliacaoParcelaId`) REFERENCES `ConciliacaoParcela`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
