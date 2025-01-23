/*
  Warnings:

  - You are about to drop the column `date` on the `dailybalance` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `DailyBalance_date_key` ON `dailybalance`;

-- AlterTable
ALTER TABLE `dailybalance` DROP COLUMN `date`;
