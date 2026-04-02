/*
  Warnings:

  - You are about to drop the column `conciliacaoId` on the `conciliacaoitem` table. All the data in the column will be lost.
  - Added the required column `grupoId` to the `ConciliacaoItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `conciliacaoitem` DROP FOREIGN KEY `ConciliacaoItem_conciliacaoId_fkey`;

-- DropIndex
DROP INDEX `ConciliacaoItem_conciliacaoId_fkey` ON `conciliacaoitem`;

-- AlterTable
ALTER TABLE `conciliacaoitem` DROP COLUMN `conciliacaoId`,
    ADD COLUMN `grupoId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `ConciliacaoGrupo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conciliacaoId` INTEGER NOT NULL,
    `status` ENUM('PENDENTE', 'CONCILIADO', 'DIVERGENTE', 'CANCELADO') NOT NULL,
    `metodo` ENUM('AUTO', 'MANUAL') NOT NULL,
    `valorTrier` DECIMAL(10, 2) NULL,
    `valorRede` DECIMAL(10, 2) NULL,
    `valorFinal` DECIMAL(10, 2) NULL,
    `motivo` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ConciliacaoItem_grupoId_idx` ON `ConciliacaoItem`(`grupoId`);

-- AddForeignKey
ALTER TABLE `ConciliacaoGrupo` ADD CONSTRAINT `ConciliacaoGrupo_conciliacaoId_fkey` FOREIGN KEY (`conciliacaoId`) REFERENCES `Conciliacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConciliacaoItem` ADD CONSTRAINT `ConciliacaoItem_grupoId_fkey` FOREIGN KEY (`grupoId`) REFERENCES `ConciliacaoGrupo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
