/*
  Warnings:

  - A unique constraint covering the columns `[jobName]` on the table `Jobs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Jobs_jobName_key` ON `Jobs`(`jobName`);
