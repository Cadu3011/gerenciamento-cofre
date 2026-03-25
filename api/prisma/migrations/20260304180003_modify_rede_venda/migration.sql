/*
  Warnings:

  - You are about to drop the column `autorizacao` on the `redevenda` table. All the data in the column will be lost.
  - You are about to drop the column `dataAutorizacao` on the `redevenda` table. All the data in the column will be lost.
  - Added the required column `dataVenda` to the `RedeVenda` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valorLiquido` to the `RedeVenda` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `redevenda` DROP FOREIGN KEY `RedeVenda_filialId_fkey`;

-- DropIndex
DROP INDEX `RedeVenda_filialId_dataAutorizacao_idx` ON `redevenda`;

-- DropIndex
DROP INDEX `RedeVenda_valor_dataAutorizacao_idx` ON `redevenda`;

-- AlterTable
ALTER TABLE `redevenda` DROP COLUMN `autorizacao`,
    DROP COLUMN `dataAutorizacao`,
    ADD COLUMN `dataVenda` DATETIME(0) NOT NULL,
    ADD COLUMN `valorLiquido` DECIMAL(10, 2) NOT NULL;

-- CreateIndex
CREATE INDEX `RedeVenda_filialId_dataVenda_idx` ON `RedeVenda`(`filialId`, `dataVenda`);

-- CreateIndex
CREATE INDEX `RedeVenda_valor_dataVenda_idx` ON `RedeVenda`(`valor`, `dataVenda`);