/*
  Warnings:

  - You are about to drop the column `codigoAutorizacao` on the `trierparcela` table. All the data in the column will be lost.
  - You are about to drop the column `codigoCartao` on the `trierparcela` table. All the data in the column will be lost.
  - You are about to drop the column `idParcela` on the `trierparcela` table. All the data in the column will be lost.
  - You are about to drop the column `idTransacao` on the `trierparcela` table. All the data in the column will be lost.
  - You are about to drop the column `nsuOrigem` on the `trierparcela` table. All the data in the column will be lost.
  - You are about to drop the column `numeroParcela` on the `trierparcela` table. All the data in the column will be lost.
  - You are about to drop the column `valorParcela` on the `trierparcela` table. All the data in the column will be lost.
  - You are about to drop the column `valorTotal` on the `trierparcela` table. All the data in the column will be lost.
  - Added the required column `filialId` to the `TrierParcela` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parcela` to the `TrierParcela` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valor` to the `TrierParcela` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valorLiquido` to the `TrierParcela` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `TrierParcela_nsuOrigem_idx` ON `trierparcela`;

-- AlterTable
ALTER TABLE `trierparcela` DROP COLUMN `codigoAutorizacao`,
    DROP COLUMN `codigoCartao`,
    DROP COLUMN `idParcela`,
    DROP COLUMN `idTransacao`,
    DROP COLUMN `nsuOrigem`,
    DROP COLUMN `numeroParcela`,
    DROP COLUMN `valorParcela`,
    DROP COLUMN `valorTotal`,
    ADD COLUMN `filialId` INTEGER NOT NULL,
    ADD COLUMN `parcela` INTEGER NOT NULL,
    ADD COLUMN `valor` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `valorLiquido` DECIMAL(10, 2) NOT NULL;

-- CreateIndex
CREATE INDEX `TrierParcela_nsuAdministradora_idx` ON `TrierParcela`(`nsuAdministradora`);

-- AddForeignKey
ALTER TABLE `TrierParcela` ADD CONSTRAINT `TrierParcela_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
