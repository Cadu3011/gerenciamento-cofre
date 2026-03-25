/*
  Warnings:

  - A unique constraint covering the columns `[jobName,runDate]` on the table `CronJobETL` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `runDate` to the `CronJobETL` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cronjobetl` ADD COLUMN `runDate` DATE NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `CronJobETL_jobName_runDate_key` ON `CronJobETL`(`jobName`, `runDate`);
