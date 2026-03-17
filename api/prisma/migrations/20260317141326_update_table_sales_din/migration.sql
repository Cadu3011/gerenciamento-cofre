/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `SalesDin` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idempotencyKey` to the `SalesDin` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `salesdin` ADD COLUMN `idempotencyKey` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `SalesDin_idempotencyKey_key` ON `SalesDin`(`idempotencyKey`);
