/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Movimentations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `movimentations` ADD COLUMN `idempotencyKey` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Movimentations_idempotencyKey_key` ON `Movimentations`(`idempotencyKey`);
