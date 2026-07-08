/*
  Warnings:

  - You are about to drop the column `discountAmount` on the `redeparcela` table. All the data in the column will be lost.
  - You are about to drop the column `expirationDate` on the `redeparcela` table. All the data in the column will be lost.
  - You are about to drop the column `installmentNumber` on the `redeparcela` table. All the data in the column will be lost.
  - You are about to drop the column `installmentQuantity` on the `redeparcela` table. All the data in the column will be lost.
  - You are about to drop the column `mdrAmount` on the `redeparcela` table. All the data in the column will be lost.
  - You are about to drop the column `mdrFee` on the `redeparcela` table. All the data in the column will be lost.
  - You are about to drop the column `netAmount` on the `redeparcela` table. All the data in the column will be lost.
  - You are about to drop the column `saleAmount` on the `redeparcela` table. All the data in the column will be lost.
  - You are about to drop the column `saleDate` on the `redeparcela` table. All the data in the column will be lost.
  - You are about to drop the column `saleSummaryNumber` on the `redeparcela` table. All the data in the column will be lost.
  - Added the required column `dataVenda` to the `RedeParcela` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parcela` to the `RedeParcela` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxa` to the `RedeParcela` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalParcelas` to the `RedeParcela` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valor` to the `RedeParcela` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valorLiquido` to the `RedeParcela` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vencimento` to the `RedeParcela` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `RedeParcela_expirationDate_idx` ON `redeparcela`;

-- AlterTable
ALTER TABLE `redeparcela` DROP COLUMN `discountAmount`,
    DROP COLUMN `expirationDate`,
    DROP COLUMN `installmentNumber`,
    DROP COLUMN `installmentQuantity`,
    DROP COLUMN `mdrAmount`,
    DROP COLUMN `mdrFee`,
    DROP COLUMN `netAmount`,
    DROP COLUMN `saleAmount`,
    DROP COLUMN `saleDate`,
    DROP COLUMN `saleSummaryNumber`,
    ADD COLUMN `dataVenda` DATE NOT NULL,
    ADD COLUMN `parcela` INTEGER NOT NULL,
    ADD COLUMN `taxa` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `totalParcelas` INTEGER NOT NULL,
    ADD COLUMN `valor` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `valorLiquido` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `vencimento` DATE NOT NULL;

-- CreateIndex
CREATE INDEX `RedeParcela_vencimento_idx` ON `RedeParcela`(`vencimento`);
