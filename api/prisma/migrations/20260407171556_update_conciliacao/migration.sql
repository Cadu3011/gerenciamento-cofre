/*
  Warnings:

  - You are about to drop the column `createdById` on the `conciliacao` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[filialId,startDate]` on the table `Conciliacao` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[trierId]` on the table `ConciliacaoItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[redeId]` on the table `ConciliacaoItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cieloId]` on the table `ConciliacaoItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `startDate` to the `Conciliacao` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `conciliacao` DROP FOREIGN KEY `Conciliacao_filialId_fkey`;

-- DropIndex
DROP INDEX `Conciliacao_filialId_createdAt_idx` ON `conciliacao`;

-- AlterTable
ALTER TABLE `conciliacao` DROP COLUMN `createdById`,
    ADD COLUMN `startDate` DATE NOT NULL;

-- AlterTable
ALTER TABLE `conciliacaogrupo` MODIFY `status` ENUM('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE';

-- CreateIndex
CREATE INDEX `Conciliacao_filialId_startDate_idx` ON `Conciliacao`(`filialId`, `startDate`);

-- CreateIndex
CREATE UNIQUE INDEX `Conciliacao_filialId_startDate_key` ON `Conciliacao`(`filialId`, `startDate`);

-- CreateIndex
CREATE UNIQUE INDEX `ConciliacaoItem_trierId_key` ON `ConciliacaoItem`(`trierId`);

-- CreateIndex
CREATE UNIQUE INDEX `ConciliacaoItem_redeId_key` ON `ConciliacaoItem`(`redeId`);

-- CreateIndex
CREATE UNIQUE INDEX `ConciliacaoItem_cieloId_key` ON `ConciliacaoItem`(`cieloId`);
