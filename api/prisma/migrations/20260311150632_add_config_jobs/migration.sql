/*
  Warnings:

  - You are about to drop the `cronjobetl` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `cronjobetl`;

-- CreateTable
CREATE TABLE `CronJobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobName` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `idJobs` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,
    `status` ENUM('RUNNING', 'SUCCESS', 'FAILED') NOT NULL,
    `runDate` DATE NOT NULL,

    UNIQUE INDEX `CronJobs_jobName_runDate_key`(`jobName`, `runDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CronJobs` ADD CONSTRAINT `CronJobs_idJobs_fkey` FOREIGN KEY (`idJobs`) REFERENCES `Jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
