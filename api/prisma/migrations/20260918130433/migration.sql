/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Receivable` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idempotencyKey` to the `Receivable` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `receivable` DROP FOREIGN KEY `Receivable_filialId_fkey`;

-- DropIndex
DROP INDEX `Receivable_filialId_adquirente_dataRecebimento_key` ON `receivable`;

-- AlterTable
ALTER TABLE `receivable` ADD COLUMN `idempotencyKey` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Receivable_idempotencyKey_key` ON `Receivable`(`idempotencyKey`);
