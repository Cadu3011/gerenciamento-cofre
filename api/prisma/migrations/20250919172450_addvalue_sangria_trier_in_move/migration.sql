/*
  Warnings:

  - You are about to drop the column `caixaSangriaTrier` on the `movimentations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `movimentations` DROP COLUMN `caixaSangriaTrier`,
    MODIFY `value` DECIMAL(9, 2) NULL;
