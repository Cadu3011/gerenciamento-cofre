/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `ConciliacaoGrupo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idempotencyKey` to the `ConciliacaoGrupo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `conciliacaogrupo` ADD COLUMN `idempotencyKey` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ConciliacaoGrupo_idempotencyKey_key` ON `ConciliacaoGrupo`(`idempotencyKey`);
