-- DropForeignKey
ALTER TABLE `salesdin` DROP FOREIGN KEY `SalesDin_moveId_fkey`;

-- DropIndex
DROP INDEX `SalesDin_moveId_fkey` ON `salesdin`;

-- AlterTable
ALTER TABLE `salesdin` MODIFY `moveId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `SalesDin` ADD CONSTRAINT `SalesDin_moveId_fkey` FOREIGN KEY (`moveId`) REFERENCES `Movimentations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
