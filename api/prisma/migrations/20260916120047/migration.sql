/*
  Warnings:

  - A unique constraint covering the columns `[filialId,adquirente,dataRecebimento]` on the table `Receivable` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `filialId` to the `Receivable` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Receivable_adquirente_dataRecebimento_key` ON `receivable`;

-- DropIndex
DROP INDEX `Receivable_dataRecebimento_idx` ON `receivable`;

-- AlterTable
ALTER TABLE `receivable` ADD COLUMN `filialId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `Receivable_filialId_dataRecebimento_idx` ON `Receivable`(`filialId`, `dataRecebimento`);

-- CreateIndex
CREATE UNIQUE INDEX `Receivable_filialId_adquirente_dataRecebimento_key` ON `Receivable`(`filialId`, `adquirente`, `dataRecebimento`);

-- AddForeignKey
ALTER TABLE `Receivable` ADD CONSTRAINT `Receivable_filialId_fkey` FOREIGN KEY (`filialId`) REFERENCES `Filial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
