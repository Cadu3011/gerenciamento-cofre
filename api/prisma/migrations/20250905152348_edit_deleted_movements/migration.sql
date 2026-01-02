/*
  Warnings:

  - A unique constraint covering the columns `[movementId]` on the table `DeletedMovements` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `DeletedMovements_movementId_key` ON `DeletedMovements`(`movementId`);
